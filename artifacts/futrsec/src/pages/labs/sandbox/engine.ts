// Pure, dependency-free engines that power the client-side practice sandbox.
// Everything here runs in the browser — no server, no containers.

// ───────────────────────── Linux virtual filesystem ─────────────────────────

export interface VNode {
  type: "dir" | "file";
  content?: string;
}

/** A flat absolute-path → node map, e.g. "/home/analyst/notes.txt". */
export type VFS = Record<string, VNode>;

export interface CmdResult {
  out: string;
  /** non-zero on error (used by some drills) */
  code: number;
  cwd: string;
}

function normalize(path: string): string {
  const parts = path.split("/");
  const stack: string[] = [];
  for (const p of parts) {
    if (p === "" || p === ".") continue;
    if (p === "..") stack.pop();
    else stack.push(p);
  }
  return "/" + stack.join("/");
}

export function resolvePath(cwd: string, arg: string): string {
  if (!arg) return cwd;
  if (arg === "~") return "/home/analyst";
  if (arg.startsWith("~/")) return normalize("/home/analyst/" + arg.slice(2));
  if (arg.startsWith("/")) return normalize(arg);
  return normalize(cwd + "/" + arg);
}

function childrenOf(fs: VFS, dir: string): string[] {
  const prefix = dir === "/" ? "/" : dir + "/";
  const names = new Set<string>();
  for (const path of Object.keys(fs)) {
    if (path === dir) continue;
    if (path.startsWith(prefix)) {
      const rest = path.slice(prefix.length);
      const name = rest.split("/")[0];
      if (name) names.add(name);
    }
  }
  return [...names].sort();
}

function globMatch(pattern: string, name: string): boolean {
  if (!pattern.includes("*")) return pattern === name;
  const re = new RegExp(
    "^" + pattern.split("*").map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + "$",
  );
  return re.test(name);
}

/** Execute a single command line against the VFS. Returns output + new cwd. */
export function runLinux(fs: VFS, cwd: string, line: string): CmdResult {
  const trimmed = line.trim();
  if (!trimmed) return { out: "", code: 0, cwd };

  // Support a single pipe into grep/wc for log work.
  const [left, ...rightParts] = trimmed.split("|");
  const first = exec(fs, cwd, left.trim());
  if (rightParts.length === 0) return first;

  let piped = first.out;
  let result = first;
  for (const seg of rightParts) {
    const r = execPiped(seg.trim(), piped);
    piped = r.out;
    result = { ...r, cwd: result.cwd };
  }
  return result;
}

function execPiped(seg: string, input: string): CmdResult {
  const [cmd, ...args] = tokenize(seg);
  if (cmd === "grep") return { out: grep(args, input), code: 0, cwd: "" };
  if (cmd === "wc") return { out: wc(args, input), code: 0, cwd: "" };
  if (cmd === "head") return { out: headTail(args, input, true), code: 0, cwd: "" };
  if (cmd === "tail") return { out: headTail(args, input, false), code: 0, cwd: "" };
  if (cmd === "sort") return { out: input.split("\n").sort().join("\n"), code: 0, cwd: "" };
  if (cmd === "uniq") return { out: uniq(input), code: 0, cwd: "" };
  return { out: `command not found in pipe: ${cmd}`, code: 127, cwd: "" };
}

function tokenize(s: string): string[] {
  const out: string[] = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) out.push(m[1] ?? m[2] ?? m[3]);
  return out;
}

function exec(fs: VFS, cwd: string, line: string): CmdResult {
  const [cmd, ...args] = tokenize(line);
  const ok = (out: string) => ({ out, code: 0, cwd });
  const err = (out: string) => ({ out, code: 1, cwd });

  switch (cmd) {
    case undefined:
      return ok("");
    case "help":
      return ok(
        "Available: pwd ls cd cat echo grep find head tail wc whoami sort uniq clear help\nPipes supported: cmd | grep PATTERN, cmd | wc -l",
      );
    case "whoami":
      return ok("analyst");
    case "pwd":
      return ok(cwd);
    case "ls": {
      const flags = args.filter((a) => a.startsWith("-")).join("");
      const targets = args.filter((a) => !a.startsWith("-"));
      const dir = resolvePath(cwd, targets[0] ?? "");
      if (fs[dir]?.type === "file") return ok(targets[0] ?? dir);
      if (!fs[dir] || fs[dir].type !== "dir") return err(`ls: cannot access '${targets[0] ?? dir}': No such file or directory`);
      let names = childrenOf(fs, dir);
      if (!flags.includes("a")) names = names.filter((n) => !n.startsWith("."));
      if (flags.includes("l")) {
        return ok(
          names
            .map((n) => {
              const full = dir === "/" ? "/" + n : dir + "/" + n;
              const node = fs[full];
              const isDir = node?.type === "dir";
              const size = node?.content?.length ?? 0;
              return `${isDir ? "drwxr-xr-x" : "-rw-r--r--"} analyst analyst ${String(size).padStart(5)} ${n}`;
            })
            .join("\n"),
        );
      }
      return ok(names.join("  "));
    }
    case "cd": {
      const dir = resolvePath(cwd, args[0] ?? "~");
      if (!fs[dir] || fs[dir].type !== "dir") return { out: `cd: ${args[0]}: No such file or directory`, code: 1, cwd };
      return { out: "", code: 0, cwd: dir };
    }
    case "cat": {
      if (args.length === 0) return err("cat: missing operand");
      const out: string[] = [];
      for (const a of args) {
        const p = resolvePath(cwd, a);
        const node = fs[p];
        if (!node) return err(`cat: ${a}: No such file or directory`);
        if (node.type === "dir") return err(`cat: ${a}: Is a directory`);
        out.push(node.content ?? "");
      }
      return ok(out.join("\n"));
    }
    case "echo":
      return ok(args.join(" "));
    case "head":
    case "tail": {
      const file = args.find((a) => !a.startsWith("-") && !/^\d+$/.test(a));
      const p = resolvePath(cwd, file ?? "");
      const node = fs[p];
      if (!node || node.type !== "file") return err(`${cmd}: cannot open '${file}'`);
      return ok(headTail(args, node.content ?? "", cmd === "head"));
    }
    case "wc": {
      const file = args.find((a) => !a.startsWith("-"));
      const p = resolvePath(cwd, file ?? "");
      const node = fs[p];
      if (!node || node.type !== "file") return err(`wc: ${file}: No such file or directory`);
      return ok(wc(args, node.content ?? ""));
    }
    case "grep": {
      const file = args[args.length - 1];
      const p = resolvePath(cwd, file);
      const node = fs[p];
      if (!node || node.type !== "file") return err(`grep: ${file}: No such file or directory`);
      return ok(grep(args.slice(0, -1), node.content ?? ""));
    }
    case "find": {
      const start = resolvePath(cwd, args[0] && !args[0].startsWith("-") ? args[0] : ".");
      const nameIdx = args.indexOf("-name");
      const pattern = nameIdx >= 0 ? args[nameIdx + 1] : "*";
      const matches: string[] = [];
      const prefix = start === "/" ? "/" : start + "/";
      for (const path of Object.keys(fs).sort()) {
        if (path !== start && !path.startsWith(prefix)) continue;
        const base = path.split("/").pop() ?? "";
        if (globMatch(pattern, base)) matches.push(path);
      }
      return ok(matches.join("\n"));
    }
    case "sort":
      return ok("");
    case "clear":
      return ok("\f");
    default:
      return { out: `${cmd}: command not found`, code: 127, cwd };
  }
}

