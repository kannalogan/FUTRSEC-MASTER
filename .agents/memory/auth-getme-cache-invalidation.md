---
name: Auth /auth/me cache invalidation
description: Why the auth context must clear the getMe query cache on every token change, or approved tpo/employer get trapped on the pending screen.
---

# Auth gating must never serve a stale /auth/me

The frontend approval gate (RoleRoute) keys on `user.approvalStatus`, which comes
from `useGetMe` (`/auth/me`) in `use-auth.tsx`. The server reads `approvalStatus`
live from the profile tables on every call, so the backend is always correct.

**The trap:** `useGetMe` uses a STATIC query key and the app QueryClient sets a
multi-minute `staleTime`. `setToken`/`logout` only touched localStorage + state.
So a cached `user` (e.g. a tpo/employer that was `pending` earlier) survives a
logout→login within the SAME SPA session (no full page reload) and RoleRoute
redirects the now-approved account back to `/onboarding/pending`. A fresh browser
context (or hard reload) hides the bug — which is why curl/API tests and
fresh-context E2E all passed while real users still saw "Application Under Review".

**Fix (durable rule):** any auth-gating query (`/auth/me`) must reflect live
server state on every session transition:
- On token change (login AND logout), call
  `queryClient.removeQueries({ queryKey: getGetMeQueryKey() })`.
- Set `staleTime: 0` + `refetchOnMount: "always"` on the `useGetMe` gate query.

**Why:** approval/role can change server-side between two logins in one tab; a
cached identity is a security/correctness gate, not display data — it must be
revalidated, never served stale.

**How to apply:** whenever you add or change auth/session state that drives route
guards, invalidate the identity query on the state transition. Do not rely on
`refetchOnWindowFocus` or default `staleTime` to eventually correct it.
