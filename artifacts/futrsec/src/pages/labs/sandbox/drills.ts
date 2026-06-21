import { evalRegex, sameSet, type VFS } from "./engine";

export type Category = "linux" | "regex" | "logs" | "python";

export interface CmdEntry {
  cmd: string;
  output: string;
  cwd: string;
}

interface BaseDrill {
  id: string;
  category: Category;
  title: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  prompt: string;
  hint: string;
}

export interface LinuxDrill extends BaseDrill {
  category: "linux";
  fs: VFS;
  startCwd: string;
  /** validated against the command history of the session */
  validate: (history: CmdEntry[]) => boolean;
  success: string;
}

export interface RegexDrill extends BaseDrill {
  category: "regex";
  testText: string;
  /** the exact set of substrings a correct pattern must match */
  expected: string[];
  defaultFlags: string;
  success: string;
}

export interface LogsDrill extends BaseDrill {
  category: "logs";
  log: string;
  /** accepted answers (case-insensitive, trimmed) */
  answers: string[];
  question: string;
  success: string;
}

export interface PythonDrill extends BaseDrill {
  category: "python";
  starter: string;
  /** stdout (trimmed) the user's program must produce */
  expectedOutput: string;
  success: string;
}

export type Drill = LinuxDrill | RegexDrill | LogsDrill | PythonDrill;

const lastNonEmpty = (h: CmdEntry[]) => [...h].reverse().find((e) => e.output.trim() !== "" || e.cmd.trim() !== "");

// ───────────────────────── Linux drills ─────────────────────────

const authLog = `Jan 14 09:02:11 srv sshd[2211]: Accepted password for analyst from 10.0.0.5 port 51010 ssh2
Jan 14 09:14:55 srv sshd[2240]: Failed password for root from 203.0.113.9 port 40222 ssh2
Jan 14 09:15:01 srv sshd[2241]: Failed password for root from 203.0.113.9 port 40223 ssh2
Jan 14 09:15:09 srv sshd[2242]: Failed password for admin from 203.0.113.9 port 40224 ssh2
Jan 14 09:20:33 srv sshd[2260]: Accepted publickey for analyst from 10.0.0.5 port 51044 ssh2
Jan 14 09:31:42 srv sshd[2301]: Failed password for root from 198.51.100.7 port 33010 ssh2`;

const linuxFs1: VFS = {
  "/": { type: "dir" },
  "/home": { type: "dir" },
  "/home/analyst": { type: "dir" },
  "/home/analyst/readme.txt": { type: "file", content: "Welcome analyst. Investigate /var/log for suspicious activity." },
  "/home/analyst/.secret": { type: "file", content: "flag-practice-only" },
  "/var": { type: "dir" },
  "/var/log": { type: "dir" },
  "/var/log/auth.log": { type: "file", content: authLog },
  "/var/log/app.log": { type: "file", content: "INFO startup ok\nWARN disk 80%\nERROR db timeout\nINFO recovered" },
  "/etc": { type: "dir" },
  "/etc/hostname": { type: "file", content: "soc-workstation" },
};

