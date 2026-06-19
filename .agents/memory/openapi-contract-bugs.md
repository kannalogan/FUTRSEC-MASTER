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
