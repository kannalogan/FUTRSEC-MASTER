import { inflateSync, inflateRawSync } from "node:zlib";
import { isIP } from "node:net";
import { lookup } from "node:dns/promises";
import { logger } from "../logger";

const MAX_BYTES = 6 * 1024 * 1024; // 6MB cap
const FETCH_TIMEOUT_MS = 12_000;

export interface ExtractedResume {
  text: string;
  source: "text" | "html" | "pdf" | "none";
  bytes: number;
}

/** Block SSRF: reject private / loopback / link-local / unique-local addresses. */
function isBlockedAddress(addr: string): boolean {
  const v = isIP(addr);
  if (v === 4) {
    const [a, b] = addr.split(".").map(Number);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true; // link-local
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    return false;
  }
  if (v === 6) {
    const lower = addr.toLowerCase();
    if (lower === "::1" || lower === "::") return true;
    if (lower.startsWith("fe80") || lower.startsWith("fc") || lower.startsWith("fd")) return true;
    if (lower.startsWith("::ffff:")) return isBlockedAddress(lower.replace("::ffff:", ""));
    return false;
  }
  return false;
}

/** Normalize common share links (Google Drive / Dropbox) to direct-download URLs. */
function normalizeShareUrl(raw: string): string {
  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase();
    if (host.includes("drive.google.com")) {
      const m = u.pathname.match(/\/file\/d\/([^/]+)/) || [null, u.searchParams.get("id")];
      const id = m[1];
      if (id) return `https://drive.google.com/uc?export=download&id=${id}`;
    }
    if (host.includes("dropbox.com")) {
      u.searchParams.set("dl", "1");
      return u.toString();
    }
    return raw;
  } catch {
    return raw;
  }
}

async function assertSafeUrl(raw: string): Promise<string> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error("Invalid URL.");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error("Only http(s) URLs are supported.");
  }
  const host = u.hostname;
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("That host is not allowed.");
  }
  // Resolve and validate every returned address against the SSRF block list.
  const literal = isIP(host);
  if (literal) {
    if (isBlockedAddress(host)) throw new Error("That address is not allowed.");
  } else {
    const records = await lookup(host, { all: true }).catch(() => []);
    if (records.length === 0) throw new Error("Could not resolve that host.");
    for (const r of records) {
      if (isBlockedAddress(r.address)) throw new Error("That host resolves to a blocked address.");
    }
  }
  return u.toString();
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Best-effort PDF text extraction with no external dependency:
 * inflate FlateDecode streams and pull text from (..)Tj / [..]TJ operators.
 * Covers the common case (text-based PDFs); image-only/scanned PDFs yield little.
 */
function extractPdfText(buf: Buffer): string {
  const pieces: string[] = [];
  const streamRe = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let m: RegExpExecArray | null;
  let foundStream = false;
  while ((m = streamRe.exec(buf.toString("latin1"))) !== null) {
    foundStream = true;
    const raw = Buffer.from(m[1], "latin1");
    let decoded = "";
    try {
      decoded = inflateSync(raw).toString("latin1");
    } catch {
      try {
        decoded = inflateRawSync(raw).toString("latin1");
      } catch {
        decoded = raw.toString("latin1");
      }
    }
    pieces.push(decoded);
  }
  const content = foundStream ? pieces.join("\n") : buf.toString("latin1");

  const out: string[] = [];
  // (text)Tj  and  (text)'  and  (text)"
  const tjRe = /\(((?:\\.|[^\\()])*)\)\s*(?:Tj|')/g;
  let t: RegExpExecArray | null;
  while ((t = tjRe.exec(content)) !== null) out.push(unescapePdf(t[1]));
  // [ (a) -250 (b) ] TJ
  const tjArrRe = /\[((?:[^\][]|\\.)*)\]\s*TJ/g;
  let a: RegExpExecArray | null;
  while ((a = tjArrRe.exec(content)) !== null) {
    const inner = a[1];
    const strRe = /\(((?:\\.|[^\\()])*)\)/g;
    let s: RegExpExecArray | null;
    const parts: string[] = [];
    while ((s = strRe.exec(inner)) !== null) parts.push(unescapePdf(s[1]));
    if (parts.length) out.push(parts.join(""));
  }
  return out.join(" ").replace(/\s+/g, " ").trim();
}

function unescapePdf(s: string): string {
  return s
    .replace(/\\n/g, " ")
    .replace(/\\r/g, " ")
    .replace(/\\t/g, " ")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
    .replace(/\\(\d{1,3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)));
}

const MAX_REDIRECTS = 5;

/**
 * Fetch with manual redirect handling so every hop (including 30x Location
 * targets) is re-validated against the SSRF block list. `redirect: "follow"`
 * would let a public URL bounce to an internal address, so we never use it.
 */
async function safeFetchFollow(startUrl: string, signal: AbortSignal): Promise<Response> {
  let current = await assertSafeUrl(startUrl);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetch(current, {
      redirect: "manual",
      signal,
      headers: { "User-Agent": "FUTRSEC-ResumeAnalyzer/1.0", Accept: "*/*" },
    });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) return res;
      const next = new URL(location, current).toString();
      current = await assertSafeUrl(next);
      continue;
    }
    return res;
  }
  throw new Error("Too many redirects.");
}

/** Fetch a resume URL and extract plain text. Never throws on parse — returns empty text. */
export async function fetchResumeText(rawUrl: string): Promise<ExtractedResume> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await safeFetchFollow(normalizeShareUrl(rawUrl.trim()), controller.signal);
    if (!res.ok) throw new Error(`Could not fetch the file (HTTP ${res.status}).`);

    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    const ab = await res.arrayBuffer();
    if (ab.byteLength > MAX_BYTES) throw new Error("File is too large (max 6MB).");
    const buf = Buffer.from(ab);

    const isPdf = contentType.includes("pdf") || buf.subarray(0, 5).toString("latin1") === "%PDF-";
    if (isPdf) {
      const text = extractPdfText(buf);
      return { text, source: "pdf", bytes: buf.length };
    }
    if (contentType.includes("html")) {
      return { text: stripHtml(buf.toString("utf8")), source: "html", bytes: buf.length };
    }
    // Treat everything else as text (txt, md, json, doc-as-text, etc.).
    const decoded = buf.toString("utf8");
    // Guard against binary noise (e.g. .docx zip) by checking printable ratio.
    const printable = decoded.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");
    if (printable.length / Math.max(1, decoded.length) < 0.6) {
      return { text: "", source: "none", bytes: buf.length };
    }
    return { text: decoded.replace(/\s+/g, " ").trim(), source: "text", bytes: buf.length };
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "Resume fetch/extract failed");
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
