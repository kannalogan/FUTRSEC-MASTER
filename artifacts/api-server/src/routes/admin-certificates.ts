import { Router } from "express";
import { randomBytes } from "node:crypto";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod/v4";
import { db } from "@workspace/db";
import {
  certificatesTable,
  certificateTemplatesTable,
  usersTable,
} from "@workspace/db";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth";
import { createAuditLog } from "../lib/audit";

const router = Router();

const adminGuards = [requireAuth, requireRole("admin")];

const CAREER_TRACKS = ["soc", "vapt", "grc"] as const;
const CERT_TYPES = ["course_completion", "internship", "achievement"] as const;

function ip(req: AuthRequest): string | undefined {
  return req.ip;
}

function parseId(raw: string | string[] | undefined): number {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return parseInt(String(v), 10);
}

// ─────────────────────────────────────────────────────────────────────────────
// Templates
// ─────────────────────────────────────────────────────────────────────────────

const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(CERT_TYPES).optional(),
  careerTrack: z.enum(CAREER_TRACKS).nullable().optional(),
  logoUrl: z.string().max(1000).nullable().optional(),
  signatureUrl: z.string().max(1000).nullable().optional(),
  signatureName: z.string().max(200).nullable().optional(),
  bodyTemplate: z.string().max(10000).nullable().optional(),
  isActive: z.boolean().optional(),
});

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: z.enum(CERT_TYPES).optional(),
  careerTrack: z.enum(CAREER_TRACKS).nullable().optional(),
  logoUrl: z.string().max(1000).nullable().optional(),
  signatureUrl: z.string().max(1000).nullable().optional(),
  signatureName: z.string().max(200).nullable().optional(),
  bodyTemplate: z.string().max(10000).nullable().optional(),
  isActive: z.boolean().optional(),
});

// GET /admin/certificates/templates — list templates
router.get(
  "/admin/certificates/templates",
  ...adminGuards,
  async (_req: AuthRequest, res): Promise<void> => {
    const templates = await db
      .select()
      .from(certificateTemplatesTable)
      .orderBy(desc(certificateTemplatesTable.createdAt));
    res.json({ templates });
    return;
  }
);

// POST /admin/certificates/templates — create template
router.post(
  "/admin/certificates/templates",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const parsed = createTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const d = parsed.data;
    const [template] = await db
      .insert(certificateTemplatesTable)
      .values({
        name: d.name,
        type: d.type ?? "course_completion",
        careerTrack: d.careerTrack ?? null,
        logoUrl: d.logoUrl ?? null,
        signatureUrl: d.signatureUrl ?? null,
        signatureName: d.signatureName ?? null,
        bodyTemplate: d.bodyTemplate ?? null,
        isActive: d.isActive ?? true,
        createdBy: req.user.userId,
      })
      .returning();

    await createAuditLog({
      userId: req.user.userId,
      action: "admin.certificate_template.created",
      entityType: "certificate_template",
      entityId: template.id,
      ipAddress: ip(req),
      userAgent: req.headers["user-agent"],
      metadata: { name: d.name, type: template.type },
    });

    res.status(201).json({ template });
    return;
  }
);

