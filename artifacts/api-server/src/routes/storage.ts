import { Router } from "express";
import { Readable } from "node:stream";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod/v4";
import {
  db,
  filesTable,
  fileQuotasTable,
  FILE_USAGE_AREAS,
  FILE_VISIBILITIES,
  type FileRecord,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { createAuditLog } from "../lib/audit";
import { getStorageProvider } from "../lib/storage/provider";
import { validateUpload } from "../lib/storage/validation";
import { enqueueScan } from "../lib/storage/scan";
import { signFileToken, verifyFileToken } from "../lib/storage/signed-url";
import type { ObjectAclPolicy } from "../lib/objectAcl";
import type { Response as ExpressResponse } from "express";

const router = Router();
const storage = getStorageProvider();

const DEFAULT_QUOTA_BYTES = 2_147_483_648; // 2 GiB

function ip(req: AuthRequest): string | undefined {
  return req.ip;
}

function parseId(raw: string | string[] | undefined): number {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return parseInt(String(v), 10);
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w.\-]+/g, "_").slice(0, 200) || "download";
}

function isExpired(f: FileRecord): boolean {
  return !!f.expiresAt && new Date(f.expiresAt).getTime() < Date.now();
}

/** Pipe a web `Response` (from the storage provider) through Express. */
async function pipeResponse(
  webRes: Response,
  res: ExpressResponse,
  opts: { filename: string; disposition: "inline" | "attachment" },
): Promise<void> {
  const ct = webRes.headers.get("Content-Type") || "application/octet-stream";
  const len = webRes.headers.get("Content-Length");
  res.setHeader("Content-Type", ct);
  if (len) res.setHeader("Content-Length", len);
  res.setHeader(
    "Content-Disposition",
    `${opts.disposition}; filename="${sanitizeFilename(opts.filename)}"`,
  );
  if (!webRes.body) {
    res.end();
    return;
  }
  const nodeStream = Readable.fromWeb(webRes.body as never);
  nodeStream.pipe(res);
  await new Promise<void>((resolve, reject) => {
    nodeStream.on("end", resolve);
    nodeStream.on("error", reject);
  });
}

async function getOrCreateQuota(userId: number) {
  const existing = await db.query.fileQuotasTable.findFirst({
    where: eq(fileQuotasTable.userId, userId),
  });
  if (existing) return existing;
  const [created] = await db
    .insert(fileQuotasTable)
    .values({ userId, quotaBytes: DEFAULT_QUOTA_BYTES, usedBytes: 0 })
    .onConflictDoNothing()
    .returning();
  return (
    created ??
    (await db.query.fileQuotasTable.findFirst({
      where: eq(fileQuotasTable.userId, userId),
    }))!
  );
}

function canRead(file: FileRecord, req: AuthRequest): boolean {
  if (!req.user) return false;
  if (req.user.role === "admin") return true;
  if (file.ownerId === req.user.userId) return true;
  if (file.visibility === "public" && file.scanStatus !== "infected")
    return true;
  return false;
}

function canMutate(file: FileRecord, req: AuthRequest): boolean {
  if (!req.user) return false;
  return req.user.role === "admin" || file.ownerId === req.user.userId;
}

