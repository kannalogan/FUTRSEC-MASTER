import { useMemo, useRef, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search, Terminal as TerminalIcon, FileText } from "lucide-react";

type Sim = Record<string, any>;

const SEV_COLOR: Record<string, string> = {
  info: "#64748b",
  warning: "#d97706",
  high: "#ea580c",
  critical: "#dc2626",
};

/* ───────────────────────── SIEM log viewer ───────────────────────── */
export function SiemSimulator({ sim }: { sim: Sim }) {
  const [q, setQ] = useState("");
  const fields: string[] = sim.fields ?? Object.keys(sim.logs?.[0] ?? {});
  const logs: Record<string, string>[] = sim.logs ?? [];

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return logs;
    return logs.filter((row) =>
      Object.values(row).some((v) => String(v).toLowerCase().includes(needle)),
    );
  }, [q, logs]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border/60 bg-muted/30">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Search className="h-4 w-4 text-orange-500 dark:text-orange-400" />
          {sim.title ?? "SIEM"}
        </div>
        {sim.description && <p className="text-xs text-muted-foreground mt-1">{sim.description}</p>}
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search events (e.g. 4625, an IP, an account)…"
            className="pl-8 h-9 text-xs font-mono"
          />
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5">{filtered.length} / {logs.length} events</p>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-[11px] font-mono">
          <thead className="sticky top-0 bg-background border-b border-border/60">
            <tr>
              {fields.map((f) => (
                <th key={f} className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wide">{f}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr key={i} className="border-b border-border/30 hover:bg-muted/40 align-top">
                {fields.map((f) => (
                  <td key={f} className="px-3 py-2 whitespace-pre-wrap break-words max-w-[280px]">
                    {f === "severity" ? (
                      <span
                        className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold text-white"
                        style={{ backgroundColor: SEV_COLOR[row[f]] ?? "#64748b" }}
                      >
                        {row[f]}
                      </span>
                    ) : (
                      <span className={f === "eventId" ? "text-orange-600 dark:text-orange-400 font-semibold" : ""}>{row[f]}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={fields.length} className="px-3 py-8 text-center text-muted-foreground">No matching events</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ───────────────────────── Terminal ───────────────────────── */
function normCmd(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export function TerminalSimulator({ sim }: { sim: Sim }) {
  const prompt: string = sim.prompt ?? "user@host:~$";
  const commands: Record<string, string> = sim.commands ?? {};
  const [history, setHistory] = useState<{ cmd?: string; out: string }[]>([
    { out: sim.description ?? "Type a command, or click one below. `help` lists available commands." },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const cmdMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const [k, v] of Object.entries(commands)) m.set(normCmd(k), v);
    return m;
  }, [commands]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [history]);

  function run(raw: string) {
    const cmd = raw.trim();
    if (!cmd) return;
    if (normCmd(cmd) === "clear") {
      setHistory([]);
      setInput("");
      return;
    }
    const out = cmdMap.get(normCmd(cmd)) ?? `command not found: ${cmd}\nType 'help' for available commands.`;
    setHistory((h) => [...h, { cmd, out }]);
    setInput("");
  }

  const chips = Object.keys(commands).filter((c) => normCmd(c) !== "help");

  return (
    <div className="flex flex-col h-full bg-[#0c1116]">
      <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2 text-xs text-slate-300">
        <TerminalIcon className="h-4 w-4 text-green-400" />
        {sim.title ?? "Terminal"}
      </div>
      <div ref={scrollRef} className="flex-1 overflow-auto px-4 py-3 font-mono text-[12px] leading-relaxed">
        {history.map((h, i) => (
          <div key={i} className="mb-2">
            {h.cmd && (
              <div className="text-green-400"><span className="text-sky-400">{prompt}</span> {h.cmd}</div>
            )}
            <pre className="whitespace-pre-wrap text-slate-200">{h.out}</pre>
          </div>
        ))}
        <div className="flex items-center gap-2 text-green-400">
          <span className="text-sky-400 shrink-0">{prompt}</span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") run(input); }}
            className="flex-1 bg-transparent outline-none text-green-300 caret-green-400"
            placeholder="type a command…"
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      </div>
      <div className="px-3 py-2 border-t border-white/10 flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <button
            key={c}
            onClick={() => run(c)}
            className="text-[10px] font-mono px-2 py-1 rounded bg-white/5 text-slate-300 hover:bg-white/10 hover:text-green-300 transition-colors truncate max-w-[240px]"
            title={c}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── GRC worksheet ───────────────────────── */
export function GrcSimulator({ sim }: { sim: Sim }) {
  const documents: { title: string; body: string }[] = sim.documents ?? [];
  const [open, setOpen] = useState<number>(0);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border/60 bg-muted/30">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <FileText className="h-4 w-4 text-orange-500 dark:text-orange-400" />
          {sim.title ?? "Workpapers"}
        </div>
        {sim.description && <p className="text-xs text-muted-foreground mt-1">{sim.description}</p>}
      </div>
      <div className="flex-1 overflow-auto p-3 space-y-2">
        {documents.map((doc, i) => (
          <div key={i} className="border border-border/60 rounded-lg overflow-hidden">
            <button
              onClick={() => setOpen(open === i ? -1 : i)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-left bg-muted/40 hover:bg-muted/70 transition-colors"
            >
              <span className="text-sm font-medium text-foreground">{doc.title}</span>
              <span className="text-xs text-muted-foreground">{open === i ? "−" : "+"}</span>
            </button>
            {open === i && (
              <pre className="px-3 py-3 text-xs text-foreground/90 whitespace-pre-wrap font-sans leading-relaxed border-t border-border/40">{doc.body}</pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Simulator({ sim }: { sim: Sim | null | undefined }) {
  if (!sim) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
        No interactive simulator for this lab.
      </div>
    );
  }
  if (sim.kind === "siem") return <SiemSimulator sim={sim} />;
  if (sim.kind === "terminal") return <TerminalSimulator sim={sim} />;
  if (sim.kind === "grc") return <GrcSimulator sim={sim} />;
  return (
    <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
      Unsupported simulator type.
    </div>
  );
}
