---
name: Bulk certificate generation performance ceiling
description: Measured throughput limits of the BullMQ bulk cert worker and why
---

# Bulk certificate generation perf

Per-cert cost is dominated by **network I/O** to object storage (render PDF →
uploadBuffer → setAcl → DB update → temp delete via Replit GCS fetch), NOT CPU —
pdfkit uses built-in Helvetica (no font-file load), so render is cheap.

**Measured (single-process dev, INNER_CONCURRENCY tuned via `CERT_BULK_CONCURRENCY`):**
- concurrency 20 → ~268 ms/cert; 100 certs ≈ 26.8 s
- concurrency 40 → ~232 ms/cert; 100 certs ≈ 23.2 s (diminishing returns — I/O floor)

Targets (100<20s, 1000<2min, 5000<10min) are NOT met in a single worker process.
Extrapolated at ~230 ms/cert: 1000 ≈ 3.9 min, 5000 ≈ 19 min.

**Why:** one bulk job runs in ONE worker; `CERT_WORKER_CONCURRENCY` (default 5) only
parallelizes across *separate* jobs, not within a job. The per-cert I/O floor caps a
single process.

**How to apply / path to targets:** shard a large job into N sub-jobs across the 5
workers (not implemented), and/or scale worker replicas. Bumping in-job concurrency
past ~40 gives little because it's I/O-bound on the storage backend's round-trip
latency, not local CPU.
