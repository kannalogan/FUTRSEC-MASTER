import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { printReport, escapeHtml } from "@/lib/print-report";
import { useVoiceStatus, useVoiceRecorder } from "@/lib/voice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import {
  Mic2, Send, Loader2, Download, RotateCcw, Trophy, Mic, Square,
  CheckCircle2, AlertTriangle, ArrowRight, History,
} from "lucide-react";

type StartRes = { interviewId: number; interviewType: string; difficulty: string; totalQuestions: number; trackName: string; index: number; question: string };
type AnswerRes = { done: boolean; answered: number; total: number; index: number | null; question: string | null };
type Evaluation = {
  scores: { technical: number; grammar: number; communication: number; confidence: number; thinking: number; quality: number };
  overall: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  perQuestion: Array<{ question: string; answer: string; score: number; feedback: string }>;
};
type FinishRes = { interviewId: number; overallScore: number; evaluation: Evaluation; provider: string };
type InterviewListItem = { id: number; status: string; interviewType: string; difficulty: string; totalQuestions: number; overallScore: number | null; completedAt: string | null; createdAt: string };

type Phase = "setup" | "active" | "result";

export default function AIMockInterview() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced">("intermediate");
  const [interviewType, setInterviewType] = useState<"text" | "voice">("text");
  const [totalQuestions, setTotalQuestions] = useState(5);

  const [interviewId, setInterviewId] = useState<number | null>(null);
  const [question, setQuestion] = useState("");
  const [index, setIndex] = useState(0);
  const [total, setTotal] = useState(5);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<FinishRes | null>(null);

  const qc = useQueryClient();
  const voiceStatus = useVoiceStatus();
  const recorder = useVoiceRecorder();

  const startMut = useMutation({
    mutationFn: () => apiFetch<StartRes>("/api/ai/interview/start", {
      method: "POST",
      body: JSON.stringify({ interviewType, difficulty, totalQuestions }),
    }),
    onSuccess: (d) => {
      setInterviewId(d.interviewId);
      setQuestion(d.question);
      setIndex(d.index);
      setTotal(d.totalQuestions);
      setAnswer("");
      setPhase("active");
    },
  });

  const answerMut = useMutation({
    mutationFn: (text: string) => apiFetch<AnswerRes>(`/api/ai/interview/${interviewId}/answer`, {
      method: "POST",
      body: JSON.stringify({ answer: text }),
    }),
    onSuccess: (d) => {
      if (d.done) {
        finishMut.mutate();
      } else {
        setQuestion(d.question ?? "");
        setIndex(d.index ?? 0);
        setAnswer("");
      }
    },
  });

  const finishMut = useMutation({
    mutationFn: () => apiFetch<FinishRes>(`/api/ai/interview/${interviewId}/finish`, { method: "POST" }),
    onSuccess: (d) => {
      setResult(d);
      setPhase("result");
      qc.invalidateQueries({ queryKey: ["ai", "interviews"] });
    },
  });

  const submitAnswer = () => {
    if (!answer.trim() || answerMut.isPending || finishMut.isPending) return;
    answerMut.mutate(answer.trim());
  };

  const handleVoice = async () => {
    if (recorder.recording) {
      const text = await recorder.stopAndTranscribe();
      if (text) setAnswer((prev) => (prev ? prev + " " : "") + text);
    } else {
      recorder.start();
    }
  };

  const reset = () => {
    setPhase("setup");
    setInterviewId(null);
    setResult(null);
    setAnswer("");
  };

  return (
    <div className="p-5 lg:p-8 max-w-3xl mx-auto flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-rose-100 flex items-center justify-center">
          <Mic2 className="h-5 w-5 text-rose-600" />
        </div>
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">AI Mock Interview</h1>
          <p className="text-sm text-muted-foreground">Practice track-specific interview questions and get scored feedback</p>
        </div>
      </div>

      {phase === "setup" && (
        <SetupPanel
          difficulty={difficulty} setDifficulty={setDifficulty}
          interviewType={interviewType} setInterviewType={setInterviewType}
          totalQuestions={totalQuestions} setTotalQuestions={setTotalQuestions}
          voiceAvailable={!!voiceStatus.data?.input}
          onStart={() => startMut.mutate()}
          starting={startMut.isPending}
          error={startMut.isError ? (startMut.error as Error).message : null}
        />
      )}

      {phase === "active" && (
        <Card className="bg-card border-border/60">
          <CardContent className="pt-5 space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="outline">Question {index + 1} of {total}</Badge>
              <span className="text-xs text-muted-foreground capitalize">{difficulty} · {interviewType}</span>
            </div>
            <Progress value={(index / total) * 100} className="h-1.5" />
            <p className="text-base font-medium text-foreground">{question}</p>

            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer here… (or use the mic if voice is available)"
              className="min-h-[140px] text-sm"
              disabled={answerMut.isPending || finishMut.isPending}
            />

            {recorder.error && <p className="text-xs text-red-600">{recorder.error}</p>}

            <div className="flex items-center gap-2">
              {voiceStatus.data?.input && (
                <Button type="button" variant={recorder.recording ? "destructive" : "outline"} size="sm"
                  onClick={handleVoice} disabled={recorder.transcribing || answerMut.isPending}>
                  {recorder.transcribing ? <Loader2 className="h-4 w-4 animate-spin" /> : recorder.recording ? <><Square className="h-4 w-4 mr-1.5" />Stop & Transcribe</> : <><Mic className="h-4 w-4 mr-1.5" />Record</>}
                </Button>
              )}
              <Button className="ml-auto" onClick={submitAnswer} disabled={!answer.trim() || answerMut.isPending || finishMut.isPending}>
                {answerMut.isPending || finishMut.isPending
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : index + 1 >= total ? <>Finish <Trophy className="h-4 w-4 ml-1.5" /></> : <>Next <ArrowRight className="h-4 w-4 ml-1.5" /></>}
              </Button>
            </div>
            {(answerMut.isError || finishMut.isError) && (
              <p className="text-xs text-red-600">{((answerMut.error || finishMut.error) as Error)?.message}</p>
            )}
          </CardContent>
        </Card>
      )}

      {phase === "result" && result && <ResultPanel result={result} onReset={reset} difficulty={difficulty} />}

      <PastInterviews />
    </div>
  );
}

