import { eq } from "drizzle-orm";
import {
  db,
  certificatesTable,
  certificateTemplatesTable,
  usersTable,
  type Certificate,
} from "@workspace/db";
import { getStorageProvider } from "../storage/provider";
import { renderCertificatePdf } from "./pdf";

const storage = getStorageProvider();

export function publicBaseUrl(): string {
  const domains = process.env.REPLIT_DOMAINS;
  if (domains) {
    const first = domains.split(",")[0]?.trim();
    if (first) return `https://${first}`;
  }
  return "";
}

export function verifyUrlFor(verifyToken: string): string {
  return `${publicBaseUrl()}/verify/${verifyToken}`;
}

/** Compute the effective status, accounting for an elapsed expiry date. */
export function effectiveStatus(
  c: Pick<Certificate, "status" | "expiresDate">,
): string {
  if (c.status === "revoked") return "revoked";
  if (c.expiresDate && new Date(c.expiresDate).getTime() < Date.now()) {
    return "expired";
  }
  return c.status;
}

export interface CertWithHolder {
  cert: Certificate;
  holderName: string;
}

export async function loadCertWithHolder(
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
 * Render the PDF for a certificate, store it, and persist the object path.
 * Each render yields a fresh object path; the superseded object is deleted
 * after the new one commits to avoid orphaning objects in the bucket.
 */
export async function generateAndStore(
  cw: CertWithHolder,
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
      // Best-effort cleanup; a failed delete must not fail generation.
    }
  }

  return { buffer, objectPath };
}

/**
 * Return the certificate PDF bytes, reusing the already-stored object when one
 * exists. Only renders (and uploads) a new PDF when none is cached or the
 * caller explicitly requests regeneration.
 */
export async function getOrGeneratePdf(
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
  const { buffer } = await generateAndStore(cw);
  return buffer;
}

/** Generate and store the PDF for a certificate id. Used by the bulk worker. */
export async function generatePdfForId(id: number): Promise<void> {
  const cw = await loadCertWithHolder(id);
  if (!cw) throw new Error(`Certificate ${id} not found`);
  await generateAndStore(cw);
}