// ─────────────────────────────────────────────────────────────────────────────
// Quota
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  "/storage/quota",
  requireAuth,
  async (req: AuthRequest, res): Promise<void> => {
    const q = await getOrCreateQuota(req.user!.userId);
    res.json({
      quotaBytes: q.quotaBytes,
      usedBytes: q.usedBytes,
      availableBytes: Math.max(0, q.quotaBytes - q.usedBytes),
    });
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Upload: request presigned URL
// ─────────────────────────────────────────────────────────────────────────────

const requestUrlSchema = z.object({
  name: z.string().min(1).max(255),
  contentType: z.string().min(1).max(200),
  size: z.number().int().positive(),
});

router.post(
  "/storage/uploads/request-url",
  requireAuth,
  async (req: AuthRequest, res): Promise<void> => {
    const parsed = requestUrlSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const { name, contentType, size } = parsed.data;

    const v = validateUpload({ name, contentType, size });
    if (!v.ok) {
      res.status(400).json({ error: v.error });
      return;
    }

    const quota = await getOrCreateQuota(req.user!.userId);
    if (quota.usedBytes + size > quota.quotaBytes) {
      res.status(413).json({
        error: "Storage quota exceeded",
        quotaBytes: quota.quotaBytes,
        usedBytes: quota.usedBytes,
      });
      return;
    }

    const { uploadURL, objectPath } = await storage.requestUpload();
    res.json({ uploadURL, objectPath });
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Register file metadata after the client uploads bytes to the presigned URL
// ─────────────────────────────────────────────────────────────────────────────

const registerSchema = z.object({
  objectPath: z.string().min(1).max(500),
  name: z.string().min(1).max(255),
  contentType: z.string().min(1).max(200),
  size: z.number().int().positive(),
  usageArea: z.enum(FILE_USAGE_AREAS).optional(),
  folder: z.string().max(300).optional(),
  visibility: z.enum(FILE_VISIBILITIES).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

router.post(
  "/storage/files",
  requireAuth,
  async (req: AuthRequest, res): Promise<void> => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const d = parsed.data;
    const userId = req.user!.userId;

    const v = validateUpload({
      name: d.name,
      contentType: d.contentType,
      size: d.size,
    });
    if (!v.ok) {
      res.status(400).json({ error: v.error });
      return;
    }
    if (!d.objectPath.startsWith("/objects/")) {
      res.status(400).json({ error: "Invalid objectPath" });
      return;
    }

    // Re-check quota at finalize time (defense against concurrent uploads).
    const quota = await getOrCreateQuota(userId);
    if (quota.usedBytes + d.size > quota.quotaBytes) {
      res.status(413).json({ error: "Storage quota exceeded" });
      return;
    }

    const visibility = d.visibility ?? "private";
    // Apply ACL on the underlying object.
    try {
      await storage.setAcl(d.objectPath, {
        owner: String(userId),
        visibility: visibility === "public" ? "public" : "private",
      } as ObjectAclPolicy);
    } catch {
      res
        .status(400)
        .json({ error: "Uploaded object not found; complete the upload first" });
      return;
    }

    const [file] = await db
      .insert(filesTable)
      .values({
        objectPath: d.objectPath,
        ownerId: userId,
        originalName: d.name,
        contentType: d.contentType,
        size: d.size,
        folder: d.folder ?? "/",
        usageArea: d.usageArea ?? "general",
        visibility,
        metadata: d.metadata ?? null,
        expiresAt: d.expiresAt ? new Date(d.expiresAt) : null,
        scanStatus: "pending",
      })
      .returning();

    await db
      .update(fileQuotasTable)
      .set({ usedBytes: quota.usedBytes + d.size })
      .where(eq(fileQuotasTable.userId, userId));

    await enqueueScan(file.id);

    await createAuditLog({
      userId,
      action: "storage.file.upload",
      entityType: "file",
      entityId: file.id,
      ipAddress: ip(req),
      userAgent: req.headers["user-agent"],
      metadata: {
        name: d.name,
        size: d.size,
        usageArea: file.usageArea,
        visibility,
      },
    });

    res.status(201).json({ file });
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// List files (own by default; admins may pass scope=all)
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  "/storage/files",
  requireAuth,
  async (req: AuthRequest, res): Promise<void> => {
    const userId = req.user!.userId;
    const isAdmin = req.user!.role === "admin";
    const scopeAll = isAdmin && req.query.scope === "all";

    const usageArea =
      typeof req.query.usageArea === "string" ? req.query.usageArea : undefined;
    const folder =
      typeof req.query.folder === "string" ? req.query.folder : undefined;
    const includeDeleted = req.query.includeDeleted === "true";
    const limit = Math.min(
      100,
      Math.max(1, parseInt(String(req.query.limit ?? "50"), 10) || 50),
    );
    const offset = Math.max(0, parseInt(String(req.query.offset ?? "0"), 10) || 0);

    const conds = [eq(filesTable.isLatest, true)];
    if (!scopeAll) conds.push(eq(filesTable.ownerId, userId));
    if (!includeDeleted) conds.push(eq(filesTable.status, "active"));
    if (usageArea) conds.push(eq(filesTable.usageArea, usageArea));
    if (folder) conds.push(eq(filesTable.folder, folder));

    const rows = await db
      .select()
      .from(filesTable)
      .where(and(...conds))
      .orderBy(desc(filesTable.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(filesTable)
      .where(and(...conds));

    res.json({ files: rows, total: count, limit, offset });
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Single file metadata
// ─────────────────────────────────────────────────────────────────────────────

async function loadFile(id: number): Promise<FileRecord | undefined> {
  return db.query.filesTable.findFirst({ where: eq(filesTable.id, id) });
}

router.get(
  "/storage/files/:id",
  requireAuth,
  async (req: AuthRequest, res): Promise<void> => {
    const id = parseId(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid file id" });
      return;
    }
    const file = await loadFile(id);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }
    if (!canRead(file, req)) {
      res.status(403).json({ error: "Access denied" });
      return;
    }
    res.json({ file });
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Versions
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  "/storage/files/:id/versions",
  requireAuth,
  async (req: AuthRequest, res): Promise<void> => {
    const id = parseId(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid file id" });
      return;
    }
    const file = await loadFile(id);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }
    if (!canRead(file, req)) {
      res.status(403).json({ error: "Access denied" });
      return;
    }
    const headId = file.parentFileId ?? file.id;
    const versions = await db
      .select()
      .from(filesTable)
      .where(
        sql`${filesTable.id} = ${headId} OR ${filesTable.parentFileId} = ${headId}`,
      )
      .orderBy(desc(filesTable.version));
    res.json({ versions });
  },
);

const newVersionSchema = z.object({
  objectPath: z.string().min(1).max(500),
  name: z.string().min(1).max(255),
  contentType: z.string().min(1).max(200),
  size: z.number().int().positive(),
});

router.post(
  "/storage/files/:id/versions",
  requireAuth,
  async (req: AuthRequest, res): Promise<void> => {
    const id = parseId(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid file id" });
      return;
    }
    const parsed = newVersionSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const d = parsed.data;
    const head = await loadFile(id);
    if (!head) {
      res.status(404).json({ error: "File not found" });
      return;
    }
    if (!canMutate(head, req)) {
      res.status(403).json({ error: "Access denied" });
      return;
    }
    const v = validateUpload({
      name: d.name,
      contentType: d.contentType,
      size: d.size,
    });
    if (!v.ok) {
      res.status(400).json({ error: v.error });
      return;
    }
    if (!d.objectPath.startsWith("/objects/")) {
      res.status(400).json({ error: "Invalid objectPath" });
      return;
    }
    const userId = req.user!.userId;
    const headId = head.parentFileId ?? head.id;

    // Quota and object ownership belong to the file owner, not the actor. An
    // admin uploading a new version on behalf of another user must charge that
    // user's quota ledger (and keep the object owned by them), otherwise the
    // owner's quota can be silently bypassed and the ledger corrupted.
    const ownerId = head.ownerId;
    const quota = await getOrCreateQuota(ownerId);
    if (quota.usedBytes + d.size > quota.quotaBytes) {
      res.status(413).json({ error: "Storage quota exceeded" });
      return;
    }

    try {
      await storage.setAcl(d.objectPath, {
        owner: String(ownerId),
        visibility: head.visibility === "public" ? "public" : "private",
      } as ObjectAclPolicy);
    } catch {
      res.status(400).json({ error: "Uploaded object not found" });
      return;
    }

    // Demote all existing versions, then insert the new latest.
    await db
      .update(filesTable)
      .set({ isLatest: false })
      .where(
        sql`${filesTable.id} = ${headId} OR ${filesTable.parentFileId} = ${headId}`,
      );

    const [{ maxV }] = await db
      .select({ maxV: sql<number>`coalesce(max(${filesTable.version}),0)::int` })
      .from(filesTable)
      .where(
        sql`${filesTable.id} = ${headId} OR ${filesTable.parentFileId} = ${headId}`,
      );

    const [version] = await db
      .insert(filesTable)
      .values({
        objectPath: d.objectPath,
        ownerId: head.ownerId,
        originalName: d.name,
        contentType: d.contentType,
        size: d.size,
        folder: head.folder,
        usageArea: head.usageArea,
        visibility: head.visibility,
        version: maxV + 1,
        parentFileId: headId,
        isLatest: true,
        scanStatus: "pending",
      })
      .returning();

    await db
      .update(fileQuotasTable)
      .set({ usedBytes: quota.usedBytes + d.size })
      .where(eq(fileQuotasTable.userId, ownerId));

    await enqueueScan(version.id);

    await createAuditLog({
      userId,
      action: "storage.file.version",
      entityType: "file",
      entityId: version.id,
      ipAddress: ip(req),
      userAgent: req.headers["user-agent"],
      metadata: { headId, version: version.version },
    });

    res.status(201).json({ file: version });
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Soft delete + restore
// ─────────────────────────────────────────────────────────────────────────────

router.delete(
  "/storage/files/:id",
  requireAuth,
  async (req: AuthRequest, res): Promise<void> => {
    const id = parseId(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid file id" });
      return;
    }
    const file = await loadFile(id);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }
    if (!canMutate(file, req)) {
      res.status(403).json({ error: "Access denied" });
      return;
    }
    if (file.status === "deleted") {
      res.json({ file });
      return;
    }
    const [updated] = await db
      .update(filesTable)
      .set({
        status: "deleted",
        deletedAt: new Date(),
        deletedBy: req.user!.userId,
      })
      .where(eq(filesTable.id, id))
      .returning();

    // Free quota for the owner.
    const ownerQuota = await getOrCreateQuota(file.ownerId);
    await db
      .update(fileQuotasTable)
      .set({ usedBytes: Math.max(0, ownerQuota.usedBytes - file.size) })
      .where(eq(fileQuotasTable.userId, file.ownerId));

    await createAuditLog({
      userId: req.user!.userId,
      action: "storage.file.delete",
      entityType: "file",
      entityId: id,
      ipAddress: ip(req),
      userAgent: req.headers["user-agent"],
      metadata: { name: file.originalName },
    });

    res.json({ file: updated });
  },
);

router.post(
  "/storage/files/:id/restore",
  requireAuth,
  async (req: AuthRequest, res): Promise<void> => {
    const id = parseId(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid file id" });
      return;
    }
    const file = await loadFile(id);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }
    if (!canMutate(file, req)) {
      res.status(403).json({ error: "Access denied" });
      return;
    }
    if (file.status !== "deleted") {
      res.json({ file });
      return;
    }
    const ownerQuota = await getOrCreateQuota(file.ownerId);
    if (ownerQuota.usedBytes + file.size > ownerQuota.quotaBytes) {
      res
        .status(413)
        .json({ error: "Restoring would exceed the storage quota" });
      return;
    }
    const [updated] = await db
      .update(filesTable)
      .set({ status: "active", deletedAt: null, deletedBy: null })
      .where(eq(filesTable.id, id))
      .returning();

    await db
      .update(fileQuotasTable)
      .set({ usedBytes: ownerQuota.usedBytes + file.size })
      .where(eq(fileQuotasTable.userId, file.ownerId));

    await createAuditLog({
      userId: req.user!.userId,
      action: "storage.file.restore",
      entityType: "file",
      entityId: id,
      ipAddress: ip(req),
      userAgent: req.headers["user-agent"],
      metadata: { name: file.originalName },
    });

    res.json({ file: updated });
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Download / preview (RBAC + audit)
// ─────────────────────────────────────────────────────────────────────────────

async function serveFile(
  req: AuthRequest,
  res: ExpressResponse,
  disposition: "inline" | "attachment",
): Promise<void> {
  const id = parseId(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid file id" });
    return;
  }
  const file = await loadFile(id);
  if (!file || file.status === "deleted") {
    res.status(404).json({ error: "File not found" });
    return;
  }
  if (!canRead(file, req)) {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  if (isExpired(file)) {
    res.status(410).json({ error: "File has expired" });
    return;
  }
  if (file.scanStatus === "infected") {
    res.status(403).json({ error: "File failed virus scan" });
    return;
  }
  try {
    const webRes = await storage.streamObject(file.objectPath);
    if (disposition === "attachment") {
      await createAuditLog({
        userId: req.user!.userId,
        action: "storage.file.download",
        entityType: "file",
        entityId: file.id,
        ipAddress: ip(req),
        userAgent: req.headers["user-agent"],
      });
    }
    await pipeResponse(webRes, res, {
      filename: file.originalName,
      disposition,
    });
  } catch {
    if (!res.headersSent)
      res.status(404).json({ error: "Object bytes not found" });
  }
}

router.get(
  "/storage/files/:id/download",
  requireAuth,
  async (req: AuthRequest, res): Promise<void> => {
    await serveFile(req, res, "attachment");
  },
);

router.get(
  "/storage/files/:id/preview",
  requireAuth,
  async (req: AuthRequest, res): Promise<void> => {
    await serveFile(req, res, "inline");
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Signed (shareable) URLs with expiry
// ─────────────────────────────────────────────────────────────────────────────

const signSchema = z.object({
  ttlSeconds: z.number().int().min(60).max(7 * 24 * 3600).optional(),
});

router.post(
  "/storage/files/:id/signed-url",
  requireAuth,
  async (req: AuthRequest, res): Promise<void> => {
    const id = parseId(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid file id" });
      return;
    }
    const parsed = signSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const file = await loadFile(id);
    if (!file || file.status === "deleted") {
      res.status(404).json({ error: "File not found" });
      return;
    }
    if (!canMutate(file, req)) {
      res.status(403).json({ error: "Access denied" });
      return;
    }
    const ttl = parsed.data.ttlSeconds ?? 3600;
    const { token, expiresAt } = signFileToken(file.id, ttl);

    await createAuditLog({
      userId: req.user!.userId,
      action: "storage.file.share",
      entityType: "file",
      entityId: file.id,
      ipAddress: ip(req),
      userAgent: req.headers["user-agent"],
      metadata: { ttl },
    });

    res.json({
      url: `/api/storage/shared/${token}`,
      token,
      expiresAt: new Date(expiresAt).toISOString(),
    });
  },
);

// Public: resolve a signed token and stream the file (no auth).
router.get(
  "/storage/shared/:token",
  async (req: AuthRequest, res): Promise<void> => {
    const token = Array.isArray(req.params.token)
      ? req.params.token[0]
      : req.params.token;
    const fileId = verifyFileToken(String(token));
    if (fileId === null) {
      res.status(403).json({ error: "Invalid or expired link" });
      return;
    }
    const file = await loadFile(fileId);
    if (!file || file.status === "deleted" || isExpired(file)) {
      res.status(404).json({ error: "File not found" });
      return;
    }
    if (file.scanStatus === "infected") {
      res.status(403).json({ error: "File failed virus scan" });
      return;
    }
    try {
      const webRes = await storage.streamObject(file.objectPath);
      await pipeResponse(webRes, res, {
        filename: file.originalName,
        disposition: "inline",
      });
    } catch {
      if (!res.headersSent)
        res.status(404).json({ error: "Object bytes not found" });
    }
  },
);

export default router;
