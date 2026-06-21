---
name: Track-locked RBAC
description: How career-track access control is enforced across FUTRSEC APIs and the career_track vs selected_track_id relationship.
---

# Track-locked RBAC

`users.career_track` (enum soc/vapt/grc) is the **source of truth** for track-based authorization. `selected_track_id` is kept only for existing FK joins and must stay consistent with `career_track` (admin track-change updates BOTH).

**Why:** the product locks a student to one domain chosen once at onboarding; switching is admin-only with an audit log. RBAC decisions key off the immutable domain, not the FK.

**How to apply:** any track-scoped endpoint must guard before returning data/acting. Helpers live in `artifacts/api-server/src/lib/track-access.ts`:
- `checkTrackQueryAccess` — for endpoints taking a `?track=<slug>` query param.
- `checkResourceTrackAccess(role, userId, resourceTrackId)` — for resource-by-ID endpoints; resolves the resource's owning track and compares its `domain` to the user's `career_track`.
- `checkJobTrackAccess(role, userId, job.requiredTracks)` — jobs scope by an array of allowed track **slugs**; empty array = open to all.

All return `null` when allowed, or an error string → respond `403`. Admins always bypass; untracked resources (null trackId) and users without a career_track are allowed (degrade open, consistent across all three helpers).

**Critical:** when adding ANY new track-scoped resource-by-ID route (labs, learning modules/lessons, jobs, future placements/mock-interview/ai), add the matching guard. The list endpoints alone are not enough — direct-ID GET/POST routes were the broken-access-control gap found in review.

Admin track-change response (`PATCH /admin/students/:id/track`) must always return the full `AdminStudent` shape (incl. id, onboardingStep, isActive, createdAt) even on the unchanged-track early return, to satisfy the OpenAPI `ChangeTrackResult` contract.
