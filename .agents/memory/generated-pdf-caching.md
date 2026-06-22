---
name: Generated-PDF reuse & object churn
description: Stored server-generated artifacts (cert PDFs) must be reused on download, not regenerated every time
---

Server-generated artifacts stored in object storage (e.g. certificate PDFs) must be streamed from the existing stored object on download. Only render+upload a new one when none is cached or the caller explicitly passes `regenerate=true`.

**Why:** the download path once called generate-and-store on every request, uploading a brand-new object each time. Each upload returns a fresh per-upload object path (GCS paths are not stable across writes), so the old object was orphaned — unbounded bucket growth and cost on every download/bulk-zip.

**How to apply:** use a `getOrGeneratePdf(cw, {regenerate})` helper that streams `cert.pdfObjectPath` via `storage.streamObject(...).arrayBuffer()` when present, falling back to generate on miss/empty/error. When you DO regenerate, capture the previous `pdfObjectPath` and best-effort `deleteObject` it after committing the new pointer. Explicit generate actions (bulk-generate) intentionally regenerate; download/bulk-download reuse.