function SetupPanel(props: {
  difficulty: string; setDifficulty: (d: any) => void;
  interviewType: string; setInterviewType: (t: any) => void;
  totalQuestions: number; setTotalQuestions: (n: number) => void;
  voiceAvailable: boolean; onStart: () => void; starting: boolean; error: string | null;
}) {
  return (
    <Card className="bg-card border-border/60">
      <CardContent className="pt-5 space-y-5">
        <Field label="Difficulty">
          <div className="flex gap-2">
            {["beginner", "intermediate", "advanced"].map((d) => (
              <Chip key={d} active={props.difficulty === d} onClick={() => props.setDifficulty(d)}>{d}</Chip>
            ))}
          </div>
        </Field>
        <Field label="Number of questions">
          <div className="flex gap-2">
            {[3, 5, 8].map((n) => <Chip key={n} active={props.totalQuestions === n} onClick={() => props.setTotalQuestions(n)}>{n}</Chip>)}
          </div>
        </Field>
        <Field label="Mode">
          <div className="flex gap-2">
            <Chip active={props.interviewType === "text"} onClick={() => props.setInterviewType("text")}>Text</Chip>
            <Chip active={props.interviewType === "voice"} onClick={() => props.setInterviewType("voice")} disabled={!props.voiceAvailable}>
              Voice {props.voiceAvailable ? "" : "(unavailable)"}
            </Chip>
          </div>
          {!props.voiceAvailable && <p className="text-[11px] text-muted-foreground mt-1.5">Voice transcription needs an AI provider with audio support. You can still answer by typing.</p>}
        </Field>
        {props.error && <p className="text-xs text-red-600">{props.error}</p>}
        <Button className="w-full" onClick={props.onStart} disabled={props.starting}>
          {props.starting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Mic2 className="h-4 w-4 mr-1.5" />}
          Start Interview
        </Button>
      </CardContent>
    </Card>
  );
}

