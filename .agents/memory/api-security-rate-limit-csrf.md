---
name: API rate limiting & CSRF posture
description: How rate limiting is wired behind the Replit proxy and why CSRF middleware is intentionally absent.
---

# API rate limiting & CSRF posture

**Rate limiting:** `express-rate-limit` v7. A global limiter is mounted on `/api`
and a stricter `authLimiter` is applied per-route to credential endpoints
(send-otp, verify-otp, login/password, forgot/reset-password, register/*).
Limits are env-gated: tighter in production, loose in dev so local curl/e2e
doesn't trip them. Limiters live in `lib/rate-limit.ts`.

**Trust proxy invariant:** `app.set("trust proxy", 1)` is REQUIRED for correct
per-client IP limiting — the app sits behind Replit's single reverse proxy, so
`req.ip` must come from X-Forwarded-For. **Why:** without it every request keys on
the proxy IP and the limiter throttles all users as one. This is safe ONLY while
there is exactly one trusted proxy hop; if topology changes (multiple proxies or
direct exposure) re-evaluate or X-Forwarded-For spoofing defeats the limiter.

**CSRF intentionally omitted.** Auth is stateless JWT bearer tokens in the
`Authorization` header — there are NO auth cookies/sessions anywhere in the
server. Browsers don't auto-attach bearer tokens cross-site, so classic CSRF
isn't applicable. Adding `csurf` (cookie/session-based) would be mismatched and
could break flows. **How to apply:** only add CSRF if the API ever moves auth
into cookies.
