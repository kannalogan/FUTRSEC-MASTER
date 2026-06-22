---
name: Certificate effective status & verify
description: Why every certificate read/verify path must compute expiry, not trust the stored status column
---

Certificate validity is `status === "issued" AND not past expiresDate`. The stored `status` column is NOT authoritative on its own — a certificate can be time-expired while still stored as "issued" (manual/scheduled sweep may not have run).

**Why:** the public verify endpoint and admin list once checked only `status === "issued"` and ignored `expiresDate`, so time-expired certificates verified as valid. This is an integrity bug — anyone can present an expired credential as current.

**How to apply:** any path that reads or reports certificate status (public `/certificates/verify/:token`, admin list, `/certificates/mine`, PDF render, analytics) must apply the same effective-status rule. Backend has `effectiveStatus(c)` in `certificates-pdf.ts` (revoked → revoked; past expiry → expired; else status). Public verify returns `{valid, reason}` where reason is "revoked"|"expired" so the UI can distinguish. The verify UI has 3 states: valid, expired (authentic-but-stale, amber), and not-verified (revoked/invalid, red).
