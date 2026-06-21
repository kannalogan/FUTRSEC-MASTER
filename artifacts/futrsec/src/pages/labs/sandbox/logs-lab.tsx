import { useMemo, useState } from "react";
import type { LogsDrill } from "./drills";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, CheckCircle2, XCircle } from "lucide-react";

export function LogsLab({ drill, onSolve }: { drill: LogsDrill; onSolve: () => void }) {
  const [filter, setFilter] = useState("");
  const [useRegex, setUseRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [answer, setAnswer] = useState("");
  const [verdict, setVerdict] = useState<null | boolean>(null);

  const lines = useMemo(() => drill.log.split("\n"), [drill.log]);

  const { rendered, count } = useMemo(() => {
    if (!filter.trim()) return { rendered: lines.map((l) => ({ l, hit: false })), count: lines.length };
    let test: (l: string) => boolean;
    if (useRegex) {
      try {
        const re = new RegExp(filter, caseSensitive ? "" : "i");
        test = (l) => re.test(l);
      } catch {
        return { rendered: lines.map((l) => ({ l, hit: false })), count: 0 };
      }
    } else {
      const needle = caseSensitive ? filter : filter.toLowerCase();
      test = (l) => (caseSensitive ? l : l.toLowerCase()).includes(needle);
    }
    const matched = lines.filter(test);
    return { rendered: matched.map((l) => ({ l, hit: true })), count: matched.length };
  }, [filter, useRegex, caseSensitive, lines]);

  const submit = () => {
    const ok = drill.answers.some((a) => a.trim().toLowerCase() === answer.trim().toLowerCase());
    setVerdict(ok);
    if (ok) onSolve();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="filter log lines…"
            spellCheck={false}
            className="pl-8 font-mono text-xs"
          />
        </div>
        <button
          onClick={() => setUseRegex((v) => !v)}
          className={`h-8 px-2.5 rounded-md text-xs border transition-colors ${useRegex ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"}`}
        >
          .* regex
        </button>
        <button
          onClick={() => setCaseSensitive((v) => !v)}
          className={`h-8 px-2.5 rounded-md text-xs border transition-colors ${caseSensitive ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"}`}
        >
          Aa case
        </button>
      </div>

      <div className="rounded-lg overflow-hidden border border-border/60 bg-[#0b1020]">
        <div className="px-3 py-1.5 border-b border-white/10 text-[11px] font-mono text-white/40 flex justify-between">
          <span>access.log</span>
          <span>{count} / {lines.length} lines</span>
        </div>
        <div className="max-h-[300px] overflow-y-auto font-mono text-[12px] leading-relaxed">
          {rendered.length === 0 ? (
            <p className="px-3 py-4 text-white/40">No matching lines.</p>
          ) : (
            rendered.map(({ l, hit }, i) => (
              <div key={i} className={`px-3 py-0.5 whitespace-pre-wrap break-all ${hit ? "bg-amber-400/10 text-amber-200" : "text-white/70"}`}>
                {l}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
        <p className="text-xs font-medium text-foreground mb-2">{drill.question}</p>
        <div className="flex gap-2">
          <Input
            value={answer}
            onChange={(e) => {
              setAnswer(e.target.value);
              setVerdict(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="your answer"
            className="text-sm"
          />
          <Button size="sm" onClick={submit} disabled={!answer.trim()}>
            Check
          </Button>
        </div>
        {verdict === true && (
          <p className="flex items-center gap-1 text-emerald-600 text-xs font-medium mt-2">
            <CheckCircle2 className="h-3.5 w-3.5" /> {drill.success}
          </p>
        )}
        {verdict === false && (
          <p className="flex items-center gap-1 text-red-500 text-xs mt-2">
            <XCircle className="h-3.5 w-3.5" /> Not quite — use the filter to investigate and try again.
          </p>
        )}
      </div>
    </div>
  );
}
