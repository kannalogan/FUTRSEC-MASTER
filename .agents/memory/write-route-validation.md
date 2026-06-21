---
name: Write-route input & eligibility validation
description: Mutating endpoints must validate IDs, existence, and track/role eligibility before inserting
---

Mutating endpoints (POST/PUT) that take a path/body id and write to the DB must, before the insert:
1. Coerce + validate the id (`Number.isInteger(id) && id > 0`), else 400.
2. Look up the target row; if missing or not published/active, 404.
3. Enforce eligibility — e.g. the row's `trackId` must match the user's `selectedTrackId` (403 otherwise).
4. Guard against duplicates where a single submission is expected (409).

**Why:** A naive `db.insert(...).values({ fooId: Number(req.params.id), ... })` is a broken-access-control bug — it lets a user write against rows they can't see (other tracks) or against ids that don't exist. Found in `platform-extended.ts` `/assignments/:id/submit`.

**How to apply:** Apply to every new mutating route in `artifacts/api-server/src/routes/`, especially the platform-extended handlers that mirror the read-side track filtering already present on the matching GET endpoints.
