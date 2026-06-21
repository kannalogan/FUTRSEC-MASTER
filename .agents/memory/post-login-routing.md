---
name: Post-login routing
description: Role-based landing paths and the student onboardingStep nuance that bit us
---

All post-login redirect decisions go through `artifacts/futrsec/src/lib/auth-routing.ts`
(`landingPathForRole`, `postLoginPath`). Login and OTP-verify both call `postLoginPath(data.user)`.

**Rule:** non-student roles must NEVER land on `/dashboard` (student). Each role has one
canonical landing path; unknown/missing role → `/login` (forces re-auth, not student dashboard).

**Why / gotcha:** the auth user's `onboardingStep` is the trap for students:
- `complete` → `/dashboard`
- a brand-new student has a **missing/null** `onboardingStep` and must start at `/onboarding/consent`.
So in `postLoginPath`, map `complete` explicitly to the dashboard and let the `default`
(missing step) fall through to consent. Defaulting missing→dashboard silently skips onboarding
for new signups (regression). `pending_approval` (runtime-only value, not in the generated enum)
→ `/onboarding/pending` and applies before the student branch.

**Guards:** `RoleRoute({component, allow})` in App.tsx enforces exact role match and redirects
wrong-role users to `landingPathForRole(user.role)` (not a Forbidden page), which also makes a
hard refresh preserve the correct role's page.

## Approval gate (tpo / employer)

**Source of truth = live `approvalStatus`, NOT `onboardingStep`.** tpo/employer approval is read
fresh from `tpo_profiles`/`employers` by an async `serializeUser` in `auth.ts` on every auth
response (login, verify-otp, refresh, /auth/me, complete-profile, select-track). JWT carries only
userId+role, so the user object is re-fetched each request → a refresh after admin approval
immediately unlocks the dashboard.

**Why:** the original bug was two sources of truth — consent set `onboarding_step="pending_approval"`
(which drove the frontend pending page) but admin approval only flipped profile `approval_status`,
never reconciling the user row, so users were stuck on "Application Under Review" forever.

**How to apply:** route tpo/employer through `approvalGatePath(role, approvalStatus)`:
approved→`landingPathForRole`, rejected→`/onboarding/rejected`, else→`/onboarding/pending`.
`postLoginPath` and `RoleRoute` both use it; pending/rejected pages redirect out when status
changes. Never gate tpo/employer on `onboardingStep` again — legacy approved users still have
`onboarding_step="pending_approval"` in the DB and are unblocked only via `approvalStatus`.
Admin approval also sets `onboarding_step="complete"` for new approvals, but correctness must not
depend on that field.
