---
name: Certificate auto-issuance idempotency
description: How duplicate certificates are prevented across completion events and concurrency
---

# Certificate idempotency

A learner gets at most one certificate per `(user_id, source_type, source_id)` for
auto-issued (non-manual) certificates.

**Rule:** idempotency is enforced at THREE layers, all required:
1. Emit-level: completion events fire only on the *transition* to complete (e.g.
   module 100% only when `!wasComplete`), never on repeat calls.
2. Service-level: `autoIssueForCompletion` checks `findExistingCertificate` first.
3. DB-level: partial unique index `certificates_user_source_uq` on
   `(user_id, source_type, source_id) WHERE source_type <> 'manual' AND source_id IS NOT NULL`.
   Manual certs are exempt so admins can issue freely (sourceId null).

**Why:** layers 1–2 still have a read-then-insert race under concurrent completion
events; only the DB index closes it. The partial predicate is essential — without
it, every manual cert (sourceId null / source_type 'manual') would collide.

**How to apply:**
- `issueCertificate` retry loop must retry ONLY on `certificate_code` collisions
  (check `err.constraint?.includes('certificate_code')`); any other `23505` must be
  rethrown, otherwise a true idempotency violation gets masked by 5 pointless code
  regenerations and then thrown anyway.
- `autoIssueForCompletion` wraps the insert in try/catch: on `23505` it re-fetches
  the existing cert and returns `{status:'skipped',reason:'duplicate'}` (benign).
- The auto-issue config table has its own unique index `cert_auto_issue_source_uq`
  on `(source_type, source_id)`; the PUT endpoint upserts via
  `insert().onConflictDoUpdate()` — never select-then-insert.
