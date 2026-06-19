---
name: Redis graceful degradation
description: Pattern for BullMQ workers to degrade cleanly when Redis is unavailable at startup
---

Pattern used in `artifacts/api-server/src/lib/redis.ts` + `src/app.ts`:

1. `connectRedis()` in `app.ts` calls `_client.connect()` with `lazyConnect: true` and `retryStrategy` returning `null` after 3 retries.
2. If connect fails, logs a WARN and returns `false`.
3. `app.ts` only calls `startWorkers()` if `connectRedis()` returns `true`.
4. `safeAddJob()` in `queues.ts` wraps every queue.add() in try/catch — if Redis is down, job addition fails silently with a WARN log (no crash).
5. `createWorker()` still creates workers normally — BullMQ handles connection retries internally.

**Why:** Redis is optional for Part 1. BullMQ should not crash the server if Redis is unavailable. Queue jobs are lost without Redis, which is acceptable in dev. In production, Redis must be provisioned before deploying.

**How to apply:** Set `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` env vars when provisioning Redis. The server will auto-detect and start workers on next restart.
