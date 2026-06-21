---
name: Express route ordering collisions
description: Why new /jobs/* sub-routes 404'd or returned "Invalid jobId" in the FUTRSEC API
---

# Express param routes swallow sibling static paths

The jobs router registers `GET /jobs/:jobId` (and `/jobs/:jobId/apply`). It is
mounted BEFORE `platform-extended` in `routes/index.ts`. Any new static path that
shares the `/jobs/` prefix (e.g. `/jobs/internships`, `/jobs/offers`) gets matched
by `/jobs/:jobId` first, so `jobId` becomes `"internships"` → `isNaN` → 400
`{"error":"Invalid jobId"}`.

**Why:** Express matches routes in registration order; a `:param` segment matches
any string, including words you intended as static sub-paths on a router mounted later.

**How to apply:** When adding a new collection-style endpoint, do NOT nest it under
an existing `/:param` prefix unless you register it on the SAME router before the
param route. Prefer a non-colliding top-level path: `/internships`, `/offers`,
`/lab-reports`, `/ctf`, `/sandbox`, `/vms` were all chosen this way to avoid the
`/jobs/:jobId` and `/labs/:labId` param catches. Frontend route paths
(`/jobs/offers` in wouter) can still differ from the API path (`/api/offers`).
