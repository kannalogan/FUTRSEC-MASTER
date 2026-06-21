import { useEffect, useRef, useState } from "react";
import type { PythonDrill } from "./drills";
import { Button } from "@/components/ui/button";
import { Play, Loader2, CheckCircle2, XCircle, RotateCcw } from "lucide-react";

const PYODIDE_VERSION = "0.26.4";
const PYODIDE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/pyodide.js`;

interface PyodideApi {
  runPythonAsync: (code: string) => Promise<unknown>;
  setStdout: (opts: { batched: (s: string) => void }) => void;
  setStderr: (opts: { batched: (s: string) => void }) => void;
}

declare global {
  interface Window {
    loadPyodide?: (opts: { indexURL: string }) => Promise<PyodideApi>;
    __futrsecPyodide?: Promise<PyodideApi>;
  }
}

function loadPyodideOnce(): Promise<PyodideApi> {
  if (window.__futrsecPyodide) return window.__futrsecPyodide;
  const promise = new Promise<PyodideApi>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-pyodide]`);
    const start = () => {
      if (!window.loadPyodide) {
        reject(new Error("Pyodide script loaded but loadPyodide is unavailable."));
        return;
      }
      window
        .loadPyodide({ indexURL: `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/` })
        .then(resolve)
        .catch(reject);
    };
    if (existing) {
      if (window.loadPyodide) start();
      else existing.addEventListener("load", start, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = PYODIDE_URL;
    script.async = true;
    script.dataset.pyodide = "true";
    script.onload = start;
    script.onerror = () => {
      script.remove();
      reject(new Error("Failed to load the Python runtime (network blocked?)."));
    };
    document.head.appendChild(script);
  });
  // On failure, clear the cache so the user can retry after network recovery.
  promise.catch(() => {
    window.__futrsecPyodide = undefined;
  });
  window.__futrsecPyodide = promise;
  return promise;
}

export function PythonLab({ drill, onSolve }: { drill: PythonDrill; onSolve: () => void }) {
  const [code, setCode] = useState(drill.starter);
  const [output, setOutput] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "loading" | "running" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [correct, setCorrect] = useState(false);
  const pyRef = useRef<PyodideApi | null>(null);

  useEffect(() => {
    setCode(drill.starter);
    setOutput("");
    setStatus("idle");
    setErrorMsg("");
    setCorrect(false);
  }, [drill.id, drill.starter]);

  const run = async () => {
    setErrorMsg("");
    setOutput("");
    setCorrect(false);
    try {
      if (!pyRef.current) {
        setStatus("loading");
        pyRef.current = await loadPyodideOnce();
      }
      const py = pyRef.current;
      setStatus("running");
      let captured = "";
      py.setStdout({ batched: (s) => (captured += s + "\n") });
      py.setStderr({ batched: (s) => (captured += s + "\n") });
      await py.runPythonAsync(code);
      const trimmed = captured.replace(/\n+$/, "");
      setOutput(trimmed || "(no output)");
      const ok = trimmed.trim() === drill.expectedOutput.trim();
      setCorrect(ok);
      setStatus("done");
      if (ok) onSolve();
    } catch (e) {
      const msg = (e as Error).message || String(e);
      setErrorMsg(msg);
      setStatus("error");
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl overflow-hidden border border-border/60 bg-[#0b1020]">
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
          <span className="text-[11px] text-white/40 font-mono">solution.py</span>
          <button
            onClick={() => {
              setCode(drill.starter);
              setOutput("");
              setStatus("idle");
              setCorrect(false);
            }}
            className="text-white/40 hover:text-white/80 transition-colors"
            title="Reset code"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          rows={9}
          className="w-full bg-transparent text-white/90 font-mono text-[13px] leading-relaxed px-4 py-3 outline-none resize-y"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={run} disabled={status === "loading" || status === "running"}>
          {status === "loading" ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Loading Python…
            </>
          ) : status === "running" ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Running…
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5 mr-1.5" /> Run
            </>
          )}
        </Button>
        {status === "loading" && (
          <span className="text-xs text-muted-foreground">First run downloads the Python runtime (~a few seconds).</span>
        )}
      </div>

      {(output || status === "error") && (
        <div className="rounded-lg border border-border/60 bg-[#0b1020] px-4 py-3 font-mono text-[13px]">
          <div className="text-[11px] text-white/40 mb-1">output</div>
          {status === "error" ? (
            <pre className="text-red-300 whitespace-pre-wrap break-words">{errorMsg}</pre>
          ) : (
            <pre className="text-white/90 whitespace-pre-wrap break-words">{output}</pre>
          )}
        </div>
      )}

      {status === "done" &&
        (correct ? (
          <p className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" /> {drill.success}
          </p>
        ) : (
          <p className="flex items-center gap-1 text-muted-foreground text-xs">
            <XCircle className="h-3.5 w-3.5" /> Expected output <code className="mx-1 px-1 rounded bg-muted">{drill.expectedOutput}</code> — keep going.
          </p>
        ))}
    </div>
  );
}
