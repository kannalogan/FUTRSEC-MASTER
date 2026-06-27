import { z } from "zod/v4";

/**
 * Objective-based command validation.
 *
 * Lab modules can be validated two ways (see `labModulesTable.validationType`):
 *   - "flag"    — legacy normalized exact-match against `flag`.
 *   - "command" — the student submits a shell command which is parsed and
 *                 checked against a `CommandSpec` describing the *objective*
 *                 (which tool, which options, which targets, what intent) rather
 *                 than one canonical answer string. Many equivalent commands can
 *                 satisfy the same objective (`nmap -sV -p1-1000 10.0.0.5` and
 *                 `nmap 10.0.0.5 -p 1-1000 --version-intensity 5` both pass a
 *                 "service-version scan of that host on those ports" spec).
 *
 * The spec is authored by mentors/admins and is server-only — it encodes the
 * answer and must never be sent to students.
 *
 * Matching rules (deliberate, documented):
 *   - Tool name is matched case-insensitively and path-stripped
 *     (`/usr/bin/nmap` → `nmap`), against `tool` + `toolAliases`.
 *   - Flags are matched CASE-SENSITIVELY and exactly, because security-tool
 *     flags are case-significant (`nmap -sV` ≠ `-sv`). Each `requiredFlags`
 *     group is an OR of acceptable forms (e.g. `["-p","--ports"]`); all groups
 *     must be satisfied (AND across groups).
 *   - `forbiddenFlags` must be absent.
 *   - `requiredArgs` match argument *values* (literal, case-insensitive by
 *     default) or anywhere in the command (regex when `isRegex`).
 *   - `intentKeywords` must each appear somewhere in the raw command
 *     (case-insensitive substring) — an escape hatch for objectives that flags
 *     and args can't fully capture.
 */

export const CommandSpecSchema = z
  .object({
    tool: z.string().min(1).max(100),
    toolAliases: z.array(z.string().min(1).max(100)).max(20).optional(),
    // Each inner array is one logical requirement satisfied by ANY of its forms.
    requiredFlags: z
      .array(z.array(z.string().min(1).max(60)).min(1).max(20))
      .max(40)
      .optional(),
    forbiddenFlags: z.array(z.string().min(1).max(60)).max(40).optional(),
    requiredArgs: z
      .array(
        z.object({
          pattern: z.string().min(1).max(500),
          isRegex: z.boolean().optional(),
          label: z.string().max(200).optional(),
        }),
      )
      .max(40)
      .optional(),
    intentKeywords: z.array(z.string().min(1).max(120)).max(40).optional(),
    caseSensitive: z.boolean().optional(),
  })
  .strict();

export type CommandSpec = z.infer<typeof CommandSpecSchema>;

/**
 * Validate that an authored regex spec is well-formed. Returns an error message
 * for the first invalid `requiredArgs` regex, or null when all compile.
 */
export function validateSpecRegexes(spec: CommandSpec): string | null {
  for (const arg of spec.requiredArgs ?? []) {
    if (arg.isRegex) {
      try {
        new RegExp(arg.pattern);
      } catch {
        return `Invalid regex in required argument: ${arg.pattern}`;
      }
    }
  }
  return null;
}

/** A shell-like tokenizer: splits on whitespace, honoring single/double quotes. */
function tokenize(raw: string): string[] {
  const tokens: string[] = [];
  let cur = "";
  let quote: '"' | "'" | null = null;
  let has = false; // tracks whether the current token has started (handles "")
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (quote) {
      if (ch === quote) quote = null;
      else cur += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      has = true;
    } else if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      if (has) {
        tokens.push(cur);
        cur = "";
        has = false;
      }
    } else {
      cur += ch;
      has = true;
    }
  }
  if (has) tokens.push(cur);
  return tokens;
}

interface ParsedCommand {
  tool: string;
  flags: string[];
  values: string[];
}

/** Parse a raw command into tool, flags, and positional/value tokens. */
export function parseCommand(raw: string): ParsedCommand {
  const tokens = tokenize(String(raw ?? "").trim());
  const tool = tokens[0] ?? "";
  const flags: string[] = [];
  const values: string[] = [];
  for (const t of tokens.slice(1)) {
    if (t.startsWith("-") && t.length > 1) {
      const eq = t.indexOf("=");
      if (eq > 0) {
        // --flag=value → flag + value
        flags.push(t.slice(0, eq));
        const v = t.slice(eq + 1);
        if (v) values.push(v);
      } else {
        flags.push(t);
      }
    } else {
      values.push(t);
    }
  }
  return { tool, flags, values };
}

export interface CommandValidationResult {
  ok: boolean;
  /** Human-readable, answer-safe feedback categories (never reveals the spec). */
  failures: string[];
}

/**
 * Check a submitted command against an objective spec. Feedback is intentionally
 * categorical (e.g. "missing a required option") so students get actionable
 * guidance without the exact answer being leaked.
 */
export function validateCommand(
  raw: string,
  spec: CommandSpec,
): CommandValidationResult {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return { ok: false, failures: ["Enter a command to run."] };

  const { tool, flags, values } = parseCommand(trimmed);
  const cs = spec.caseSensitive ?? false;
  const norm = (s: string) => (cs ? s : s.toLowerCase());
  const failures: string[] = [];

  // 1) Tool — case-insensitive, path-stripped, against tool + aliases.
  const acceptedTools = [spec.tool, ...(spec.toolAliases ?? [])].map((t) =>
    t.toLowerCase(),
  );
  const toolName = (tool.split(/[\\/]/).pop() ?? tool).toLowerCase();
  if (!acceptedTools.includes(toolName)) {
    failures.push("That's not the right tool for this objective.");
  }

  // 2) Required flag groups — each group needs ≥1 form present (exact case).
  for (const group of spec.requiredFlags ?? []) {
    if (!group.some((f) => flags.includes(f))) {
      failures.push("Your command is missing one or more required options.");
      break;
    }
  }

  // 3) Forbidden flags must be absent.
  for (const f of spec.forbiddenFlags ?? []) {
    if (flags.includes(f)) {
      failures.push("Your command uses an option that isn't allowed for this objective.");
      break;
    }
  }

  // 4) Required args — literal match against a parsed argument *value* (exact
  // token equality), or regex against the whole command. Literal matching is
  // value-level only: we never substring-match the whole command (which would
  // let a required arg hide inside an unrelated token, e.g. "pass" matching
  // "--no-password"), and we never match against the tool or flag tokens (a
  // required target like "nmap" must not be satisfied by the tool name).
  const normValues = values.map(norm);
  const normAll = norm(trimmed);
  for (const arg of spec.requiredArgs ?? []) {
    let matched = false;
    if (arg.isRegex) {
      try {
        matched = new RegExp(arg.pattern, cs ? "" : "i").test(trimmed);
      } catch {
        matched = false; // malformed regex never matches; authoring guards this
      }
    } else {
      matched = normValues.includes(norm(arg.pattern));
    }
    if (!matched) {
      failures.push("A required target or argument is missing or incorrect.");
      break;
    }
  }

  // 5) Intent keywords — each must appear somewhere in the command.
  for (const kw of spec.intentKeywords ?? []) {
    if (!normAll.includes(norm(kw))) {
      failures.push("Your command doesn't fully address the objective.");
      break;
    }
  }

  return { ok: failures.length === 0, failures };
}
