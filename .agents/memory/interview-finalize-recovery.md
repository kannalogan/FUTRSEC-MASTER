---
name: Mock interview finalize recovery
description: Why an assigned interview can get stuck in_progress with all answers present, and how the client must recover
---

# Assigned mock interview completion dead-end

The assigned-interview flow is: `POST /student/mock-interviews/:assignmentId/start` materializes questions and an
`ai_interviews` attempt, then the existing `POST /ai/interview/:id/answer` (one per question) and finally
`POST /ai/interview/:id/finish` (which runs AI evaluation and writes the score back to the assignment).

**The trap:** the score is only persisted by `/finish`. If `/finish` fails or is never called after the last
answer (network drop, AI timeout, user closes tab), the attempt is left with **all answers present but status
still `in_progress`**. On re-entry, `start` is idempotent and reports `index: null, question: null` (nothing left
to answer) but `status: "in_progress"`. A naive client treats `index===null` as "already completed" and exits —
the student is stuck and the mentor never receives a score.

**The rule:** when `start` returns `index===null` (or `question===null`), branch on `status`:
- `status === "completed"` → genuinely done, show results.
- otherwise → immediately call `POST /ai/interview/:id/finish` to finalize, then surface the result and
  invalidate the student + ai-interviews query caches.

**Why:** finalize must be idempotent-recoverable; an attempt with all answers is always finishable. Never leave a
completed-but-unscored attempt unreachable.

**How to apply:** any client that drives the answer→finish flow (student assigned-interviews page, self-serve AI
interview) needs this re-entry recovery, not just a happy-path finish call inside the answer loop.
