---
name: Assessment attempt allocation & retry-cap integrity
description: Why attempt creation must be atomic + single-in-progress, and how the retry limit is actually enforced across /start and legacy /submit.
---

# Assessment attempt allocation

The retry cap (`maxAttempts` on the assessment, plus any mentor-task caps, min of all)
is enforced **only** through the single shared allocator `acquireAttempt(userId, assessment)`
in `routes/assessments.ts`. Both `POST /assessments/:id/start` and the legacy
`POST /assessments/:id/submit` (no `attemptId`) go through it.

## The invariant
At most **one** in-progress attempt exists per (user, assessment) at any time.
`acquireAttempt` runs in a transaction holding `pg_advisory_xact_lock(userId, assessmentId)`
and: (1) resumes the existing in-progress attempt if present, else (2) rejects when the
finished-attempt count (`submitted` + `auto_submitted`) has reached the limit, else (3) creates one.

**Why:** finalized attempts can only ever consume the single in-progress attempt, and a new
in-progress attempt is created only when `used < limit`. So finalized count can never exceed the cap.

## The bug this prevents (regression guard)
Earlier, legacy `/submit` *unconditionally created* a new in-progress attempt while only
checking the finished count, and `/start` only resumed the latest in-progress one. A student
could: open attempt A via `/start`, submit a legacy attempt (created B, finalized B), then
submit A by `attemptId` — finalizing **more** attempts than `maxAttempts`. Read-then-insert
was also non-atomic, so concurrent `/start` calls could each see capacity and over-allocate.

**How to apply:** never bypass `acquireAttempt` to create an attempt row. Any new
take/submit entry point must call it. Counting in-progress attempts toward the cap is wrong —
count only finished states; the single-in-progress invariant (not the count) is what bounds it.
Finalize stays safe via `gradeAndFinalizeAttempt`'s `FOR UPDATE` + in-progress status gate
(returns null → 409 on an already-finalized attempt), so a manual submit racing a security
auto-submit can never double-finalize.