// PATCH /admin/certificates/templates/:id — update template
router.patch(
  "/admin/certificates/templates/:id",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const id = parseId(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid template id" });
      return;
    }
    const parsed = updateTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const existing = await db.query.certificateTemplatesTable.findFirst({
      where: eq(certificateTemplatesTable.id, id),
    });
    if (!existing) {
      res.status(404).json({ error: "Template not found" });
      return;
    }
    const d = parsed.data;
    const [updated] = await db
      .update(certificateTemplatesTable)
      .set({
        ...(d.name !== undefined ? { name: d.name } : {}),
        ...(d.type !== undefined ? { type: d.type } : {}),
        ...(d.careerTrack !== undefined ? { careerTrack: d.careerTrack } : {}),
        ...(d.logoUrl !== undefined ? { logoUrl: d.logoUrl } : {}),
        ...(d.signatureUrl !== undefined
          ? { signatureUrl: d.signatureUrl }
          : {}),
        ...(d.signatureName !== undefined
          ? { signatureName: d.signatureName }
          : {}),
        ...(d.bodyTemplate !== undefined
          ? { bodyTemplate: d.bodyTemplate }
          : {}),
        ...(d.isActive !== undefined ? { isActive: d.isActive } : {}),
      })
      .where(eq(certificateTemplatesTable.id, id))
      .returning();

    await createAuditLog({
      userId: req.user.userId,
      action: "admin.certificate_template.updated",
      entityType: "certificate_template",
      entityId: id,
      ipAddress: ip(req),
      userAgent: req.headers["user-agent"],
      metadata: { ...d },
    });

    res.json({ template: updated });
    return;
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Issued certificates
// ─────────────────────────────────────────────────────────────────────────────

const issueSchema = z.object({
  userId: z.number().int().positive(),
  type: z.enum(CERT_TYPES),
  title: z.string().min(1).max(300),
  careerTrack: z.enum(CAREER_TRACKS).nullable().optional(),
  courseName: z.string().max(300).nullable().optional(),
  internshipName: z.string().max(300).nullable().optional(),
  achievementLabel: z.string().max(300).nullable().optional(),
  mentorId: z.number().int().positive().nullable().optional(),
  durationText: z.string().max(200).nullable().optional(),
  templateId: z.number().int().positive().nullable().optional(),
});

function generateCertificateCode(): string {
  const year = new Date().getFullYear();
  const sixDigit = Math.floor(100000 + Math.random() * 900000);
  return `FUTR-CERT-${year}-${sixDigit}`;
}

// POST /admin/certificates/issue — issue a certificate
router.post(
  "/admin/certificates/issue",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const parsed = issueSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const d = parsed.data;

    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.id, d.userId),
    });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (d.templateId) {
      const template = await db.query.certificateTemplatesTable.findFirst({
        where: eq(certificateTemplatesTable.id, d.templateId),
      });
      if (!template) {
        res.status(400).json({ error: "templateId does not reference a template" });
        return;
      }
    }

    if (d.mentorId) {
      const mentor = await db.query.usersTable.findFirst({
        where: eq(usersTable.id, d.mentorId),
      });
      if (!mentor || mentor.role !== "mentor") {
        res.status(400).json({ error: "mentorId must reference a mentor" });
        return;
      }
    }

    const issuedDate = new Date().toISOString().slice(0, 10);
    const verifyToken = randomBytes(24).toString("hex");

    let certificate;
    for (let attempt = 0; attempt < 5; attempt++) {
      const certificateCode = generateCertificateCode();
      try {
        [certificate] = await db
          .insert(certificatesTable)
          .values({
            certificateCode,
            userId: d.userId,
            templateId: d.templateId ?? null,
            type: d.type,
            title: d.title,
            careerTrack: d.careerTrack ?? null,
            courseName: d.courseName ?? null,
            internshipName: d.internshipName ?? null,
            mentorId: d.mentorId ?? null,
            durationText: d.durationText ?? null,
            achievementLabel: d.achievementLabel ?? null,
            issuedDate,
            verifyToken,
            status: "issued",
            issuedBy: req.user.userId,
          })
          .returning();
        break;
      } catch (err) {
        if (attempt === 4) throw err;
      }
    }

    if (!certificate) {
      res.status(500).json({ error: "Failed to issue certificate" });
      return;
    }

    await createAuditLog({
      userId: req.user.userId,
      action: "admin.certificate.issued",
      entityType: "certificate",
      entityId: certificate.id,
      ipAddress: ip(req),
      userAgent: req.headers["user-agent"],
      metadata: {
        certificateCode: certificate.certificateCode,
        userId: d.userId,
        type: d.type,
      },
    });

    res.status(201).json({ certificate });
    return;
  }
);

