import { Router } from "express";
import { ZipArchive } from "archiver";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod/v4";
import {
  db,
  certificatesTable,
  certificateTemplatesTable,
  usersTable,
  type Certificate,
} from "@workspace/db";
import {
  requireAuth,
  requireRole,
  type AuthRequest,
} from "../middlewares/auth";
import { createAuditLog } from "../lib/audit";
import { getStorageProvider } from "../lib/storage/provider";
import { renderCertificatePdf } from "../lib/certificates/pdf";

const router = Router();
const storage = getStorageProvider();
const adminGuards = [requireAuth, requireRole("admin")];

function ip(req: AuthRequest): string | undefined {
  return req.ip;
}

function parseId(raw: string | string[] | undefined): number {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return parseInt(String(v), 10);
}

function publicBaseUrl(): string {
  const domains = process.env.REPLIT_DOMAINS;
  if (domains) {
    const first = domains.split(",")[0]?.trim();
    if (first) return `https://${first}`;
  }
  return "";
}

function verifyUrlFor(verifyToken: string): string {
  return `${publicBaseUrl()}/verify/${verifyToken}`;
}

/** Compute the effective status, accounting for an elapsed expiry date. */
function effectiveStatus(c: Pick<Certificate, "status" | "expiresDate">): string {
  if (c.status === "revoked") return "revoked";
  if (
    c.expiresDate &&
    new Date(c.expiresDate).getTime() < Date.now()
  ) {
    return "expired";
  }
  return c.status;
}

interface CertWithHolder {
  cert: Certificate;
  holderName: string;
}

async function loadCertWithHolder(
  id: number,
): Promise<CertWithHolder | undefined> {
  const [row] = await db
    .select({ cert: certificatesTable, holderName: usersTable.fullName })
    .from(certificatesTable)
    .leftJoin(usersTable, eq(usersTable.id, certificatesTable.userId))
    .where(eq(certificatesTable.id, id))
    .limit(1);
  if (!row) return undefined;
  return { cert: row.cert, holderName: row.holderName ?? "FUTRSEC Learner" };
}

/**
 * Generate (or regenerate) the PDF for a certificate, store it, and persist the
 * object path. Returns the rendered Buffer and its object path.
 */
async function generateAndStore(
  cw: CertWithHolder,
  opts: { regenerate?: boolean } = {},
): Promise<{ buffer: Buffer; objectPath: string }> {
  const { cert, holderName } = cw;

  let template = null;
  if (cert.templateId) {
    template =
      (await db.query.certificateTemplatesTable.findFirst({
        where: eq(certificateTemplatesTable.id, cert.templateId),
      })) ?? null;
  }

  const status = effectiveStatus(cert);
  const buffer = await renderCertificatePdf({
    certificate: { ...cert, status },
    holderName,
    template,
    verifyUrl: verifyUrlFor(cert.verifyToken),
  });

  // Each upload yields a fresh object path. Capture the previous pointer so we
  // can delete the superseded object after the new one is committed, avoiding
  // orphaned objects accumulating in the bucket on every regenerate.
  const previousPath = cert.pdfObjectPath;
  const objectPath = await storage.uploadBuffer(buffer, "application/pdf");
  await storage.setAcl(objectPath, {
    owner: String(cert.userId),
    visibility: "private",
  });
  await db
    .update(certificatesTable)
    .set({ pdfObjectPath: objectPath })
    .where(eq(certificatesTable.id, cert.id));

  if (previousPath && previousPath !== objectPath) {
    try {
      await storage.deleteObject(previousPath);
    } catch {
      // Best-effort cleanup; a failed delete must not fail the download.
    }
  }

  return { buffer, objectPath };
}

/**
 * Return the certificate PDF bytes, reusing the already-stored object when one
 * exists. Only renders (and uploads) a new PDF when none is cached or the
 * caller explicitly requests regeneration. This keeps repeat downloads cheap
 * and avoids object churn on every access.
 */
