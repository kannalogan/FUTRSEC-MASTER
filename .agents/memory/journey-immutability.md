---
name: Journey published-immutability
description: Why journey/day/item write routes must enforce draft status server-side, not just in the UI.
---

# Journey published-immutability

Once a journey is published, students may auto-enroll and follow its timeline, so its structure must never change underneath them. Every structural write route (journey PATCH, day create/update/delete, item create/update/delete, item reorder) must reject mutation unless `journey.status === "draft"` (return 409). DELETE journey is blocked while `published` (must archive first); draft and archived are deletable.

**Why:** the builder UI gates editing with `editable = status === "draft"`, but that is bypassable — direct API calls could alter a live timeline after enrollment (broken-access-control / data-integrity gap caught in code review).

**How to apply:** there is a shared `assertDraft(status)` helper in `routes/journey.ts`. After the track-authorization check in any structural mutation route, call it and 409 on a non-null result. Lifecycle transitions (publish, archive) are intentionally exempt.