// GET /admin/certificates?userId= — list issued certificates
router.get(
  "/admin/certificates",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const userIdRaw =
      typeof req.query.userId === "string" ? req.query.userId : undefined;
    const userId = userIdRaw ? parseInt(userIdRaw, 10) : undefined;

    const where =
      userId !== undefined && !isNaN(userId)
        ? eq(certificatesTable.userId, userId)
        : undefined;

    const rows = await db
      .select({
        id: certificatesTable.id,
        certificateCode: certificatesTable.certificateCode,
        userId: certificatesTable.userId,
        templateId: certificatesTable.templateId,
        type: certificatesTable.type,
        title: certificatesTable.title,
        careerTrack: certificatesTable.careerTrack,
        courseName: certificatesTable.courseName,
        internshipName: certificatesTable.internshipName,
        mentorId: certificatesTable.mentorId,
        durationText: certificatesTable.durationText,
        achievementLabel: certificatesTable.achievementLabel,
        issuedDate: certificatesTable.issuedDate,
        verifyToken: certificatesTable.verifyToken,
        status: certificatesTable.status,
        issuedBy: certificatesTable.issuedBy,
        createdAt: certificatesTable.createdAt,
        holderName: usersTable.fullName,
        holderEmail: usersTable.email,
      })
      .from(certificatesTable)
      .leftJoin(usersTable, eq(usersTable.id, certificatesTable.userId))
      .where(where)
      .orderBy(desc(certificatesTable.createdAt))
      .limit(500);

    res.json({
      certificates: rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      })),
    });
    return;
  }
);

// POST /admin/certificates/:id/revoke — revoke a certificate
router.post(
  "/admin/certificates/:id/revoke",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const id = parseId(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid certificate id" });
      return;
    }
    const existing = await db.query.certificatesTable.findFirst({
      where: eq(certificatesTable.id, id),
    });
    if (!existing) {
      res.status(404).json({ error: "Certificate not found" });
      return;
    }
    const [updated] = await db
      .update(certificatesTable)
      .set({ status: "revoked" })
      .where(eq(certificatesTable.id, id))
      .returning();

    await createAuditLog({
      userId: req.user.userId,
      action: "admin.certificate.revoked",
      entityType: "certificate",
      entityId: id,
      ipAddress: ip(req),
      userAgent: req.headers["user-agent"],
      metadata: { certificateCode: existing.certificateCode },
    });

    res.json({ certificate: updated });
    return;
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Public QR verification (NO auth)
// ─────────────────────────────────────────────────────────────────────────────

// GET /certificates/verify/:token — public verification endpoint
router.get(
  "/certificates/verify/:token",
  async (req: AuthRequest, res): Promise<void> => {
    const tokenRaw = req.params.token;
    const token = Array.isArray(tokenRaw) ? tokenRaw[0] : tokenRaw;
    if (typeof token !== "string" || token.length === 0) {
      res.json({ valid: false });
      return;
    }

    const [row] = await db
      .select({
        certificateCode: certificatesTable.certificateCode,
        title: certificatesTable.title,
        type: certificatesTable.type,
        careerTrack: certificatesTable.careerTrack,
        issuedDate: certificatesTable.issuedDate,
        expiresDate: certificatesTable.expiresDate,
        status: certificatesTable.status,
        holderName: usersTable.fullName,
      })
      .from(certificatesTable)
      .leftJoin(usersTable, eq(usersTable.id, certificatesTable.userId))
      .where(eq(certificatesTable.verifyToken, token))
      .limit(1);

    if (!row) {
      res.json({ valid: false });
      return;
    }

    // A certificate verifies as valid only if it is issued AND not past its
    // expiry date. Revoked or time-expired certificates report their reason.
    if (row.status !== "issued") {
      res.json({ valid: false, reason: row.status });
      return;
    }
    if (row.expiresDate && new Date(row.expiresDate).getTime() < Date.now()) {
      res.json({
        valid: false,
        reason: "expired",
        certificate: {
          code: row.certificateCode,
          holderName: row.holderName,
          title: row.title,
          type: row.type,
          careerTrack: row.careerTrack,
          issuedDate: row.issuedDate,
          expiresDate: row.expiresDate,
        },
      });
      return;
    }

    res.json({
      valid: true,
      certificate: {
        code: row.certificateCode,
        holderName: row.holderName,
        title: row.title,
        type: row.type,
        careerTrack: row.careerTrack,
        issuedDate: row.issuedDate,
        expiresDate: row.expiresDate,
      },
    });
    return;
  }
);

export default router;