export const linuxDrills: LinuxDrill[] = [
  {
    id: "linux-pwd-ls",
    category: "linux",
    title: "Get your bearings",
    difficulty: "beginner",
    prompt: "You just landed on a SOC workstation. Print the current directory, then list the files (including hidden ones) in your home folder.",
    hint: "Use `pwd` to print the working directory and `ls -a` to include dotfiles.",
    fs: linuxFs1,
    startCwd: "/home/analyst",
    success: "Nice — you can navigate and reveal hidden files like .secret.",
    validate: (h) => {
      const ranPwd = h.some((e) => e.cmd.trim() === "pwd" && e.output.trim() === "/home/analyst");
      const lsHidden = h.some((e) => /^ls\b.*-\w*a/.test(e.cmd.trim()) && e.output.includes(".secret"));
      return ranPwd && lsHidden;
    },
  },
  {
    id: "linux-cat-hostname",
    category: "linux",
    title: "Identify the host",
    difficulty: "beginner",
    prompt: "Find out the machine's hostname by reading the right file under /etc.",
    hint: "The hostname lives in /etc/hostname — read it with `cat`.",
    fs: linuxFs1,
    startCwd: "/home/analyst",
    success: "Correct — this is the soc-workstation.",
    // Must actually read the hostname file with cat (not echo the answer).
    validate: (h) =>
      h.some((e) => /^cat\b/.test(e.cmd.trim()) && /hostname/.test(e.cmd) && e.output.trim() === "soc-workstation"),
  },
  {
    id: "linux-grep-failed",
    category: "linux",
    title: "Hunt failed logins",
    difficulty: "intermediate",
    prompt: "Search /var/log/auth.log for every failed password attempt. Your output should contain only the 'Failed password' lines.",
    hint: "`grep \"Failed password\" /var/log/auth.log` — or cd into /var/log first.",
    fs: linuxFs1,
    startCwd: "/home/analyst",
    success: "You isolated 4 brute-force attempts. That IP 203.0.113.9 is busy.",
    validate: (h) => {
      const e = lastNonEmpty(h);
      if (!e) return false;
      const lines = e.output.trim().split("\n").filter(Boolean);
      return lines.length === 4 && lines.every((l) => l.includes("Failed password"));
    },
  },
  {
    id: "linux-count-errors",
    category: "linux",
    title: "Count the errors",
    difficulty: "intermediate",
    prompt: "Using a pipe, count exactly how many lines in /var/log/app.log contain the word ERROR.",
    hint: "Pipe grep into wc: `cat /var/log/app.log | grep ERROR | wc -l` (or `grep -c`).",
    fs: linuxFs1,
    startCwd: "/var/log",
    success: "Exactly 1 ERROR line — clean run apart from the db timeout.",
    // Must operate on app.log and use a real count pipeline (grep ERROR | wc -l,
    // or grep -c ERROR) — not echo a fabricated number.
    validate: (h) => {
      const e = lastNonEmpty(h);
      if (!e || e.output.trim() !== "1") return false;
      const c = e.cmd;
      if (!/app\.log/.test(c) || !/\bERROR\b/.test(c)) return false;
      return (/grep[^|]*\bERROR\b[^|]*\|\s*wc\b/.test(c)) || /grep\b[^|]*-c/.test(c);
    },
  },
  {
    id: "linux-find-logs",
    category: "linux",
    title: "Locate every log file",
    difficulty: "advanced",
    prompt: "From the root directory, find every file whose name ends in .log.",
    hint: "`find / -name \"*.log\"` walks the tree and matches by name.",
    fs: linuxFs1,
    startCwd: "/",
    success: "Both auth.log and app.log located.",
    validate: (h) => {
      const e = lastNonEmpty(h);
      if (!e) return false;
      const out = e.output;
      return /find\b/.test(e.cmd) && out.includes("/var/log/auth.log") && out.includes("/var/log/app.log");
    },
  },
];

// ───────────────────────── Regex drills ─────────────────────────

export const regexDrills: RegexDrill[] = [
  {
    id: "regex-ipv4",
    category: "regex",
    title: "Extract IPv4 addresses",
    difficulty: "intermediate",
    prompt: "Write a pattern that matches every IPv4 address in the log snippet — and nothing else.",
    hint: "Four groups of 1–3 digits separated by dots: \\b\\d{1,3}(\\.\\d{1,3}){3}\\b",
    testText: "Accepted from 10.0.0.5 port 51010; Failed from 203.0.113.9 and 198.51.100.7 (ts 2024)",
    expected: ["10.0.0.5", "203.0.113.9", "198.51.100.7"],
    defaultFlags: "g",
    success: "Clean IPv4 extraction — perfect for log parsing.",
  },
  {
    id: "regex-email",
    category: "regex",
    title: "Find email addresses",
    difficulty: "beginner",
    prompt: "Match the two email addresses in the text.",
    hint: "Something like [\\w.]+@[\\w.]+\\.\\w+",
    testText: "Contact soc@futrsec.in or escalate to lead.analyst@example.com immediately. Not an email: @no.",
    expected: ["soc@futrsec.in", "lead.analyst@example.com"],
    defaultFlags: "g",
    success: "Both addresses captured without false positives.",
  },
  {
    id: "regex-cve",
    category: "regex",
    title: "Capture CVE identifiers",
    difficulty: "intermediate",
    prompt: "Match every CVE id (format CVE-YYYY-NNNN+).",
    hint: "CVE-\\d{4}-\\d{4,}",
    testText: "Patched CVE-2021-44228 and CVE-2014-0160; ignore CVE- and cve-2019 (malformed).",
    expected: ["CVE-2021-44228", "CVE-2014-0160"],
    defaultFlags: "g",
    success: "Only well-formed CVE ids matched.",
  },
  {
    id: "regex-hash",
    category: "regex",
    title: "Spot MD5 hashes",
    difficulty: "advanced",
    prompt: "Match only the 32-character hexadecimal MD5 hash. Do not match the shorter hex string.",
    hint: "Anchor the length: \\b[a-f0-9]{32}\\b",
    testText: "ioc md5 d41d8cd98f00b204e9800998ecf8427e seen; short hex deadbeef is not a hash.",
    expected: ["d41d8cd98f00b204e9800998ecf8427e"],
    defaultFlags: "g",
    success: "Precise length anchoring — the short hex was correctly ignored.",
  },
];

// ───────────────────────── Log analysis drills ─────────────────────────

