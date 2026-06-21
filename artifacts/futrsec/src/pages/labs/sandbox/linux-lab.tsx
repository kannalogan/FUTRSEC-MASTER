import { useEffect, useRef, useState } from "react";
import { runLinux } from "./engine";
import type { CmdEntry, LinuxDrill } from "./drills";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

interface Line {
  prompt?: string;
  text: string;
}

export function LinuxLab({ drill, onSolve }: { drill: LinuxDrill; onSolve: () => void }) {
  const [cwd, setCwd] = useState(drill.startCwd);
  const [lines, setLines] = useState<Line[]>([
    { text: "FUTRSEC practice shell — type `help` for commands. Solve the task in the panel above." },
  ]);
  const [history, setHistory] = useState<CmdEntry[]>([]);
  const [input, setInput] = useState("");
  const [recall, setRecall] = useState<string[]>([]);
  const [recallIdx, setRecallIdx] = useState(-1);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  const promptStr = `analyst@soc:${cwd.replace("/home/analyst", "~")}$`;

  const reset = () => {
    setCwd(drill.startCwd);
    setHistory([]);
    setRecall([]);
    setRecallIdx(-1);
    setLines([{ text: "Session reset. Try again." }]);
  };

  const submit = () => {
    const cmd = input;
    setInput("");
    if (!cmd.trim()) {
      setLines((l) => [...l, { prompt: promptStr, text: "" }]);
      return;
    }
    const res = runLinux(drill.fs, cwd, cmd);
    setRecall((r) => [...r, cmd]);
    setRecallIdx(-1);

    if (res.out === "\f") {
      setLines([]);
      setCwd(res.cwd);
      return;
    }

    const entry: CmdEntry = { cmd, output: res.out, cwd: res.cwd };
    const nextHistory = [...history, entry];
    setHistory(nextHistory);
    setCwd(res.cwd);
    setLines((l) => [...l, { prompt: promptStr, text: cmd }, ...(res.out ? [{ text: res.out }] : [])]);

    if (drill.validate(nextHistory)) {
      setLines((l) => [...l, { text: `\u2713 ${drill.success}` }]);
      onSolve();
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") submit();
    else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (recall.length === 0) return;
      const idx = recallIdx === -1 ? recall.length - 1 : Math.max(0, recallIdx - 1);
      setRecallIdx(idx);
      setInput(recall[idx]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (recallIdx === -1) return;
      const idx = recallIdx + 1;
      if (idx >= recall.length) {
        setRecallIdx(-1);
        setInput("");
      } else {
        setRecallIdx(idx);
        setInput(recall[idx]);
      }
    }
  };

  return (
    <div className="rounded-xl overflow-hidden border border-border/60 bg-[#0b1020]">
      <div className="flex items-center justify-between px-3 py-2 bg-[#0b1020] border-b border-white/10">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          <span className="ml-2 text-[11px] text-white/40 font-mono">bash — practice</span>
        </div>
        <button onClick={reset} className="text-white/40 hover:text-white/80 transition-colors" title="Reset session">
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>
      <div
        className="h-[340px] overflow-y-auto px-4 py-3 font-mono text-[13px] leading-relaxed cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {lines.map((l, i) => (
          <div key={i} className="whitespace-pre-wrap break-words">
            {l.prompt ? (
              <span>
                <span className="text-emerald-400">{l.prompt}</span> <span className="text-white/90">{l.text}</span>
              </span>
            ) : (
              <span className={l.text.startsWith("\u2713") ? "text-emerald-400" : "text-white/70"}>{l.text}</span>
            )}
          </div>
        ))}
        <div className="flex items-center">
          <span className="text-emerald-400 mr-2">{promptStr}</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            autoFocus
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            className="flex-1 bg-transparent outline-none text-white/90 caret-emerald-400"
          />
        </div>
        <div ref={endRef} />
      </div>
      <div className="px-3 py-2 border-t border-white/10 flex flex-wrap gap-1.5">
        {["pwd", "ls -a", "cd /var/log", "cat", "grep", "find", "help"].map((c) => (
          <button
            key={c}
            onClick={() => {
              setInput((v) => (v ? v + " " : "") + c);
              inputRef.current?.focus();
            }}
            className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80 transition-colors"
          >
            {c}
          </button>
        ))}
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto h-6 text-[11px] text-white/50 hover:text-white"
          onClick={reset}
        >
          Reset
        </Button>
      </div>
    </div>
  );
}
