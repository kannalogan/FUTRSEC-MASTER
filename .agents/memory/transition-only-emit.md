---
name: Emit-on-transition under concurrency
description: How to fire a one-shot side effect (event/cert/notification) exactly once when a row crosses into a terminal state, safe against concurrent writers.
---

# Emit-on-transition (exactly-once) pattern

When a side effect must fire only on the *transition* into a state (e.g. journey/course
"just completed" → emit completion event → auto-issue certificate), do NOT decide the
transition from a status field read *before* the transaction/lock. That value is stale and
two concurrent final completions can both see `status='active'` and both emit.

**Rule:** derive the transition from the **affected-row count of a status-guarded UPDATE
executed under the row lock**:
```
update X set status='completed', completedAt=now()
where id=? and status <> 'completed' returning id
-- justCompleted = returned.length > 0
```
Run it inside the same transaction that already holds `SELECT ... FOR UPDATE` on the row
(or the parent enrollment), so concurrent callers serialize and only the first flip returns a row.

**Why:** the certificate DB unique index stops duplicate *certs*, but duplicate *events /
audit logs / notifications* still leak if the emit guard relies on a pre-lock status read.
Verified: 5 concurrent final-item completions produced exactly one `journey.completed` audit
+ one certificate.

**How to apply:** any "X just completed / just transitioned" emit (journey, course,
career_roadmap, internship, subscription state) must gate on the guarded-update row count,
never on an outer/cached status value. Emit the event *after* the tx commits, inside the
`if (justCompleted)` block.