const accessLog = `10.0.0.5 - - [14/Jan/2024:09:00:01] "GET /login HTTP/1.1" 200 1024
203.0.113.9 - - [14/Jan/2024:09:00:05] "POST /login HTTP/1.1" 401 320
203.0.113.9 - - [14/Jan/2024:09:00:06] "POST /login HTTP/1.1" 401 320
203.0.113.9 - - [14/Jan/2024:09:00:07] "POST /login HTTP/1.1" 401 320
203.0.113.9 - - [14/Jan/2024:09:00:09] "POST /login HTTP/1.1" 401 320
10.0.0.5 - - [14/Jan/2024:09:01:00] "GET /dashboard HTTP/1.1" 200 5012
198.51.100.7 - - [14/Jan/2024:09:02:11] "GET /admin HTTP/1.1" 403 128
203.0.113.9 - - [14/Jan/2024:09:03:00] "POST /login HTTP/1.1" 200 980
203.0.113.9 - - [14/Jan/2024:09:03:30] "GET /../../etc/passwd HTTP/1.1" 404 64`;

export const logsDrills: LogsDrill[] = [
  {
    id: "logs-401-count",
    category: "logs",
    title: "Failed login burst",
    difficulty: "beginner",
    prompt: "Use the filter to investigate the web access log, then answer the question.",
    question: "How many requests returned HTTP status 401 (unauthorized)?",
    hint: "Filter for \" 401 \" and count the rows. There are four.",
    log: accessLog,
    answers: ["4"],
    success: "Right — four 401s in a row signal a brute-force attempt.",
  },
  {
    id: "logs-attacker-ip",
    category: "logs",
    title: "Identify the attacker",
    difficulty: "intermediate",
    prompt: "One IP is responsible for the failed logins AND a path-traversal attempt (/../../etc/passwd).",
    question: "What is the attacker's IP address?",
    hint: "Filter for 'passwd' and for '401' — the same IP appears in both.",
    log: accessLog,
    answers: ["203.0.113.9"],
    success: "Correct — 203.0.113.9 brute-forced login then tried to read /etc/passwd.",
  },
  {
    id: "logs-success-after",
    category: "logs",
    title: "Did the attack succeed?",
    difficulty: "intermediate",
    prompt: "After the four failed logins, the attacker eventually got a different status on /login.",
    question: "What HTTP status did the attacker's successful POST /login return?",
    hint: "Look for the 5th POST /login from 203.0.113.9 — it is not 401.",
    log: accessLog,
    answers: ["200"],
    success: "Yes — a 200 means the credentials were guessed. This is a confirmed breach.",
  },
];

// ───────────────────────── Python drills ─────────────────────────

export const pythonDrills: PythonDrill[] = [
  {
    id: "py-count-failed",
    category: "python",
    title: "Count failed logins",
    difficulty: "beginner",
    prompt: "The variable `log` holds auth lines. Print how many contain 'Failed password'.",
    hint: "Use a generator with sum(): print(sum('Failed password' in l for l in log.splitlines()))",
    starter: `log = """Accepted password for analyst
Failed password for root
Failed password for root
Accepted publickey for analyst
Failed password for admin"""

# print the number of failed password attempts
`,
    expectedOutput: "3",
    success: "Three failed attempts — your generator expression nailed it.",
  },
  {
    id: "py-unique-ips",
    category: "python",
    title: "Count unique IPs",
    difficulty: "intermediate",
    prompt: "`ips` is a list with duplicates. Print how many UNIQUE IP addresses it contains.",
    hint: "A set removes duplicates: print(len(set(ips)))",
    starter: `ips = ["10.0.0.5", "203.0.113.9", "203.0.113.9", "198.51.100.7", "10.0.0.5"]

# print the count of unique IPs
`,
    expectedOutput: "3",
    success: "Correct — set() collapsed the duplicates to 3 unique hosts.",
  },
  {
    id: "py-top-ip",
    category: "python",
    title: "Find the noisiest IP",
    difficulty: "advanced",
    prompt: "`hits` lists one entry per request. Print the single IP that appears most often.",
    hint: "from collections import Counter; print(Counter(hits).most_common(1)[0][0])",
    starter: `hits = ["10.0.0.5", "203.0.113.9", "203.0.113.9", "203.0.113.9", "198.51.100.7", "10.0.0.5"]

# print the most frequent IP
`,
    expectedOutput: "203.0.113.9",
    success: "203.0.113.9 is the noisiest — Counter.most_common is the SOC analyst's friend.",
  },
];

export const ALL_DRILLS: Drill[] = [...linuxDrills, ...regexDrills, ...logsDrills, ...pythonDrills];

export function checkRegex(drill: RegexDrill, pattern: string, flags: string): boolean {
  const r = evalRegex(pattern, flags, drill.testText);
  return r.ok && sameSet(r.matches, drill.expected);
}
