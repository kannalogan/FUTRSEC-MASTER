/**
 * File validation: content-type allowlist + per-type size limits.
 *
 * Supported categories (per product spec): PDF, images (PNG/JPG), Office docs
 * (DOCX/PPTX), CSV, archives (ZIP), packet captures (PCAP), video (MP4) and
 * security scripts. We validate BOTH the declared MIME type and the file
 * extension so a mislabeled upload is rejected.
 */

const MB = 1024 * 1024;

export interface FileTypeRule {
  label: string;
  mimes: string[];
  extensions: string[];
  maxBytes: number;
}

export const FILE_TYPE_RULES: FileTypeRule[] = [
  {
    label: "PDF",
    mimes: ["application/pdf"],
    extensions: [".pdf"],
    maxBytes: 50 * MB,
  },
  {
    label: "Image",
    mimes: ["image/png", "image/jpeg", "image/jpg", "image/webp"],
    extensions: [".png", ".jpg", ".jpeg", ".webp"],
    maxBytes: 25 * MB,
  },
  {
    label: "Document",
    mimes: [
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ],
    extensions: [".doc", ".docx", ".ppt", ".pptx"],
    maxBytes: 50 * MB,
  },
  {
    label: "CSV",
    mimes: ["text/csv", "application/csv", "text/plain"],
    extensions: [".csv"],
    maxBytes: 25 * MB,
  },
  {
    label: "Archive",
    mimes: ["application/zip", "application/x-zip-compressed"],
    extensions: [".zip"],
    maxBytes: 200 * MB,
  },
  {
    label: "PacketCapture",
    mimes: ["application/vnd.tcpdump.pcap", "application/octet-stream"],
    extensions: [".pcap", ".pcapng", ".cap"],
    maxBytes: 200 * MB,
  },
  {
    label: "Video",
    mimes: ["video/mp4"],
    extensions: [".mp4"],
    maxBytes: 500 * MB,
  },
  {
    label: "Script",
    mimes: ["text/plain", "application/x-sh", "application/octet-stream"],
    extensions: [".sh", ".py", ".ps1", ".js", ".rb", ".yara", ".yar"],
    maxBytes: 5 * MB,
  },
];

// Hard cap regardless of category.
export const ABSOLUTE_MAX_BYTES = 500 * MB;

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

export interface ValidationResult {
  ok: boolean;
  error?: string;
  rule?: FileTypeRule;
}

/**
 * Validate a declared upload against the allowlist. Returns the matched rule on
 * success so the caller can enforce the per-type size limit.
 */
export function validateUpload(input: {
  name: string;
  contentType: string;
  size: number;
}): ValidationResult {
  const ext = extOf(input.name);
  const mime = (input.contentType || "").toLowerCase();

  if (input.size <= 0) return { ok: false, error: "Empty file" };
  if (input.size > ABSOLUTE_MAX_BYTES)
    return { ok: false, error: "File exceeds maximum allowed size" };

  // Match by extension first (most reliable), then confirm MIME is plausible.
  const rule = FILE_TYPE_RULES.find((r) => r.extensions.includes(ext));
  if (!rule) {
    return {
      ok: false,
      error: `File type "${ext || mime || "unknown"}" is not allowed`,
    };
  }
  // octet-stream is a common generic fallback for pcap/script/zip — accept it.
  const mimeOk =
    rule.mimes.includes(mime) ||
    mime === "application/octet-stream" ||
    mime === "";
  if (!mimeOk) {
    return {
      ok: false,
      error: `Declared content type "${mime}" does not match extension "${ext}"`,
    };
  }
  if (input.size > rule.maxBytes) {
    return {
      ok: false,
      error: `${rule.label} files are limited to ${Math.round(
        rule.maxBytes / MB,
      )} MB`,
    };
  }
  return { ok: true, rule };
}
