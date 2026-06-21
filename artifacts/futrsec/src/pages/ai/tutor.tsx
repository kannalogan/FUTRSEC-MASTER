import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import {
  GraduationCap, Sparkles, Lightbulb, AlertTriangle, ArrowRight, FileText,
  HelpCircle, CheckCircle2, XCircle, Loader2, Wand2,
} from "lucide-react";

type ExplainResult = {
  explanation: string;
  keyPoints: string[];
  analogy: string;
  commonMistakes: string[];
  nextSteps: string[];
  provider: string;
};
type SummaryResult = { tldr: string; summary: string; bullets: string[]; provider: string };
type QuizQuestion = { id: number; question: string; options: string[]; answerIndex: number; explanation: string };

function ProviderTag({ provider }: { provider?: string }) {
  if (!provider) return null;
  const live = provider !== "mock";
  return (
    <Badge variant="outline" className={`text-[10px] ${live ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-amber-200 text-amber-700 bg-amber-50"}`}>
      <Sparkles className="h-3 w-3 mr-1" />
      {live ? `Live AI · ${provider}` : "Offline model"}
    </Badge>
  );
}

export default function AIExplainTutor() {
  return (
    <div className="p-5 lg:p-8 max-w-4xl mx-auto flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center">
          <GraduationCap className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">AI Explain Tutor</h1>
          <p className="text-sm text-muted-foreground">Understand any concept, summarize notes, and test yourself</p>
        </div>
      </div>

      <Tabs defaultValue="explain" className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="explain"><Wand2 className="h-3.5 w-3.5 mr-1.5" />Explain</TabsTrigger>
          <TabsTrigger value="summarize"><FileText className="h-3.5 w-3.5 mr-1.5" />Summarize</TabsTrigger>
          <TabsTrigger value="quiz"><HelpCircle className="h-3.5 w-3.5 mr-1.5" />Quiz</TabsTrigger>
        </TabsList>

        <TabsContent value="explain" className="mt-4"><ExplainPanel /></TabsContent>
        <TabsContent value="summarize" className="mt-4"><SummarizePanel /></TabsContent>
        <TabsContent value="quiz" className="mt-4"><QuizPanel /></TabsContent>
      </Tabs>
    </div>
  );
}

