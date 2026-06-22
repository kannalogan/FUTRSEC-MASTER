---
name: Job-match score determinism
description: Why the AI job-match score must stay deterministic and how the two endpoints share one engine
---

# Job-match score determinism

The match **score**, `breakdown`, `missingSkills`, and `recommendations` always come
from the deterministic 7-component `heuristicMatch` in `lib/ai/job-match.ts`. The
optional LLM pass inside `computeMatch` may ONLY rewrite the human-readable
`reasons` prose — it must never compute or override the numeric score.

**Why:** an earlier version let the LLM return its own `score`, which made the
output non-deterministic across runs and let the two endpoints that score jobs
(`/job-agent/recommended` via `computeMatch` and `/ai/job-matches` via
`heuristicMatch`) diverge for the same student+job. Code review flagged this as a
correctness/explainability blocker.

**How to apply:** both endpoints share one loader + engine via
`lib/ai/student-match.ts` (`loadStudentBundle`, `toJobMatchInput`). Keep it that
way — do not reintroduce a separate inline scorer in any route, and if you touch
`computeMatch`, keep the score strictly equal to `heuristicMatch`'s. Track
isolation is a hard gate: a non-empty `requiredTracks` not matching the student
scores 0 and the job is filtered out (deny-by-default for untracked students).
