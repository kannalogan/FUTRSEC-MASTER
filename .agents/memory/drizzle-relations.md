---
name: Drizzle relations
description: Where relations are defined and how to add new ones
---

All Drizzle `relations()` definitions live in `lib/db/src/schema/relations.ts` and are exported from `lib/db/src/schema/index.ts`.

This file imports from all 8 schema files and defines bidirectional relations for every FK in the schema. It enables the `db.query.*` API for type-safe joins.

**Why:** Relations were added in a single dedicated file to avoid circular imports between individual schema files (e.g., users.ts importing from learning.ts).

**How to apply:** When adding a new table with FKs, add its relation definitions to `relations.ts`. After adding, run `pnpm run typecheck:libs` to rebuild lib declarations. Relations do NOT require a DB push (they're TypeScript-only metadata).
