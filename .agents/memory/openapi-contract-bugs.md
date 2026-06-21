---
name: OpenAPI contract bugs
description: Known patterns where the OpenAPI spec and frontend/route diverged — to avoid recurrence
---

Three contract mismatches were fixed:

1. **AssessmentQuestion fields**: OpenAPI used `questionText`/`questionType`, frontend expected `.text`/`.type`. Fix: rename to `text`/`type` in OpenAPI spec, update route to return `{ text: q.questionText, type: q.questionType }`.

2. **AssessmentOption fields**: OpenAPI used `optionText`, frontend expected `.text`. Fix: rename to `text` in spec, route returns `{ text: option.optionText }`.

3. **TrackSelectionInput**: OpenAPI had `trackId: integer`, frontend sent `trackSlug: string`. Fix: change spec to `trackSlug: string`, route looks up track by slug then uses its ID.

4. **ProfileCompletionInput**: missing `role` field. Frontend sends `role: "student" | "professional" | "mentor"`. Stored as `currentRole` in `studentProfilesTable`.

**Why:** The OpenAPI spec and frontend were written at different times without a shared review step.

**How to apply:** After any OpenAPI spec change, run `pnpm --filter @workspace/api-spec run codegen` to regenerate Zod schemas and React Query hooks. Always check that route return shapes match generated TypeScript types before shipping.

## AI + DPDP endpoints are NOT codegenned — ad-hoc apiFetch only

The AI (`/ai/*`) and several DPDP/consent endpoints are called via ad-hoc `apiFetch`, not generated hooks, so TypeScript does NOT catch path/shape drift. Verified gotchas:

- Data export button must hit `POST /api/dpdp/download-request` (NOT `/consent/request-download`). It dedups: 202 on first request, 429 while one is pending.
- Consent withdraw `consentType` enum is camelCase: `thirdParty` (NOT `third_party`), matching `ConsentWithdrawInputConsentType`.
- `GET /api/consent/history` returns a bare array, not `{ history: [...] }`.
- `GET /api/consent/cookies` + `POST` shape: `{ necessary(always true), analytics, marketing, functional, updatedAt }`; POST writes a consent_history row.
- Career `report`/`placement-readiness` return `context` carrying `trackSlug`; frontend reads `context.trackName`, so the route must add `trackName` into the context object.

**How to apply:** When wiring any `/ai/*` or `/consent|/dpdp` call from the frontend, open the route handler and copy the exact path + response shape — do not trust intuition, there is no compiler check.
