---
name: Certificate distributed sharding & worker scaling
description: Correctness invariants for the sharded/horizontally-scaled cert generation pipeline (parent+shards, worker fleet, kill-recovery).
---

# Sharded certificate generation — distributed correctness

A bulk job is always a PARENT row + N SHARD rows (even N=1). Shards are enqueued
across `CERT_QUEUE_PARTITIONS` partition queues; `CERT_WORKER_REPLICAS` worker
instances per partition each process `CERT_WORKER_CONCURRENCY` shards in parallel;
`CERT_BULK_CONCURRENCY` is per-cert parallelism inside one shard; `CERT_SHARD_SIZE`
(default 1000) sets certs/shard. Admin pause/resume/cancel flags live on the PARENT
id; shard workers must check BOTH own and parent flags.

## Invariants that bit us (keep them true)

- **No silent work loss on partial enqueue.** When a shard fails to enqueue
  (Redis hiccup), the shard row must be written `failed` with `failed=total`,
  `processed=total`, `failedIds=slice` — NOT left at zero. Otherwise the parent
  aggregate (which sums shard rows and derives status) can report `completed`
  with `processed < total` and no failedIds, so retry can't recover the slice.
  **Why:** parent status is derived from shard statuses; a not-all-failed set
  yields `completed`. Accounting must cover every cert or work vanishes.

- **Parent aggregation must be monotonic on terminal state.** `recomputeParent`
  is called concurrently by many shard workers (read-then-write, last-writer-wins).
  A slow worker writing a stale `running` snapshot can revert an already-terminal
  parent. Guard the UPDATE: terminal writes always apply; non-terminal writes
  only apply when the current status is NOT already terminal
  (`notInArray(status, TERMINAL)` in the WHERE). The GET-detail path also
  recomputes, so the dashboard converges even if a persisted row lags briefly.

- **Worker heartbeat must count concurrent jobs.** With concurrency > 1 a worker
  runs several shards; finishing one must NOT flip it to `idle`. Track
  `activeJobs` (increment on `active`, decrement on `completed`/`failed`), only
  report `idle`/clear `currentJobId` when it hits 0.

- **Worker IDs must include host identity** (`hostname:pid:p:r`), not pid-only,
  or replicas on different machines collide on the shared `cert:workers` Redis
  hash. Note: changing the ID format leaves old-format ghosts in the hash that
  read as `dead` until pruned (PRUNE ~5min) — cosmetic, self-heals.

## Kill-recovery (verified honestly)

Hard SIGKILL of the api-server mid-job: BullMQ stalled-job detection
(`stalledInterval`/`maxStalledCount`, `attempts` with backoff) re-delivers the
in-flight shards after restart. A re-delivered shard re-runs from its start;
this is SAFE because `generatePdfForId` only overwrites `pdf_object_path` on the
existing cert row — it never inserts, so there are zero duplicate cert rows and
zero lost certs. Re-rendering does orphan the prior PDF object in storage
(superseded path is best-effort deleted on the next successful render).
