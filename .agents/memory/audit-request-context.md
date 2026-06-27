---
name: Audit ip/user-agent via AsyncLocalStorage
description: How request-scoped ip/user-agent reach every audit log without threading req through call sites.
---

# Audit context (who/ip/ua) is request-scoped via AsyncLocalStorage

Audit log ip/user-agent is NOT plumbed through every call site. An express middleware
binds `{ipAddress: req.ip, userAgent: req.headers["user-agent"]}` into an AsyncLocalStorage
store for the request; the audit helper reads it as a fallback: explicit param wins, else
the async-context value, else undefined.

**Why:** there were ~189 audit call sites across route files, each with its own local
`ip(req)`/`getIp(req)` helper; ip was passed almost everywhere but user-agent at only ~2/3,
and some audit writers (e.g. a helper taking `studentId`, not `req`) had no request access at
all so captured neither. Editing every call site was high-churn and fragile. ALS fixes all
sites at once and naturally covers helpers that never see `req`.

**How to apply:**
- The middleware must mount immediately after `app.set("trust proxy", 1)` and before routes,
  so `req.ip` is the real client IP and the store wraps the whole handler chain.
- Background paths (BullMQ workers, event-bus handlers, startup tasks) run outside any request
  → no store → ip/ua correctly null. That is expected (no client behind them), not a bug.
- To override per call, still pass `ipAddress`/`userAgent` explicitly — explicit always wins.
- Do NOT reintroduce per-route manual user-agent plumbing; rely on the ALS fallback.
