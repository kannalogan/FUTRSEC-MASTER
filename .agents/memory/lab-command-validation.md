---
name: Lab command validation
description: How objective-based lab command modules are validated and authored (PHASE 3).
---

Lab modules have two validation types: `flag` (exact-match flag submission) and `command` (parser-based objective check). Source of truth: `validationType` + `commandSpec` columns on lab modules.

## Validator contract (command-validator.ts)
- `parseCommand` splits a command into `{ tool, flags, values }`; `--flag=value` becomes a flag + a value.
- `requiredArgs` literal matching is **value-level only** — match against parsed argument values (`values`), never a whole-command substring and never the tool or flag tokens.
  - **Why:** a whole-command `.includes(needle)` fallback caused false positives (`pass` matched inside `--no-password`); matching against `[tool, ...flags, ...values]` was also wrong (a required target like `nmap` could be satisfied by the tool name or a flag).
  - **How to apply:** only `isRegex` args test against the full trimmed command; literal args use exact equality against a parsed argument value. `--flag=value` and quoted args both land in `values`.
- Feedback strings are intentionally categorical/answer-safe (e.g. "A required target or argument is missing or incorrect.") — never echo the spec back to the student. The `/command` student endpoint returns `failures: string[]` (plain strings, not objects).
- `sanitizeModule` exposes only `hasFlag` / `hasCommandSpec` booleans to students — never the flag or the spec.

## Authoring (admin + mentor must stay in parity)
- Both `artifacts/futrsec/src/pages/admin/labs.tsx` and `artifacts/futrsec/src/pages/mentor/lab-editor.tsx` carry the same command-spec UI + `buildCommandSpec`/`decodeCommandSpec` helpers. Changing one means changing the other.
- Authoring textareas: one requirement per line; within a required-flags line, space-separated alternatives mean "any one satisfies it"; required-args lines prefixed `regex:` become regex patterns.
- Spec-coherence guards (server, admin-labs.ts + lab-builder.ts): switching a module flag→command requires a spec (else 400); command→flag clears the spec. Clone copies the new columns.
