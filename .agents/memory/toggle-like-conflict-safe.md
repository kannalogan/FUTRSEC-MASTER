---
name: Conflict-safe like/toggle endpoints
description: Pattern for toggle endpoints backed by a unique (entity,user) row to avoid read-then-write 500 races.
---

# Conflict-safe like/toggle endpoints

Toggle endpoints (like/unlike, follow/unfollow) backed by a UNIQUE
(entity_id, user_id) index must NOT do read-then-insert. Concurrent or
double-click requests both read "no row", both insert, the second violates the
unique index → 500.

**Pattern:** attempt `insert(...).onConflictDoNothing().returning({id})`. If the
returning array is non-empty → newly liked. If empty (conflict) → it already
existed, so `delete` the row → unliked. Then recount with `count()` and write the
denormalized counter; the recount self-heals minor counter drift.

**Why:** removes the TOCTOU window; the DB unique index is the arbiter, not an
app-level read.

**How to apply:** any new toggle route with a unique pair constraint
(community_post_likes here) — use the insert-onConflict-else-delete shape.
