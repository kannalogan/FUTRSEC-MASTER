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
