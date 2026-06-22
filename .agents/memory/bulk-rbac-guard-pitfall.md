---
name: Bulk RBAC guard application pitfall
description: Why blanket-adding a role guard across all mutating routes in a file can break routes that already enforce a different role internally.
---

# Bulk RBAC guard application pitfall

When adding `requireRole(...)` to "all mutating routes" in a route file, do NOT
apply one role uniformly via regex/sed. Some routes in a student-facing file are
intended for a different role.

**Concrete case:** `learning.ts` is mostly student routes, but
`PATCH /learning/discussion/:postId/moderate` is mentor/admin-only and enforces
that with its own internal `if (!["mentor","admin"].includes(role)) 403`. Blanket
`requireRole("student")` on it produced a deadlock: middleware blocked
mentors/admins, the handler blocked students → no role could moderate.

**Why:** route file location (learning/labs) does not imply a single role; the
handler body is the source of truth for which role(s) a route serves.

**How to apply:** before bulk-applying a role guard, grep each target handler for
an internal role check and exclude/override those. Verify post-change with a
per-role curl matrix (expect 403 for disallowed, 2xx for allowed) — not just the
happy path.
