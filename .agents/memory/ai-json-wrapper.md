---
name: AI generateJSON object-wrapper requirement
description: Why generateJSON validators must accept an object-wrapped array, not a bare array, when using OpenAI JSON mode
---

# generateJSON + OpenAI JSON mode

`generateJSON<T>({system, user, validate, mock})` (lib/ai) calls the provider with `response_format: json_object`. **OpenAI JSON mode requires the model to return a top-level JSON *object*, never a bare array.** So when you ask for a list, the model returns `{ "questions": [...] }` (or similar wrapper key), NOT `[...]`.

**Why this bites:** a validator written as `validate: (v) => Array.isArray(v) && ...` always fails against OpenAI output → `generateJSON` throws "AI JSON failed validation" → silently falls back to `mock()`. The endpoint returns `provider: "mock"` placeholder data even though `OPENAI_API_KEY` is set and working. This violates the "no mock data in product surfaces" mandate while looking like it works.

**How to apply:** for any list-returning AI generation:
1. Prompt the model to return an object: `Return a JSON object: { "questions": [ ... ] }`.
2. Write a normalizer that accepts BOTH shapes: `const arr = Array.isArray(v) ? v : v?.questions;` then validate the array.
3. Type the generic as `T[] | { key: T[] }` and normalize before consuming.
Object-returning generations (e.g. `{difficulty, confidence, rationale}`) are unaffected — they already match JSON mode.
