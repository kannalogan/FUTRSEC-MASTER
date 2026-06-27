import { useEffect, useMemo, useRef, useState } from "react";
import { evalRegex, highlightRegex } from "./engine";
import { checkRegex, type RegexDrill } from "./drills";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle } from "lucide-react";

export function RegexLab({ drill, onSolve }: { drill: RegexDrill; onSolve: () => void }) {
  const [pattern, setPattern] = useState("");
  const [flags, setFlags] = useState(drill.defaultFlags);
  const solvedRef = useRef(false);

  const evalResult = useMemo(() => evalRegex(pattern, flags, drill.testText), [pattern, flags, drill.testText]);
  const segments = useMemo(() => highlightRegex(pattern, flags, drill.testText), [pattern, flags, drill.testText]);
  const correct = useMemo(() => (pattern ? checkRegex(drill, pattern, flags) : false), [drill, pattern, flags]);

  useEffect(() => {
    if (correct && !solvedRef.current) {
      solvedRef.current = true;
      onSolve();
    }
  }, [correct, onSolve]);

  const toggleFlag = (f: string) =>
    setFlags((prev) => (prev.includes(f) ? prev.replace(f, "") : prev + f));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="font-mono text-muted-foreground text-sm">/</span>
        <Input
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          placeholder="type your regular expression…"
          spellCheck={false}
          autoCapitalize="off"
          className={`font-mono text-sm ${!evalResult.ok ? "border-danger focus-visible:ring-danger" : ""}`}
        />
        <span className="font-mono text-muted-foreground text-sm">/{flags}</span>
        <div className="flex gap-1">
          {["g", "i", "m"].map((f) => (
            <button
              key={f}
              onClick={() => toggleFlag(f)}
              className={`h-8 w-8 rounded-md font-mono text-xs border transition-colors ${
                flags.includes(f)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {!evalResult.ok && <p className="text-xs text-danger font-mono">{evalResult.error}</p>}

      <div className="rounded-lg border border-border/60 bg-muted/20 p-3 font-mono text-[13px] leading-relaxed whitespace-pre-wrap break-words">
        {segments.map((s, i) =>
          s.match ? (
            <mark key={i} className="bg-warning/30 text-foreground rounded px-0.5">
              {s.text}
            </mark>
          ) : (
            <span key={i} className="text-muted-foreground">
              {s.text}
            </span>
          ),
        )}
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {evalResult.matches.length} match{evalResult.matches.length === 1 ? "" : "es"} · need {drill.expected.length}
        </span>
        {pattern &&
          (correct ? (
            <span className="flex items-center gap-1 text-success font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" /> {drill.success}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-muted-foreground">
              <XCircle className="h-3.5 w-3.5" /> not matching the exact set yet
            </span>
          ))}
      </div>
    </div>
  );
}
