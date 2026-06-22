import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import {
  db,
  certificatesTable,
  certificateAutoIssueConfigTable,
  usersTable,
  type Certificate,
  type CertificateAutoIssueConfig,
} from "@workspace/db";
import { logger } from "../logger";
import { createAuditLog } from "../audit";
import { createNotification } from "../notifications";
import { addCertPdfJob } from "../queues";
import { generatePdfForId, verifyUrlFor } from "./generate";

export type CertSourceType =
  | "course"
  | "learning_path"
  | "lab_series"
  | "career_roadmap"
  | "internship"
  | "manual";

function generateCertificateCode(): string {
  const year = new Date().getFullYear();
  const sixDigit = Math.floor(100000 + Math.random() * 900000);
  return `FUTR-CERT-${year}-${sixDigit}`;
}

function computeExpiresDate(expiryMonths: number | null | undefined): string | null {
  if (!expiryMonths || expiryMonths <= 0) return null;
  const d = new Date();
  d.setMonth(d.getMonth() + expiryMonths);
  return d.toISOString().slice(0, 10);
}

export async function getAutoIssueConfig(
  sourceType: CertSourceType,
  sourceId: number,
): Promise<CertificateAutoIssueConfig | null> {
  const [row] = await db
    .select()
    .from(certificateAutoIssueConfigTable)
    .where(
      and(
        eq(certificateAutoIssueConfigTable.sourceType, sourceType),
        eq(certificateAutoIssueConfigTable.sourceId, sourceId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function findExistingCertificate(
  userId: number,
  sourceType: CertSourceType,
  sourceId: number,
): Promise<Certificate | null> {
  const [row] = await db
    .select()
    .from(certificatesTable)
    .where(
      and(
        eq(certificatesTable.userId, userId),
        eq(certificatesTable.sourceType, sourceType),
        eq(certificatesTable.sourceId, sourceId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export interface IssueCertificateInput {
  userId: number;
  sourceType: CertSourceType;
  sourceId?: number | null;
  type?: string;
  title: string;
  careerTrack?: string | null;
  courseName?: string | null;
  internshipName?: string | null;
  durationText?: string | null;
  achievementLabel?: string | null;
  templateId?: number | null;
  mentorId?: number | null;
  expiryMonths?: number | null;
  issuedBy?: number | null;
}

/**
 * Create a certificate record, enqueue async PDF generation, notify the holder
 * (in-app + email), and write an audit log. The PDF is generated off the
 * request path by the BullMQ worker; if Redis is unavailable it is generated
 * lazily on first download. Returns the created certificate.
 */
export async function issueCertificate(
  input: IssueCertificateInput,
): Promise<Certificate> {
  const issuedDate = new Date().toISOString().slice(0, 10);
  const expiresDate = computeExpiresDate(input.expiryMonths);
  const verifyToken = randomBytes(24).toString("hex");

  let certificate: Certificate | undefined;
  for (let attempt = 0; attempt < 5; attempt++) {
    const certificateCode = generateCertificateCode();
    try {
      [certificate] = await db
        .insert(certificatesTable)
        .values({
          certificateCode,
          userId: input.userId,
          templateId: input.templateId ?? null,
          type: input.type ?? "course_completion",
          title: input.title,
          careerTrack: (input.careerTrack ?? null) as Certificate["careerTrack"],
          sourceType: input.sourceType,
          sourceId: input.sourceId ?? null,
          courseName: input.courseName ?? null,
          internshipName: input.internshipName ?? null,
          mentorId: input.mentorId ?? null,
          durationText: input.durationText ?? null,
          achievementLabel: input.achievementLabel ?? null,
          issuedDate,
          expiresDate,
          verifyToken,
          status: "issued",
          issuedBy: input.issuedBy ?? null,
        })
        .returning();
      break;
    } catch (err) {
      // Only a certificate_code collision is safe to retry with a fresh code.
      // Any other unique violation (e.g. the (user, source) idempotency index)
      // must surface so the caller can treat it as a duplicate.
      const e = err as { code?: string; constraint?: string };
      const codeCollision =
        e?.code === "23505" &&
        (e.constraint?.includes("certificate_code") ?? false);
      if (codeCollision && attempt < 4) continue;
      throw err;
    }
  }

  if (!certificate) throw new Error("Failed to issue certificate");
  const cert = certificate;

  await createAuditLog({
    userId: input.issuedBy ?? input.userId,
    action: "certificate.issued",
    entityType: "certificate",
    entityId: cert.id,
    metadata: {
      certificateCode: cert.certificateCode,
      userId: input.userId,
      sourceType: input.sourceType,
      sourceId: input.sourceId ?? null,
      auto: input.issuedBy == null,
    },
  });

  // Async PDF generation (off the request path).
  await addCertPdfJob({ certificateId: cert.id });

  // Notify the holder (notification center + email).
  await createNotification({
    userId: input.userId,
    title: "Certificate issued",
    message: `Your certificate "${cert.title}" is ready. View it on your dashboard.`,
    type: "certificate",
    entityType: "certificate",
    entityId: cert.id,
    link: "/certificates",
    channels: ["in_app", "email"],
  }).catch((err) =>
    logger.error({ err, certId: cert.id }, "certificate notification failed"),
  );

  return cert;
}

export type AutoIssueResult =
  | { status: "issued"; certificate: Certificate }
  | { status: "reissued"; certificate: Certificate }
  | { status: "skipped"; reason: "no_config" | "disabled" | "duplicate" };

export interface AutoIssueDefaults {
  type?: string;
  title: string;
  careerTrack?: string | null;
  courseName?: string | null;
  internshipName?: string | null;
  durationText?: string | null;
  mentorId?: number | null;
}

/**
 * Auto-issue a certificate for a completed source entity, respecting the
 * per-source config (enabled / expiry / re-issue). Idempotent: a holder gets at
 * most one certificate per (sourceType, sourceId) unless allowReissue is set.
 */
export async function autoIssueForCompletion(args: {
  userId: number;
  sourceType: CertSourceType;
  sourceId: number;
  defaults: AutoIssueDefaults;
}): Promise<AutoIssueResult> {
  const { userId, sourceType, sourceId, defaults } = args;

  const config = await getAutoIssueConfig(sourceType, sourceId);
  if (!config) return { status: "skipped", reason: "no_config" };
  if (!config.enabled) return { status: "skipped", reason: "disabled" };

  const existing = await findExistingCertificate(userId, sourceType, sourceId);
  if (existing && !config.allowReissue) {
    return { status: "skipped", reason: "duplicate" };
  }

  if (existing && config.allowReissue) {
    const certificate = await renewCertificate({
      certId: existing.id,
      expiryMonths: config.expiryMonths,
    });
    return { status: "reissued", certificate };
  }

  try {
    const certificate = await issueCertificate({
      userId,
      sourceType,
      sourceId,
      type: config.certificateType ?? defaults.type ?? "course_completion",
      title: defaults.title,
      careerTrack: defaults.careerTrack ?? null,
      courseName: defaults.courseName ?? null,
      internshipName: defaults.internshipName ?? null,
      durationText: defaults.durationText ?? null,
      mentorId: defaults.mentorId ?? null,
      templateId: config.templateId ?? null,
      expiryMonths: config.expiryMonths,
      issuedBy: null,
    });
    return { status: "issued", certificate };
  } catch (err) {
    // A concurrent completion may insert the certificate between our existence
    // check and this insert; the DB idempotency index turns that race into a
    // unique violation, which we treat as a benign duplicate.
    if ((err as { code?: string }).code === "23505") {
      const dup = await findExistingCertificate(userId, sourceType, sourceId);
      if (dup) return { status: "skipped", reason: "duplicate" };
    }
    throw err;
  }
}

/**
 * Renew (re-issue) an existing certificate: refresh the issue date, recompute
 * expiry, restore issued status, and regenerate the PDF.
 */
export async function renewCertificate(args: {
  certId: number;
  expiryMonths?: number | null;
  issuedBy?: number | null;
}): Promise<Certificate> {
  const issuedDate = new Date().toISOString().slice(0, 10);
  const expiresDate = computeExpiresDate(args.expiryMonths);
  const [updated] = await db
    .update(certificatesTable)
    .set({ issuedDate, expiresDate, status: "issued" })
    .where(eq(certificatesTable.id, args.certId))
    .returning();
  if (!updated) throw new Error(`Certificate ${args.certId} not found`);

  await createAuditLog({
    userId: args.issuedBy ?? updated.userId,
    action: "certificate.renewed",
    entityType: "certificate",
    entityId: updated.id,
    metadata: { certificateCode: updated.certificateCode, expiresDate },
  });

  // Regenerate the PDF to reflect the new dates.
  await addCertPdfJob({ certificateId: updated.id });

  await createNotification({
    userId: updated.userId,
    title: "Certificate renewed",
    message: `Your certificate "${updated.title}" has been renewed.`,
    type: "certificate",
    entityType: "certificate",
    entityId: updated.id,
    link: "/certificates",
    channels: ["in_app", "email"],
  }).catch(() => {});

  return updated;
}

/** Revoke a certificate (admin / system). */
export async function revokeCertificate(args: {
  certId: number;
  reason?: string;
  revokedBy?: number | null;
}): Promise<Certificate | null> {
  const [updated] = await db
    .update(certificatesTable)
    .set({ status: "revoked" })
    .where(eq(certificatesTable.id, args.certId))
    .returning();
  if (!updated) return null;

  await createAuditLog({
    userId: args.revokedBy ?? updated.userId,
    action: "certificate.revoked",
    entityType: "certificate",
    entityId: updated.id,
    metadata: { certificateCode: updated.certificateCode, reason: args.reason },
  });

  await createNotification({
    userId: updated.userId,
    title: "Certificate revoked",
    message: `Your certificate "${updated.title}" has been revoked.`,
    type: "certificate",
    entityType: "certificate",
    entityId: updated.id,
    link: "/certificates",
    channels: ["in_app"],
  }).catch(() => {});

  return updated;
}

// Re-export for route convenience.
export { generatePdfForId, verifyUrlFor };
export async function getHolderName(userId: number): Promise<string> {
  const u = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, userId),
  });
  return u?.fullName ?? "FUTRSEC Learner";
}