function ResultPanel({ result, onReset, difficulty }: { result: FinishRes; onReset: () => void; difficulty: string }) {
  const e = result.evaluation;
  const scoreColor = result.overallScore >= 70 ? "#10B981" : result.overallScore >= 50 ? "#F97316" : "#EF4444";

  const exportPdf = () => {
    const html = `
      <h2>Overall Score: ${result.overallScore}/100</h2>
      <div class="grid">
        ${Object.entries(e.scores).map(([k, v]) => `<div class="stat"><div class="label">${escapeHtml(k)}</div><div class="value">${v}</div></div>`).join("")}
      </div>
      <h2>Strengths</h2><ul>${e.strengths.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>
      <h2>Areas to Improve</h2><ul>${e.weaknesses.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>
      <h2>Recommendations</h2><ul>${e.recommendations.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>
      <h2>Question-by-Question</h2>
      ${e.perQuestion.map((q, i) => `<h3>Q${i + 1} — ${q.score}/100</h3><p><strong>Q:</strong> ${escapeHtml(q.question)}</p><p><strong>Your answer:</strong> ${escapeHtml(q.answer || "(no answer)")}</p><p><strong>Feedback:</strong> ${escapeHtml(q.feedback)}</p>`).join("")}`;
    printReport(`Mock Interview Report (${difficulty})`, html);
  };

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border/60">
        <CardContent className="pt-6 text-center space-y-3">
          <div className="inline-flex h-20 w-20 rounded-full items-center justify-center" style={{ backgroundColor: `${scoreColor}15` }}>
            <span className="text-3xl font-bold" style={{ color: scoreColor }}>{result.overallScore}</span>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Overall Interview Score</p>
            <Badge variant="outline" className="mt-1 text-[10px]">{result.provider !== "mock" ? `Live AI · ${result.provider}` : "Offline scoring"}</Badge>
          </div>
          <div className="flex justify-center gap-2 pt-1">
            <Button size="sm" onClick={exportPdf}><Download className="h-3.5 w-3.5 mr-1.5" />Export PDF</Button>
            <Button size="sm" variant="outline" onClick={onReset}><RotateCcw className="h-3.5 w-3.5 mr-1.5" />New Interview</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border/60">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Score Breakdown</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3">
          {Object.entries(e.scores).map(([k, v]) => (
            <div key={k}>
              <div className="flex justify-between text-xs mb-1"><span className="capitalize font-medium">{k}</span><span className="text-muted-foreground">{v}/100</span></div>
              <Progress value={v} className="h-1.5" />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        <ListCard title="Strengths" icon={CheckCircle2} color="#10B981" items={e.strengths} />
        <ListCard title="Areas to Improve" icon={AlertTriangle} color="#F97316" items={e.weaknesses} />
      </div>
      <ListCard title="Recommendations" icon={ArrowRight} color="#2563EB" items={e.recommendations} />

      <Card className="bg-card border-border/60">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Question-by-Question</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {e.perQuestion.map((q, i) => (
            <div key={i} className="border-b border-border/40 pb-3 last:border-0 last:pb-0">
              <div className="flex justify-between gap-2">
                <p className="text-sm font-medium">Q{i + 1}. {q.question}</p>
                <Badge variant="outline" className="text-[10px] shrink-0">{q.score}/100</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 italic">"{q.answer || "(no answer)"}"</p>
              <p className="text-xs text-foreground/80 mt-1">{q.feedback}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function PastInterviews() {
  const { data } = useQuery({
    queryKey: ["ai", "interviews"],
    queryFn: () => apiFetch<InterviewListItem[]>("/api/ai/interviews"),
  });
  if (!data || data.length === 0) return null;
  return (
    <Card className="bg-card border-border/60">
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><History className="h-4 w-4 text-muted-foreground" />Past Interviews</CardTitle></CardHeader>
      <CardContent className="space-y-1.5">
        {data.slice(0, 6).map((it) => (
          <div key={it.id} className="flex items-center justify-between text-sm border-b border-border/40 pb-1.5 last:border-0 last:pb-0">
            <span className="text-muted-foreground capitalize">{it.difficulty} · {it.interviewType} · {it.totalQuestions} Qs</span>
            <span className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">{new Date(it.createdAt).toLocaleDateString("en-IN")}</span>
              {it.overallScore != null ? <Badge variant="outline" className="text-[10px]">{it.overallScore}/100</Badge> : <Badge variant="outline" className="text-[10px] capitalize">{it.status.replace("_", " ")}</Badge>}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>{children}</div>;
}
function Chip({ active, onClick, disabled, children }: { active: boolean; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`text-xs px-3 py-1.5 rounded-full border capitalize transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${active ? "bg-rose-600 text-white border-rose-600" : "border-border/60 text-muted-foreground hover:border-rose-300"}`}>
      {children}
    </button>
  );
}
function ListCard({ title, icon: Icon, color, items }: { title: string; icon: any; color: string; items: string[] }) {
  return (
    <Card className="bg-card border-border/60">
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Icon className="h-4 w-4" style={{ color }} />{title}</CardTitle></CardHeader>
      <CardContent><ul className="space-y-1.5 text-sm">{items.map((it, i) => <li key={i} className="flex gap-2"><span style={{ color }} className="mt-0.5">•</span><span className="text-foreground/90">{it}</span></li>)}</ul></CardContent>
    </Card>
  );
}
