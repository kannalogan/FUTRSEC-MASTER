---
name: Assessment ← Question Bank mapping
description: How question-bank questions are attached to assessments and why it is a snapshot copy, not a live reference
---

Attaching a reusable question-bank entry to an assessment **copies** the question
text + options into `assessment_questions` / `assessment_options`, and records the
origin id in `assessment_questions.source_bank_question_id` (nullable, no hard FK).

**Why snapshot, not live FK:**
- Grading reads `assessment_questions`/`assessment_options` directly. A live join
  to the bank would change historic assessments whenever a bank entry is edited,
  corrupting already-taken attempts. Copying freezes the question at attach time.
- No FK so deleting/archiving a bank entry never cascades into or breaks an
  assessment. `source_bank_question_id` is provenance + analytics only.

**How to apply:**
- Only `status = 'approved'` bank questions may be attached; others are reported
  back as `skipped`. Attaching bumps `question_bank.usage_count`.
- New `assessment_questions.order` = `max(order)+1` per assessment (append).
- Two admin routes (not in OpenAPI — admin surface uses `apiFetch`, not Orval):
  `POST /admin/assessments/:id/questions/from-bank` ({bankQuestionIds[]}) and
  `.../auto-generate` ({careerTrack?,difficulty?,questionType?,count} → random
  approved pool via `order by random() limit count`).
- `points` on the copy comes from bank `marks`; bank has no per-option `order`
  fallback so use array index when null.
