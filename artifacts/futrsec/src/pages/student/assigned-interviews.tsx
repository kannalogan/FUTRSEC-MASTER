import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import {
  useStudentAssignedInterviews, useStartAssignedInterview,
  MI_TRACK_LABELS, MI_TYPE_LABELS,
  type MIStudentAssignment, type MIEvaluation,
} from "@/lib/mock-interview-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { PageHeader, GridSkeleton, EmptyState } from "@/components/page-shell";
import { useToast } from "@/hooks/use-toast";
import {
  ClipboardList, Loader2, Send, ArrowRight, Trophy, CheckCircle2, AlertTriangle,
  Clock, Play, RotateCcw, X, Calendar,
} from "lucide-react";

const STATUS_BADGE: Record<string, string> = {
  assigned: "bg-muted text-muted-foreground border-border",
  in_progress: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  completed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  expired: "bg-destructive/15 text-destructive border-destructive/30",
};

type AnswerRes = { done: boolean; answered: number; total: number; index: number | null; question: string | null };
type FinishRes = { interviewId: number; overallScore: number; evaluation: MIEvaluation; provider: string };

interface ActiveState {
  assignmentId: number;
  interviewId: number;
  title: string;
  total: number;
  index: number;
  question: string;
}

export default function StudentAssignedInterviewsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data, isLoading } = useStudentAssignedInterviews();
  const startMut = useStartAssignedInterview();
  const [active, setActive] = useState<ActiveState | null>(null);
  const [result, setResult] = useState<FinishRes | null>(null);
  const [finalizing, setFinalizing] = useState<number | null>(null);

  const begin = async (a: MIStudentAssignment) => {
    try {
      const r = await startMut.mutateAsync(a.assignmentId);
      if (r.index === null || r.question === null) {
        // All questions answered. If the attempt was never finalized
        // (e.g. a prior finish failed), finalize it now so the mentor
        // receives the score — never leave it stuck in_progress.
        if (r.status !== "completed") {
          setFinalizing(a.assignmentId);
          try {
            const fin = await apiFetch<FinishRes>(`/api/ai/interview/${r.interviewId}/finish`, { method: "POST" });
            qc.invalidateQueries({ queryKey: ["mi", "student"] });
            qc.invalidateQueries({ queryKey: ["ai", "interviews"] });
            setResult(fin);
          } catch (e) {
            toast({ title: "Could not finalize", description: (e as Error).message, variant: "destructive" });
          } finally {
            setFinalizing(null);
          }
        } else {
          toast({ title: "Already completed", description: "This interview has no remaining questions." });
        }
        return;
      }
      setResult(null);
      setActive({
        assignmentId: a.assignmentId,
        interviewId: r.interviewId,
        title: a.title,
        total: r.totalQuestions,
        index: r.index,
        question: r.question,
      });
    } catch (e) {
      toast({ title: "Could not start", description: (e as Error).message, variant: "destructive" });
    }
  };

  if (active) {
    return <ActiveInterview state={active} onExit={() => setActive(null)} onFinished={(r) => { setActive(null); setResult(r); }} />;
  }

  return (
    <div className="p-5 lg:p-8 max-w-5xl mx-auto">
      <PageHeader
        icon={ClipboardList}
        title="Assigned Interviews"
        subtitle="Mock interviews your mentor assigned. Scores and feedback are shared with them."
      />

      {result && <ResultBanner result={result} onDismiss={() => setResult(null)} />}

      {isLoading ? (
        <GridSkeleton cols={2} rows={2} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No assigned interviews"
          description="When your mentor assigns a mock interview, it will appear here."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.map((a) => (
            <Card key={a.assignmentId} className="glass-card flex flex-col">
              <CardContent className="p-5 flex flex-col gap-3 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground leading-tight">{a.title}</h3>
                    {a.careerTrack && <p className="text-xs text-muted-foreground mt-0.5">{MI_TRACK_LABELS[a.careerTrack] ?? a.careerTrack}</p>}
                  </div>
                  <Badge variant="outline" className={`capitalize shrink-0 ${STATUS_BADGE[a.status] ?? ""}`}>{a.status.replace("_", " ")}</Badge>
                </div>

                {a.description && <p className="text-sm text-muted-foreground line-clamp-2">{a.description}</p>}

                <div className="flex flex-wrap gap-1.5">
                  {a.interviewType && <Badge variant="outline">{MI_TYPE_LABELS[a.interviewType] ?? a.interviewType}</Badge>}
                  {a.difficulty && <Badge variant="outline" className="capitalize">{a.difficulty}</Badge>}
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {a.totalQuestions != null && <span className="flex items-center gap-1"><ClipboardList className="h-3.5 w-3.5" />{a.totalQuestions} Qs</span>}
                  {a.durationMin != null && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{a.durationMin}m</span>}
                  {a.dueAt && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Due {new Date(a.dueAt).toLocaleDateString("en-IN")}</span>}
                </div>

                <div className="mt-auto pt-2">
                  {a.status === "completed" ? (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Completed</span>
                      {a.score != null && <Badge variant="outline">{a.score}/100</Badge>}
                    </div>
                  ) : a.status === "in_progress" ? (
                    <Button className="w-full" onClick={() => begin(a)} disabled={startMut.isPending || finalizing === a.assignmentId}>
                      {startMut.isPending || finalizing === a.assignmentId ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-1.5" />}Resume
                    </Button>
                  ) : (
                    <Button className="w-full" onClick={() => begin(a)} disabled={startMut.isPending || finalizing === a.assignmentId}>
                      {startMut.isPending || finalizing === a.assignmentId ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Play className="h-4 w-4 mr-1.5" />}Start
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ActiveInterview({ state, onExit, onFinished }: { state: ActiveState; onExit: () => void; onFinished: (r: FinishRes) => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [question, setQuestion] = useState(state.question);
  const [index, setIndex] = useState(state.index);
  const [answer, setAnswer] = useState("");

  const answerMut = useMutation({
    mutationFn: (text: string) => apiFetch<AnswerRes>(`/api/ai/interview/${state.interviewId}/answer`, {
      method: "POST", body: JSON.stringify({ answer: text }),
    }),
    onSuccess: (d) => {
      if (d.done) { finishMut.mutate(); }
      else { setQuestion(d.question ?? ""); setIndex(d.index ?? 0); setAnswer(""); }
    },
    onError: (e) => toast({ title: "Submit failed", description: (e as Error).message, variant: "destructive" }),
  });

  const finishMut = useMutation({
    mutationFn: () => apiFetch<FinishRes>(`/api/ai/interview/${state.interviewId}/finish`, { method: "POST" }),
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["mi", "student"] });
      qc.invalidateQueries({ queryKey: ["ai", "interviews"] });
      onFinished(d);
    },
    onError: (e) => toast({ title: "Finish failed", description: (e as Error).message, variant: "destructive" }),
  });

  const busy = answerMut.isPending || finishMut.isPending;
  const submit = () => { if (answer.trim() && !busy) answerMut.mutate(answer.trim()); };

  return (
    <div className="p-5 lg:p-8 max-w-3xl mx-auto flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">{state.title}</h1>
          <p className="text-sm text-muted-foreground">Question {index + 1} of {state.total}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onExit} className="text-muted-foreground"><X className="h-4 w-4 mr-1.5" />Save & exit</Button>
      </div>

      <Card className="bg-card border-border/60">
        <CardContent className="pt-5 space-y-4">
          <Progress value={(index / state.total) * 100} className="h-1.5" />
          <p className="text-base font-medium text-foreground">{question}</p>
          <Textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer here…"
            className="min-h-[160px] text-sm"
            disabled={busy}
          />
          <div className="flex items-center">
            <Button className="ml-auto" onClick={submit} disabled={!answer.trim() || busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" />
                : index + 1 >= state.total ? <>Finish <Trophy className="h-4 w-4 ml-1.5" /></> : <>Next <ArrowRight className="h-4 w-4 ml-1.5" /></>}
            </Button>
          </div>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground text-center">Your progress is saved automatically — you can exit and resume later.</p>
    </div>
  );
}

function ResultBanner({ result, onDismiss }: { result: FinishRes; onDismiss: () => void }) {
  const e = result.evaluation;
  const color = result.overallScore >= 70 ? "#10B981" : result.overallScore >= 50 ? "#F97316" : "#EF4444";
  return (
    <Card className="glass-card mb-6 border-primary/30">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2"><Trophy className="h-4 w-4 text-primary" />Interview complete</CardTitle>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDismiss}><X className="h-4 w-4" /></Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="inline-flex h-16 w-16 rounded-full items-center justify-center shrink-0" style={{ backgroundColor: `${color}15` }}>
            <span className="text-2xl font-bold" style={{ color }}>{result.overallScore}</span>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Overall score · shared with your mentor</p>
            <Badge variant="outline" className="mt-1 text-[10px]">{result.provider !== "mock" ? `Live AI · ${result.provider}` : "Offline scoring"}</Badge>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {Object.entries(e.scores).map(([k, v]) => (
            <div key={k}>
              <div className="flex justify-between text-xs mb-1"><span className="capitalize font-medium">{k}</span><span className="text-muted-foreground">{v}/100</span></div>
              <Progress value={v} className="h-1.5" />
            </div>
          ))}
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {e.strengths.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-1.5 flex items-center gap-1.5 text-emerald-600"><CheckCircle2 className="h-4 w-4" />Strengths</p>
              <ul className="text-sm space-y-1 text-foreground/90">{e.strengths.map((s, i) => <li key={i} className="flex gap-2"><span className="text-emerald-600">•</span>{s}</li>)}</ul>
            </div>
          )}
          {e.weaknesses.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-1.5 flex items-center gap-1.5 text-amber-600"><AlertTriangle className="h-4 w-4" />Improve</p>
              <ul className="text-sm space-y-1 text-foreground/90">{e.weaknesses.map((s, i) => <li key={i} className="flex gap-2"><span className="text-amber-600">•</span>{s}</li>)}</ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