function ExplainPanel() {
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState<"beginner" | "advanced">("beginner");
  const mut = useMutation({
    mutationFn: (vars: { topic: string; level: string }) =>
      apiFetch<ExplainResult>("/api/ai/tutor/explain", { method: "POST", body: JSON.stringify(vars) }),
  });

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border/60">
        <CardContent className="pt-5 space-y-3">
          <div className="flex gap-2">
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && topic.trim() && mut.mutate({ topic, level })}
              placeholder="e.g. SQL injection, MITRE ATT&CK, ISO 27001…"
              className="flex-1"
            />
            <Button onClick={() => mut.mutate({ topic, level })} disabled={!topic.trim() || mut.isPending}>
              {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Explain <ArrowRight className="h-4 w-4 ml-1.5" /></>}
            </Button>
          </div>
          <div className="flex gap-2">
            {(["beginner", "advanced"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={`text-xs px-3 py-1.5 rounded-full border capitalize transition-colors ${
                  level === l ? "bg-indigo-600 text-white border-indigo-600" : "border-border/60 text-muted-foreground hover:border-indigo-300"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {mut.isError && <ErrorCard message={(mut.error as Error).message} />}

      {mut.data && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <Card className="bg-card border-border/60">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Explanation</CardTitle>
              <ProviderTag provider={mut.data.provider} />
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-relaxed">
              <p className="text-foreground">{mut.data.explanation}</p>
              <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-3">
                <div className="flex items-center gap-1.5 text-indigo-700 font-medium text-xs mb-1">
                  <Lightbulb className="h-3.5 w-3.5" /> Analogy
                </div>
                <p className="text-indigo-900/80">{mut.data.analogy}</p>
              </div>
            </CardContent>
          </Card>

          <div className="grid sm:grid-cols-2 gap-4">
            <ListCard title="Key Points" icon={CheckCircle2} color="#10B981" items={mut.data.keyPoints} />
            <ListCard title="Common Mistakes" icon={AlertTriangle} color="#F97316" items={mut.data.commonMistakes} />
          </div>
          <ListCard title="Next Steps" icon={ArrowRight} color="#2563EB" items={mut.data.nextSteps} />
        </motion.div>
      )}
    </div>
  );
}

function SummarizePanel() {
  const [content, setContent] = useState("");
  const mut = useMutation({
    mutationFn: (text: string) =>
      apiFetch<SummaryResult>("/api/ai/tutor/summarize", { method: "POST", body: JSON.stringify({ content: text }) }),
  });

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border/60">
        <CardContent className="pt-5 space-y-3">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste your study notes, an article, or a long passage to summarize…"
            className="min-h-[160px] text-sm"
          />
          <Button onClick={() => mut.mutate(content)} disabled={content.trim().length < 20 || mut.isPending}>
            {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <FileText className="h-4 w-4 mr-1.5" />}
            Summarize
          </Button>
          {content.trim().length > 0 && content.trim().length < 20 && (
            <p className="text-xs text-muted-foreground">Add at least 20 characters to summarize.</p>
          )}
        </CardContent>
      </Card>

      {mut.isError && <ErrorCard message={(mut.error as Error).message} />}

      {mut.data && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-card border-border/60">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Summary</CardTitle>
              <ProviderTag provider={mut.data.provider} />
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-relaxed">
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="text-xs font-medium text-muted-foreground mb-1">TL;DR</div>
                <p className="text-foreground font-medium">{mut.data.tldr}</p>
              </div>
              <p className="text-foreground">{mut.data.summary}</p>
              <ul className="space-y-1.5">
                {mut.data.bullets.map((b, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-indigo-500 mt-0.5">•</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

function QuizPanel() {
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const mut = useMutation({
    mutationFn: (vars: { topic: string; count: number; difficulty: string }) =>
      apiFetch<{ questions: QuizQuestion[]; provider: string }>("/api/ai/tutor/quiz", {
        method: "POST",
        body: JSON.stringify(vars),
      }),
    onSuccess: () => {
      setAnswers({});
      setSubmitted(false);
    },
  });

  const questions = mut.data?.questions ?? [];
  const score = questions.filter((q) => answers[q.id] === q.answerIndex).length;

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border/60">
        <CardContent className="pt-5 space-y-3">
          <div className="flex gap-2">
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Quiz topic, e.g. phishing, firewalls, risk…"
              className="flex-1"
            />
            <Button onClick={() => mut.mutate({ topic, count, difficulty })} disabled={!topic.trim() || mut.isPending}>
              {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate"}
            </Button>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex gap-1.5">
              {[3, 5, 10].map((c) => (
                <button key={c} onClick={() => setCount(c)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${count === c ? "bg-indigo-600 text-white border-indigo-600" : "border-border/60 text-muted-foreground"}`}>
                  {c} Qs
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              {(["beginner", "intermediate", "advanced"] as const).map((d) => (
                <button key={d} onClick={() => setDifficulty(d)}
                  className={`text-xs px-2.5 py-1 rounded-full border capitalize transition-colors ${difficulty === d ? "bg-indigo-600 text-white border-indigo-600" : "border-border/60 text-muted-foreground"}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {mut.isError && <ErrorCard message={(mut.error as Error).message} />}

      {questions.length > 0 && (
        <div className="space-y-3">
          {submitted && (
            <Card className="bg-indigo-50 border-indigo-100">
              <CardContent className="py-4 flex items-center gap-3">
                <div className="text-2xl font-bold text-indigo-700">{score}/{questions.length}</div>
                <p className="text-sm text-indigo-900/80">
                  {score === questions.length ? "Perfect score! 🎯" : score >= questions.length / 2 ? "Good work — review the misses below." : "Keep practicing — explanations below will help."}
                </p>
              </CardContent>
            </Card>
          )}
          {questions.map((q, qi) => (
            <Card key={q.id} className="bg-card border-border/60">
              <CardContent className="pt-5 space-y-2.5">
                <p className="text-sm font-medium">{qi + 1}. {q.question}</p>
                <div className="space-y-1.5">
                  {q.options.map((opt, oi) => {
                    const chosen = answers[q.id] === oi;
                    const correct = q.answerIndex === oi;
                    let cls = "border-border/60 hover:border-indigo-300";
                    if (submitted) {
                      if (correct) cls = "border-emerald-300 bg-emerald-50";
                      else if (chosen) cls = "border-red-300 bg-red-50";
                    } else if (chosen) cls = "border-indigo-400 bg-indigo-50";
                    return (
                      <button
                        key={oi}
                        disabled={submitted}
                        onClick={() => setAnswers((p) => ({ ...p, [q.id]: oi }))}
                        className={`w-full text-left text-sm px-3 py-2 rounded-lg border flex items-center gap-2 transition-colors ${cls}`}
                      >
                        {submitted && correct && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
                        {submitted && chosen && !correct && <XCircle className="h-4 w-4 text-red-600 shrink-0" />}
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>
                {submitted && (
                  <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-2.5">{q.explanation}</p>
                )}
              </CardContent>
            </Card>
          ))}
          {!submitted && (
            <Button
              className="w-full"
              disabled={Object.keys(answers).length < questions.length}
              onClick={() => setSubmitted(true)}
            >
              Submit Answers ({Object.keys(answers).length}/{questions.length})
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function ListCard({ title, icon: Icon, color, items }: { title: string; icon: any; color: string; items: string[] }) {
  return (
    <Card className="bg-card border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className="h-4 w-4" style={{ color }} /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1.5 text-sm">
          {items.map((it, i) => (
            <li key={i} className="flex gap-2">
              <span style={{ color }} className="mt-0.5">•</span>
              <span className="text-foreground/90">{it}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <Card className="bg-red-50 border-red-200">
      <CardContent className="py-3 flex items-center gap-2 text-sm text-red-700">
        <AlertTriangle className="h-4 w-4 shrink-0" /> {message}
      </CardContent>
    </Card>
  );
}
