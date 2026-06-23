---
name: Lesson content authoring & quiz snapshot
description: How admin authors lesson video/article/quiz/resources, and the snapshot rules for building a lesson quiz from an assessment or the question bank
---

A lesson has one optional video block, one article block, one quiz, and many
resources. Admin authoring routes live in `admin-courses.ts` (admin-guarded,
audit-logged); they are NOT in OpenAPI, so the frontend uses `apiFetch`, not Orval.

**Quiz is always a snapshot copy** into `lesson_quiz_questions`, never a live
reference to the source assessment/bank.

**Why snapshot:** the player grades against `lesson_quiz_questions` directly. A
live join would mutate already-taken quizzes whenever the source is edited.

**How to apply:**
- Only choice-based types (mcq / multi_select / true_false / scenario) can become
  a lesson quiz. Code/practical and any option-less question are reported as
  `skipped`, never inserted.
- `correctAnswers` is stored as 0-based option indices (array), `options` as a
  string[]; map from source option rows in `order`.
- `lesson_quizzes.sourceType` records origin ("assessment" | "question_bank").
  When switching to question_bank, **also null out `sourceAssessmentId`** or
  stale assessment provenance lingers. from-assessment *replaces* all quiz
  questions; from-bank *appends*.
- Bump `question_bank.usage_count` only for IDs **actually inserted** (exclude
  option-less skips), not the whole validated set, or analytics inflate.

**Video normalization (backward compat):** the student `learning.ts` lesson-detail
route reshapes the raw video row into `{provider,url,title,description,
thumbnailUrl,transcript,durationSeconds}`. `provider` falls back to URL-host
inference (youtube/vimeo/bunny/s3/url) for legacy rows where the column is null;
youtube/vimeo render as an iframe embed, everything else as a `<video>` tag.
