---
name: Certificate completion-source mapping
description: Which completion events exist and how each maps to the data model
---

# Certificate completion sources

The certificate engine supports source types: course, journey, learning_path, lab_series,
career_roadmap, internship, manual. Not all map to a distinct entity in this
codebase — here is the honest mapping (event handlers exist for all in events.ts):

- **course** → module 100% completion (learning.ts lesson-complete route). Wired.
- **journey** → emitted in student-journey.ts when a student completes the final required
  item and the day-based journey transitions active→completed (`journeyId = journey.id`).
  Wired. source_type is a plain text column so no enum migration was needed; idempotency
  reuses the existing `(user_id, source_type, source_id)` partial unique index. The emit
  is exactly-once under concurrency — see transition-only-emit.md (guarded UPDATE row count
  under FOR UPDATE lock, NOT a pre-lock status read).
- **lab_series** → emitted on finishing a lab (labs.ts finishLab), `seriesId = labId`.
  There is no multi-lab "series" entity; a lab IS the series unit. Wired.
- **career_roadmap** → emitted in learning.ts ONLY when every published module in the
  learner's track is complete (`roadmapId = trackId`). Derived, not a stored flag.
  Wired. Gate carefully: must NOT fire after a single module when the track has many.
- **internship** → emitted in placement.ts when an application reaches `hired` AND a
  placement is created AND `job.type === 'internship'` (`internshipId = job.id`). Wired.
- **learning_path** → intentionally UNWIRED. No distinct "learning path" entity exists;
  it overlaps track/roadmap. Handler is present but nothing emits it (wiring it would
  double-issue against course/career_roadmap). This is a product-model decision.

**Why:** roadmaps and learning paths are derived views over module completion, not
standalone records with their own completion state. Don't invent a trigger for
learning_path without a product decision on what "path complete" means.