function grep(args: string[], input: string): string {
  const flags = args.filter((a) => a.startsWith("-")).join("");
  const pattern = args.find((a) => !a.startsWith("-")) ?? "";
  const i = flags.includes("i");
  const invert = flags.includes("v");
  const count = flags.includes("c");
  const showNum = flags.includes("n");
  let re: RegExp;
  try {
    re = new RegExp(pattern, i ? "i" : "");
  } catch {
    return `grep: invalid pattern: ${pattern}`;
  }
  const lines = input.split("\n");
  const matched = lines
    .map((l, idx) => ({ l, idx }))
    .filter(({ l }) => re.test(l) !== invert);
  if (count) return String(matched.length);
  return matched.map(({ l, idx }) => (showNum ? `${idx + 1}:${l}` : l)).join("\n");
}

function wc(args: string[], input: string): string {
  const flags = args.filter((a) => a.startsWith("-")).join("");
  const lines = input === "" ? 0 : input.split("\n").length;
  const words = input.trim() === "" ? 0 : input.trim().split(/\s+/).length;
  const chars = input.length;
  if (flags.includes("l")) return String(lines);
  if (flags.includes("w")) return String(words);
  if (flags.includes("c")) return String(chars);
  return `${lines} ${words} ${chars}`;
}

function headTail(args: string[], input: string, head: boolean): string {
  const nArg = args.find((a) => /^-?\d+$/.test(a) || a.startsWith("-n"));
  let n = 10;
  const numMatch = args.join(" ").match(/-n\s*(\d+)|(?:^|\s)-(\d+)/);
  if (numMatch) n = parseInt(numMatch[1] ?? numMatch[2], 10);
  else if (nArg && /^\d+$/.test(nArg.replace("-", ""))) n = parseInt(nArg.replace("-", ""), 10);
  const lines = input.split("\n");
  return (head ? lines.slice(0, n) : lines.slice(-n)).join("\n");
}

function uniq(input: string): string {
  const lines = input.split("\n");
  const out: string[] = [];
  for (const l of lines) if (out[out.length - 1] !== l) out.push(l);
  return out.join("\n");
}

// ───────────────────────── Regex evaluation ─────────────────────────

export interface RegexEval {
  ok: boolean;
  error?: string;
  matches: string[];
}

export function evalRegex(pattern: string, flags: string, text: string): RegexEval {
  if (!pattern) return { ok: true, matches: [] };
  let re: RegExp;
  try {
    re = new RegExp(pattern, flags.includes("g") ? flags : flags + "g");
  } catch (e) {
    return { ok: false, error: (e as Error).message, matches: [] };
  }
  const matches: string[] = [];
  let m: RegExpExecArray | null;
  let guard = 0;
  while ((m = re.exec(text)) && guard < 10000) {
    matches.push(m[0]);
    if (m.index === re.lastIndex) re.lastIndex++;
    guard++;
  }
  return { ok: true, matches };
}

/** Split text into segments tagged as match/plain for highlighting. */
export function highlightRegex(
  pattern: string,
  flags: string,
  text: string,
): { text: string; match: boolean }[] {
  if (!pattern) return [{ text, match: false }];
  let re: RegExp;
  try {
    re = new RegExp(pattern, flags.includes("g") ? flags : flags + "g");
  } catch {
    return [{ text, match: false }];
  }
  const out: { text: string; match: boolean }[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let guard = 0;
  while ((m = re.exec(text)) && guard < 10000) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), match: false });
    out.push({ text: m[0] || "", match: true });
    last = m.index + (m[0]?.length || 0);
    if (m.index === re.lastIndex) re.lastIndex++;
    guard++;
  }
  if (last < text.length) out.push({ text: text.slice(last), match: false });
  return out;
}

export function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}
