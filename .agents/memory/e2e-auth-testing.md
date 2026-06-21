---
name: E2E auth testing for OTP-only accounts
description: How to log the Playwright test agent into auth-gated pages when the app only supports OTP login.
---

# Logging the test agent into auth-gated pages

FUTRSEC login is OTP-by-default (OTP lives in an in-memory Map, not the DB), so the
Playwright test agent **cannot** complete a normal login — it can't read the OTP from
server logs or the DB.

**Workaround for e2e/visual verification of role-gated pages (mentor/tpo/employer/admin):**
1. Pick a dev seed account for the role (e.g. a `*@futrsec.dev` test user).
2. Give it a password: generate a bcrypt hash from a package that has `bcryptjs`
   (e.g. `cd artifacts/api-server && node -e "require('bcryptjs').hash('<pw>',10).then(console.log)"`)
   then `update users set password_hash = '<hash>' where id = <id>`. (The sandbox root
   can't `import('bcryptjs')` — run it from a package that depends on it.)
3. In the test plan: `[API]` POST `/api/auth/login/password` `{email,password}` → returns
   `{accessToken,...}`; then `[Browser]` `localStorage.setItem('futrsec_token', <accessToken>)`
   and navigate. `setAuthTokenGetter` reads that key so all hooks attach the auth header.

**Theme:** localStorage key `futrsec-theme` = `light|dark|system` (applied on reload) to
verify both themes.

**Why:** OTP-only auth blocks the standard test-login path; this is the reliable way to
screenshot/verify gated portals. Never store the actual test password in memory.
