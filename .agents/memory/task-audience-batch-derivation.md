---
name: Task audience batch derivation
description: Why publish-from-draft for batch-targeted tasks must re-load persisted batch IDs and re-validate ownership
---

# Task audience batch derivation & ownership

When a task (or any resource) targets a `specific_batches` audience, the audience
must be materialized into per-student assignment rows at **publish** time. Two
failure modes recur:

1. **Empty audience on publish-from-draft/scheduled.** The UI publishes an
   existing task by sending only `{action:"publish"}` — no `batchIds`. If the
   publish path defaults missing `batchIds` to `[]`, the audience resolves to
   zero students and nobody is assigned. **Fix:** when publishing a
   `specific_batches` task and the request omits batch IDs, re-load them from the
   persisted join table (e.g. `mentor_task_batches`) before materializing.

2. **Unvalidated client batch IDs.** Inserting client-supplied `batchIds` into
   the join table without checking each belongs to the caller is broken access
   control — a mentor could reference another mentor's batch. **Fix:** validate
   every submitted batch ID against ownership (`batches.mentorId === caller`) on
   both create and update; reject with 403 if any mismatch.

**Why:** mentor batch ownership lives on `batches.mentorId`; audience resolution
filters students via `mentor_students`, so a foreign batch ID silently resolves
to nobody at runtime but still persists a cross-mentor reference — a latent
data-integrity/authorization hole.

**How to apply:** any "publish a previously-saved targeted item" flow needs
(a) derive targets from persisted state when the request omits them, and
(b) re-validate ownership of any client-supplied target IDs on every mutation.
