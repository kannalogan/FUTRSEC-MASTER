import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Application-level signed URLs with expiry.
 *
 * Produces a shareable, time-limited token granting read access to a single
 * file without requiring the bearer to be authenticated. The token is an HMAC
 * over `fileId.expiresAt` keyed by SESSION_SECRET, so it cannot be forged or
 * extended. This is provider-agnostic: it works the same regardless of whether
 * the bytes live in GCS, S3, R2 or MinIO.
 */
function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is required to sign file URLs");
  return s;
}

export function signFileToken(fileId: number, ttlSec = 3600): {
  token: string;
  expiresAt: number;
} {
  const expiresAt = Date.now() + ttlSec * 1000;
  const payload = `${fileId}.${expiresAt}`;
  const sig = createHmac("sha256", secret()).update(payload).digest("hex");
  const token = Buffer.from(`${payload}.${sig}`).toString("base64url");
  return { token, expiresAt };
}

export function verifyFileToken(token: string): number | null {
  let decoded: string;
  try {
    decoded = Buffer.from(token, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const parts = decoded.split(".");
  if (parts.length !== 3) return null;
  const [fileIdRaw, expiresRaw, sig] = parts;
  const payload = `${fileIdRaw}.${expiresRaw}`;
  const expected = createHmac("sha256", secret())
    .update(payload)
    .digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;
  const fileId = Number(fileIdRaw);
  return Number.isInteger(fileId) ? fileId : null;
}