async function getOrGeneratePdf(
  cw: CertWithHolder,
  opts: { regenerate?: boolean } = {},
): Promise<Buffer> {
  if (!opts.regenerate && cw.cert.pdfObjectPath) {
    try {
      const resp = await storage.streamObject(cw.cert.pdfObjectPath);
      const arr = await resp.arrayBuffer();
      const buf = Buffer.from(arr);
      if (buf.length > 0) return buf;
    } catch {
      // Cached object missing/unreadable — fall through to regenerate.
    }
  }
  const { buffer } = await generateAndStore(cw, opts);
  return buffer;
}

function canAccessCert(cert: Certificate, req: AuthRequest): boolean {
  if (!req.user) return false;
  return req.user.role === "admin" || cert.userId === req.user.userId;
}

// ─────────────────────────────────────────────────────────────────────────────
// Single download (owner or admin) — generates on first access, caches path
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  "/certificates/:id/pdf",
  requireAuth,
  async (req: AuthRequest, res): Promise<void> => {
    const id = parseId(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid certificate id" });
      return;
    }
    const cw = await loadCertWithHolder(id);
    if (!cw) {
      res.status(404).json({ error: "Certificate not found" });
      return;
    }
    if (!canAccessCert(cw.cert, req)) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const regenerate = req.query.regenerate === "true";
    const buffer = await getOrGeneratePdf(cw, { regenerate });

    await createAuditLog({
      userId: req.user!.userId,
      action: "certificate.download",
      entityType: "certificate",
      entityId: id,
      ipAddress: ip(req),
      userAgent: req.headers["user-agent"],
      metadata: { certificateCode: cw.cert.certificateCode },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${cw.cert.certificateCode}.pdf"`,
    );
    res.send(buffer);
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Bulk generate (admin)
// ─────────────────────────────────────────────────────────────────────────────

const bulkSchema = z.object({
  certificateIds: z.array(z.number().int().positive()).min(1).max(500),
});

router.post(
  "/admin/certificates/bulk-generate",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const parsed = bulkSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const ids = parsed.data.certificateIds;
    const rows = await db
      .select({ cert: certificatesTable, holderName: usersTable.fullName })
      .from(certificatesTable)
      .leftJoin(usersTable, eq(usersTable.id, certificatesTable.userId))
      .where(inArray(certificatesTable.id, ids));

    const results: { id: number; ok: boolean; error?: string }[] = [];
    for (const row of rows) {
      try {
        await generateAndStore({
          cert: row.cert,
          holderName: row.holderName ?? "FUTRSEC Learner",
        });
        results.push({ id: row.cert.id, ok: true });
      } catch (err) {
        results.push({
          id: row.cert.id,
          ok: false,
          error: err instanceof Error ? err.message : "render failed",
        });
      }
    }

    await createAuditLog({
      userId: req.user!.userId,
      action: "admin.certificate.bulk_generate",
      entityType: "certificate",
      entityId: undefined,
      ipAddress: ip(req),
      userAgent: req.headers["user-agent"],
      metadata: { requested: ids.length, generated: results.filter((r) => r.ok).length },
    });

    res.json({
      generated: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      results,
    });
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Bulk download as ZIP (admin)
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  "/admin/certificates/bulk-download",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const parsed = bulkSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const ids = parsed.data.certificateIds;
    const rows = await db
      .select({ cert: certificatesTable, holderName: usersTable.fullName })
      .from(certificatesTable)
      .leftJoin(usersTable, eq(usersTable.id, certificatesTable.userId))
      .where(inArray(certificatesTable.id, ids));

    if (rows.length === 0) {
      res.status(404).json({ error: "No certificates found" });
      return;
    }

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="certificates-${Date.now()}.zip"`,
    );

    const archive = new ZipArchive({ zlib: { level: 9 } });
    archive.on("error", (err: Error) => {
      req.log?.error({ err }, "bulk certificate zip failed");
      if (!res.headersSent) res.status(500).end();
      else res.end();
    });
    archive.pipe(res);

    for (const row of rows) {
      try {
        const buffer = await getOrGeneratePdf({
          cert: row.cert,
          holderName: row.holderName ?? "FUTRSEC Learner",
        });
        archive.append(buffer, { name: `${row.cert.certificateCode}.pdf` });
      } catch (err) {
        req.log?.warn(
          { err, certId: row.cert.id },
          "skipping certificate in bulk zip",
        );
      }
    }

    await createAuditLog({
      userId: req.user!.userId,
      action: "admin.certificate.bulk_download",
      entityType: "certificate",
      entityId: undefined,
      ipAddress: ip(req),
      userAgent: req.headers["user-agent"],
      metadata: { count: rows.length },
    });

    await archive.finalize();
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Analytics (admin)
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  "/admin/certificates/analytics",
  ...adminGuards,
  async (_req: AuthRequest, res): Promise<void> => {
    const [byStatus, byType, byTrack, totalRow, withPdfRow] = await Promise.all([
      db
        .select({
          status: certificatesTable.status,
          count: sql<number>`count(*)::int`,
        })
        .from(certificatesTable)
        .groupBy(certificatesTable.status),
      db
        .select({
          type: certificatesTable.type,
          count: sql<number>`count(*)::int`,
        })
        .from(certificatesTable)
        .groupBy(certificatesTable.type),
      db
        .select({
          careerTrack: certificatesTable.careerTrack,
          count: sql<number>`count(*)::int`,
        })
        .from(certificatesTable)
        .groupBy(certificatesTable.careerTrack),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(certificatesTable),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(certificatesTable)
        .where(sql`${certificatesTable.pdfObjectPath} is not null`),
    ]);

    // Expired-by-date (status still "issued" but past expiry).
    const [expiredByDate] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(certificatesTable)
      .where(
        and(
          eq(certificatesTable.status, "issued"),
          sql`${certificatesTable.expiresDate} is not null`,
          sql`${certificatesTable.expiresDate} < now()`,
        ),
      );

    res.json({
      total: totalRow[0]?.count ?? 0,
      generatedPdfs: withPdfRow[0]?.count ?? 0,
      expiredByDate: expiredByDate?.count ?? 0,
      byStatus,
      byType,
      byTrack,
    });
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Expire sweep (admin) — flips issued→expired for elapsed expiry dates
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  "/admin/certificates/expire-sweep",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const updated = await db
      .update(certificatesTable)
      .set({ status: "expired" })
      .where(
        and(
          eq(certificatesTable.status, "issued"),
          sql`${certificatesTable.expiresDate} is not null`,
          sql`${certificatesTable.expiresDate} < now()`,
        ),
      )
      .returning({ id: certificatesTable.id });

    await createAuditLog({
      userId: req.user!.userId,
      action: "admin.certificate.expire_sweep",
      entityType: "certificate",
      entityId: undefined,
      ipAddress: ip(req),
      userAgent: req.headers["user-agent"],
      metadata: { expired: updated.length },
    });

    res.json({ expired: updated.length, ids: updated.map((u) => u.id) });
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Holder: my certificates (with effective status + share metadata)
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  "/certificates/mine",
  requireAuth,
  async (req: AuthRequest, res): Promise<void> => {
    const rows = await db
      .select()
      .from(certificatesTable)
      .where(eq(certificatesTable.userId, req.user!.userId))
      .orderBy(desc(certificatesTable.createdAt));

    res.json({
      certificates: rows.map((c) => ({
        id: c.id,
        certificateCode: c.certificateCode,
        title: c.title,
        type: c.type,
        careerTrack: c.careerTrack,
        issuedDate: c.issuedDate,
        expiresDate: c.expiresDate,
        status: effectiveStatus(c),
        verifyToken: c.verifyToken,
        verifyUrl: verifyUrlFor(c.verifyToken),
        hasPdf: !!c.pdfObjectPath,
      })),
    });
  },
);

export default router;
