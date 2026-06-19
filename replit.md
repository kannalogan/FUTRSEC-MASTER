# FUTRSEC

A cybersecurity learning, mentorship, AI, and placement ecosystem for India. Users choose a security domain track (SOC, VAPT, GRC, etc.), complete a pre-assessment, and get a personalized learning journey from beginner to job-ready.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000/8080)
- `pnpm --filter @workspace/futrsec run dev` — run the frontend (port from $PORT)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only); always run `pnpm run typecheck:libs` after to rebuild declarations

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS v4, shadcn/ui, Wouter, Framer Motion
- API: Express 5 + pino logging
- DB: PostgreSQL + Drizzle ORM (`lib/db`)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec at `lib/api-spec/openapi.yaml`)
- Build: esbuild (CJS bundle for server)
- Auth: OTP + JWT (access + refresh tokens), RBAC (student / professional / mentor / admin)
- Event bus: `AppEventBus` (Node.js EventEmitter) in `artifacts/api-server/src/lib/events.ts`
- Queues: BullMQ in `artifacts/api-server/src/lib/queues.ts` (gracefully degrades without Redis)

## Where things live

- `lib/db/src/schema/` — Drizzle ORM schema (8 files: users, learning, assessments, dpdp, labs, jobs, assignments, ai)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for all API contracts)
- `lib/api-client-react/src/` — generated React Query hooks + Zod schemas (do not edit manually)
- `lib/api-zod/src/generated/api.ts` — Zod body schemas used by server routes
- `artifacts/api-server/src/routes/` — auth, consent, tracks, assessments, platform routes
- `artifacts/futrsec/src/pages/` — home, login, onboarding (consent → profile → tracks → assessment → complete), privacy
- `artifacts/futrsec/src/hooks/use-auth.tsx` — JWT token state + user context

## Architecture decisions

- Contract-first API: OpenAPI spec drives Zod schemas (server) and React Query hooks (client). Never write fetch calls manually.
- OTP stored in in-memory Map (no Redis dependency for auth). Redis is optional for BullMQ queues.
- DPDP compliance: immutable `consent_history` log, separate `data_delete_requests` / `data_correction_requests` tables, BullMQ workers for async processing.
- `@workspace/api-client-react` declares `@tanstack/react-query` as a peerDependency to avoid duplicate instances; the Vite config also dedupes React.
- After adding new Drizzle schema files, always run `pnpm run typecheck:libs` before artifact typechecks — stale lib declarations cause false "no exported member" errors.

## Product

- **Auth flow**: OTP login via email/phone → JWT access + refresh tokens → onboarding wizard (consent → profile → track selection → pre-assessment → complete)
- **Tracks**: 6 cybersecurity domains seeded — SOC Analyst, VAPT Professional, GRC Specialist, AI Security Engineer, Cloud Security Architect, Digital Forensics
- **Pre-Assessment**: 10-question MCQ/multi-select/true-false quiz to calibrate learner level
- **DPDP Privacy Center**: consent management, withdrawal, data deletion/correction requests (DPDP Act 2023 compliant)
- **Platform stats**: cached public endpoint for homepage metrics

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After adding new schema files to `lib/db/src/schema/`, run `pnpm run typecheck:libs` to rebuild lib declarations before checking artifact packages.
- API server uses `pnpm run build && pnpm run start` in dev — restart the workflow after editing any route files.
- CSS `@import url(...)` for external fonts must come **before** `@import "tailwindcss"` in Tailwind v4 / PostCSS.
- BullMQ queues (data export/deletion workers) gracefully degrade without Redis — jobs enqueued but not processed until Redis is provisioned.
- Do not run `pnpm dev` at workspace root — each artifact needs workflow-provided `PORT` and `BASE_PATH`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
