---
name: Certificate bulk generation scalability ceiling
description: Measured runtime cost of cert PDF generation and the resulting limits on synchronous bulk endpoints
---

Certificate PDF generation costs ~2.3s per certificate at runtime (measured), dominated by object-storage round-trips (render + QR encode + upload, all serial inside the request handler). Cached single download is ~1.2s; regenerate is ~3.4s (caching gives ~2.9x speedup and is confirmed working via `pdfObjectPath`).

**Why:** The `bulk-generate` / `bulk-download` handlers loop certs serially and do a storage round-trip each. At ~2.3s/cert this means 100≈227s, 1000≈38min, 5000≈189min — synchronous calls at 100+ scale will exceed HTTP/proxy timeouts. The Zod cap is `.max(500)` per call, so 1000/5000 already require client-side batching.

**How to apply:** For any "generate N certificates" feature at enterprise scale, move generation to the existing BullMQ queue (background job + progress polling), not the synchronous request path. Treat bulk-generate of >~30 certs as needing async handling. Do not raise the 500 cap without first making generation async.

Note: bulk generation is the **admin-initiated** path. Automatic per-learner issuance also
exists via the event bus → autoIssueForCompletion (course/journey/lab_series/career_roadmap/
internship) — see certificate-completion-sources.md. These are separate paths; both write to
the same certificates table and share the same idempotency index.
