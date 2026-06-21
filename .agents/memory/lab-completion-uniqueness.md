---
name: Lab module completion uniqueness
description: Why a lab module flag is earned once per user (anti-farming) and where that guarantee must live
---

A lab module flag can be captured only **once per user, ever** — across all attempts. The DB enforces this with a uniqueness constraint at the (user, module) grain.

**Why:** Completions were originally unique per (attempt, module). Because a user can start a fresh attempt after finishing, re-solving the same module created a second completion row and inflated the CTF leaderboard (which aggregates raw completion rows for points/flags). The anti-farming guarantee must live at the completion grain, not inside the leaderboard query — otherwise every consumer of completions has to re-implement dedup.

**How to apply:**
- A user's lab score = sum of their completions for that lab, NOT per-attempt. Attempts track start/finish only; they don't own the score.
- Solved-state display and flag-submit idempotency key off the user (not the attempt), so solved modules persist across attempts.
- Guard the completion insert against the unique constraint; on a race, fall back to the existing row instead of double-awarding.
- If per-attempt replay scoring is ever needed, dedup in the query layer (DISTINCT per user+module) — do not loosen the uniqueness constraint.

**Related:** track-scoped CTF/leaderboard routes must deny-by-default — a non-admin whose track can't be resolved must 403, never fall through to a global cross-track query.
