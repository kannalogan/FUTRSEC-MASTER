import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Simulator } from "./simulators";
import {
  ChevronLeft, Clock, Trophy, Target, CheckCircle2, Lightbulb,
  Flag, AlertCircle, Loader2, Lock, PartyPopper,
} from "lucide-react";

const DIFF_COLORS: Record<string, string> = {
  beginner: "#10B981", intermediate: "#F97316", advanced: "#EF4444",
};

function fmtTime(s: number) {
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function describeFailures(failures?: string[]): string {
  if (!failures || failures.length === 0) return "Adjust your command and try again.";
  return failures.join(" ");
}

function ModuleCard({
  mod, index, labId, onSolved,
}: { mod: any; index: number; labId: number; onSolved: () => void }) {
  const { toast } = useToast();
  const isCommand = mod.validationType === "command" || mod.hasCommandSpec;
  const [flag, setFlag] = useState("");
  const [failures, setFailures] = useState<string[] | null>(null);
  const [hint, setHint] = useState<string | null>(mod.hint ?? null);
  const [showHint, setShowHint] = useState(false);

  const submit = useMutation({
    mutationFn: (value: string) =>
      apiFetch<any>(
        isCommand
          ? `/api/labs/${labId}/modules/${mod.id}/command`
          : `/api/labs/${labId}/modules/${mod.id}/flag`,
        {
          method: "POST",
          body: JSON.stringify(isCommand ? { command: value } : { flag: value }),
        },
      ),
    onSuccess: (res) => {
      if (res.correct) {
        setFailures(null);
        toast({ title: `+${res.pointsAwarded ?? 0} points`, description: isCommand ? "Command accepted — task solved!" : "Correct flag — task solved!" });
        setFlag("");
        onSolved();
      } else if (isCommand) {
        setFailures(res.failures ?? []);
        toast({ title: "Not quite", description: describeFailures(res.failures), variant: "destructive" });
      } else {
        toast({ title: "Incorrect", description: res.message ?? "Try again.", variant: "destructive" });
      }
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const hintMut = useMutation({
    mutationFn: () => apiFetch<any>(`/api/labs/${labId}/modules/${mod.id}/hint`, { method: "POST", body: JSON.stringify({}) }),
    onSuccess: (res) => { setHint(res.hint); setShowHint(true); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const solved = mod.solved;

  return (
    <div className={`rounded-xl border p-3.5 ${solved ? "border-success/30 bg-success/10" : "border-border/60 bg-card"}`}>
      <div className="flex items-start gap-2.5">
        <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
          solved ? "bg-success text-white" : "bg-primary/10 text-primary"
        }`}>
          {solved ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">{mod.title}</p>
            <span className="text-[11px] font-medium text-primary shrink-0">{mod.points} pts</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{mod.taskDescription}</p>

          {solved ? (
            <div className="mt-2 text-xs text-success bg-success/10 rounded-lg px-2.5 py-2">
              <span className="font-semibold">Solved.</span> {mod.solutionExplanation}
            </div>
          ) : (
            <div className="mt-2.5 space-y-2">
              <div className="flex gap-1.5">
                {isCommand && <span className="flex items-center text-xs font-mono text-muted-foreground select-none">$</span>}
                <Input
                  value={flag}
                  onChange={(e) => { setFlag(e.target.value); if (failures) setFailures(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter" && flag.trim()) submit.mutate(flag); }}
                  placeholder={isCommand ? "Type the command that completes this task…" : "Enter flag / answer…"}
                  className="h-8 text-xs font-mono"
                />
                <Button
                  size="sm" className="h-8 text-xs gap-1 shrink-0"
                  disabled={!flag.trim() || submit.isPending}
                  onClick={() => submit.mutate(flag)}
                >
                  {submit.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : isCommand ? <Target className="h-3 w-3" /> : <Flag className="h-3 w-3" />}
                  {isCommand ? "Run" : "Submit"}
                </Button>
              </div>
              {isCommand && failures && failures.length > 0 && (
                <ul className="space-y-1 rounded-lg bg-destructive/10 px-2.5 py-2">
                  {failures.map((f, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[11px] text-destructive">
                      <AlertCircle className="h-3 w-3 mt-px shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex items-center gap-2">
                <Button
                  size="sm" variant="ghost"
                  className="h-7 text-[11px] gap-1 text-warning hover:text-warning/80 hover:bg-warning/10 px-2"
                  onClick={() => (hint ? setShowHint((s) => !s) : hintMut.mutate())}
                  disabled={hintMut.isPending}
                >
                  <Lightbulb className="h-3 w-3" />
                  {showHint ? "Hide hint" : "Hint"}
                </Button>
              </div>
              {showHint && hint && (
                <p className="text-[11px] text-warning bg-warning/10 rounded-lg px-2.5 py-1.5">{hint}</p>
              )}
              {showHint && !hint && (
                <p className="text-[11px] text-muted-foreground">No hint available for this task.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LabWorkspacePage() {
  const [, params] = useRoute("/labs/:labId");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const labId = Number(params?.labId);
  const [seconds, setSeconds] = useState(0);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["lab", labId],
    queryFn: () => apiFetch<any>(`/api/labs/${labId}`),
    enabled: Number.isFinite(labId),
  });

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const finishMut = useMutation({
    mutationFn: () => apiFetch<any>(`/api/labs/${labId}/finish`, { method: "POST", body: JSON.stringify({ findings: "" }) }),
    onSuccess: (res) => {
      toast({ title: "Lab completed!", description: `Final score: ${res.score} points.` });
      qc.invalidateQueries({ queryKey: ["labs"] });
      qc.invalidateQueries({ queryKey: ["lab", labId] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["lab", labId] });
    qc.invalidateQueries({ queryKey: ["labs"] });
  };

  const modules: any[] = data?.modules ?? [];
  const solvedCount = useMemo(() => modules.filter((m) => m.solved).length, [modules]);
  const pct = modules.length ? Math.round((solvedCount / modules.length) * 100) : 0;
  const allSolved = modules.length > 0 && solvedCount === modules.length;
  const completed = data?.activeAttempt?.status === "completed";

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <Skeleton className="h-[70vh] lg:col-span-3 rounded-xl" />
          <Skeleton className="h-[70vh] lg:col-span-6 rounded-xl" />
          <Skeleton className="h-[70vh] lg:col-span-3 rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError) {
    const msg = (error as Error)?.message ?? "Failed to load lab";
    const forbidden = /denied|track/i.test(msg);
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
        {forbidden ? <Lock className="h-10 w-10 text-muted-foreground mb-3" /> : <AlertCircle className="h-10 w-10 text-destructive mb-3" />}
        <p className="text-sm text-foreground font-medium">{forbidden ? "This lab is locked to a different track" : "Could not load lab"}</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">{msg}</p>
        <Button variant="outline" className="mt-4 gap-1" onClick={() => navigate("/labs")}>
          <ChevronLeft className="h-4 w-4" />Back to Labs
        </Button>
      </div>
    );
  }

  const lab = data.lab;
  const diff = lab.difficulty ?? "beginner";

  return (
    <div className="flex flex-col h-[calc(100vh-0px)]">
      {/* Header */}
      <div className="px-5 lg:px-6 py-3 border-b border-border/60 flex items-center justify-between gap-4 flex-wrap bg-background">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" className="gap-1 h-8 px-2 shrink-0" onClick={() => navigate("/labs")}>
            <ChevronLeft className="h-4 w-4" />Labs
          </Button>
          <div className="min-w-0">
            <h1 className="font-heading text-base lg:text-lg font-bold text-foreground truncate">{lab.title}</h1>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Badge className="text-[10px] px-1.5" style={{ backgroundColor: `${DIFF_COLORS[diff]}15`, color: DIFF_COLORS[diff] }}>{diff}</Badge>
              <span className="flex items-center gap-1"><Trophy className="h-3 w-3" />{lab.totalPoints} pts</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-sm font-mono text-foreground tabular-nums">
            <Clock className="h-4 w-4 text-muted-foreground" />{fmtTime(seconds)}
          </span>
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground">Score</p>
            <p className="text-sm font-bold text-foreground tabular-nums">{data.earnedPoints} / {lab.totalPoints}</p>
          </div>
        </div>
      </div>

      {/* 3-pane */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
        {/* Left: brief + progress */}
        <aside className="lg:col-span-3 border-r border-border/60 overflow-auto p-4 space-y-4">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Briefing</h2>
            <p className="text-sm text-foreground/90 leading-relaxed">{lab.description}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {lab.tags?.map((t: string) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
          </div>
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-semibold text-foreground">{solvedCount}/{modules.length} tasks</span>
            </div>
            <Progress value={pct} className="h-2" />
          </div>
          <div className="rounded-xl bg-muted/40 p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs"><Target className="h-3.5 w-3.5 text-orange-500 dark:text-orange-400" /><span className="text-muted-foreground">Objectives</span></div>
            <ul className="space-y-1.5">
              {modules.map((m, i) => (
                <li key={m.id} className="flex items-start gap-2 text-xs">
                  {m.solved ? <CheckCircle2 className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" /> : <span className="h-3.5 w-3.5 rounded-full border border-muted-foreground/40 mt-0.5 shrink-0" />}
                  <span className={m.solved ? "text-muted-foreground line-through" : "text-foreground/80"}>{i + 1}. {m.title}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Center: simulator */}
        <section className="lg:col-span-6 border-r border-border/60 overflow-hidden h-[55vh] lg:h-auto">
          <Simulator sim={lab.simulator} />
        </section>

        {/* Right: challenges */}
        <aside className="lg:col-span-3 overflow-auto p-4 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Challenges</h2>
          {allSolved && (
            <div className="rounded-xl border border-success/30 bg-success/10 p-3 flex items-center gap-2 text-sm text-success">
              <PartyPopper className="h-4 w-4" /> All tasks solved!
            </div>
          )}
          {modules.map((m, i) => (
            <ModuleCard key={m.id} mod={m} index={i} labId={labId} onSolved={refresh} />
          ))}
          <Button
            className="w-full gap-1.5"
            variant={completed ? "outline" : "default"}
            disabled={completed || finishMut.isPending || solvedCount === 0}
            onClick={() => finishMut.mutate()}
          >
            {completed ? <><CheckCircle2 className="h-4 w-4 text-success" />Lab Completed</> : finishMut.isPending ? "Submitting…" : "Finish & Submit Lab"}
          </Button>
          {solvedCount === 0 && !completed && (
            <p className="text-[11px] text-muted-foreground text-center">Solve at least one task before finishing.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
