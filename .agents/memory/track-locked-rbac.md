---
name: Track-locked RBAC
description: How career-track access control is enforced across FUTRSEC APIs and the career_track vs selected_track_id relationship.
---

# Track-locked RBAC

`users.career_track` (enum soc/vapt/grc) is the **source of truth** for track-based authorization. `selected_track_id` is kept only for existing FK joins.

**Why:** the product locks a student to one domain chosen once at onboarding. A student's track is **IMMUTABLE** — there is NO track-switch API or UI. `PATCH /admin/students/:id/track` is neutralized to `403 {error:"Student track is immutable", code:"TRACK_IMMUTABLE"}`. RBAC decisions key off the immutable domain, not the FK.

**How to apply:** any track-scoped endpoint must guard before returning data/acting. Helpers live in `artifacts/api-server/src/lib/track-access.ts`:
- `checkTrackQueryAccess` — for endpoints taking a `?track=<slug>` query param.
- `checkResourceTrackAccess(role, userId, resourceTrackId)` — for resource-by-ID endpoints; resolves the resource's owning track and compares its `domain` to the user's `career_track`.
- `checkJobTrackAccess(role, userId, job.requiredTracks)` — jobs scope by `requiredTracks` (empty array = open to all). **`requiredTracks` is dual-format: legacy seed jobs store track SLUGS (`soc-analyst`), admin-authored postings store DOMAINS (`soc`).** Always authorize jobs via `getUserTrackIdentifiers(userId)` → `{domain, slug}|null` and `jobMatchesTrack(requiredTracks, ids)` (both exported from track-access.ts), which match against EITHER form. Resolve track from `career_track` first (never `selectedTrackId` alone — slug-only matching misses domain-form postings), and DENY when the track is indeterminate.

**Every job-returning path must apply this matcher, not just by-ID guards.** `GET /jobs`, `job-agent` recommendations, AND `GET /job-agent/saved` each re-filter results (deny-by-default: null ids → only open jobs). **Why:** saved/cached rows can hold cross-track job IDs from inconsistent or pre-isolation data; returning them unfiltered leaks cross-track jobs even though the by-ID guard is correct.

All return `null` when allowed, or an error string → respond `403`. Admins always bypass; untracked resources (null trackId) are open. **`checkResourceTrackAccess` DENIES (403) a non-admin whose track is indeterminate** — it resolves the effective track from `career_track` first, then falls back to `selected_track_id`'s domain, and only if BOTH are null does it deny. **Why:** a null-`career_track` user previously degraded open and could read any track's resource-by-ID (broken-access-control found in review). Do not revert resource-by-ID guards to degrade-open.

**Critical:** when adding ANY new track-scoped resource-by-ID route (labs, learning modules/lessons, jobs, future placements/mock-interview/ai), add the matching guard. The list endpoints alone are not enough — direct-ID GET/POST routes were the broken-access-control gap found in review.

**List endpoints (`?track=` query) are ALSO a leak vector — two pitfalls found in review:** (1) pass the **effective** track to `checkTrackQueryAccess`, i.e. `getUserCareerTrack(userId)` (exported from track-access.ts), NOT raw `user.careerTrack` — most users have `careerTrack=null` + only `selectedTrackId`, so the raw field lets a cross-track `?track=` slip past the guard. (2) Deny-by-default: a non-admin with no determinable effective track must `403`, and the "no track resolved → list ALL labs" fallback must be **admin-only** (else null-track / careerTrack-without-selectedTrack users get the full cross-track catalog). Resolve the filter track by `domain === effectiveTrack` (domain↔track is 1:1 for soc/vapt/grc), not by selectedTrackId alone.

There is intentionally NO endpoint or UI that mutates a student's `career_track` — see the immutability note at the top. Do not add one.
