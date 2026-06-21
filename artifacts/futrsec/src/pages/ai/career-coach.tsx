import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { printReport, escapeHtml } from "@/lib/print-report";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, Send, User, Brain, Sparkles, MessageSquare, FileBarChart,
  Download, Loader2, Building2, Award, TrendingUp, Target, Map,
} from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };

type CareerReport = {
  skillGap: { current: string[]; required: string[]; gap: string[]; summary: string };
  roadmap: Array<{ phase: number; title: string; durationWeeks: number; focus: string[] }>;
  certifications: Array<{ name: string; provider: string; level: string; why: string }>;
  targetCompanies: Array<{ name: string; roles: string[]; location: string; tier: string }>;
  expectedSalary: {
    currency: string;
    fresher: { min: number; max: number };
    mid: { min: number; max: number };
    senior: { min: number; max: number };
    note: string;
  };
  placementReadiness: {
    score: number; level: string;
    factors: Array<{ label: string; score: number; max: number; note: string }>;
    summary: string;
  };
  context?: { trackName?: string };
  provider: string;
};

const QUICK_PROMPTS = [
  "What skills do I need for my track?",
  "Which certifications should I prioritize?",
  "How do I become job-ready faster?",
  "What salary can I expect as a fresher in India?",
];

export default function AICareerCoach() {
  return (
    <div className="p-5 lg:p-8 max-w-4xl mx-auto flex flex-col gap-5 h-full">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-purple-100 flex items-center justify-center">
          <Brain className="h-5 w-5 text-purple-600" />
        </div>
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">AI Career Coach</h1>
          <p className="text-sm text-muted-foreground">Chat with your coach or generate a full career report</p>
        </div>
      </div>

      <Tabs defaultValue="chat" className="flex-1 flex flex-col min-h-0">
        <TabsList className="grid grid-cols-2 w-full max-w-xs">
          <TabsTrigger value="chat"><MessageSquare className="h-3.5 w-3.5 mr-1.5" />Chat</TabsTrigger>
          <TabsTrigger value="report"><FileBarChart className="h-3.5 w-3.5 mr-1.5" />Career Report</TabsTrigger>
        </TabsList>
        <TabsContent value="chat" className="flex-1 min-h-0 mt-4"><ChatPanel /></TabsContent>
        <TabsContent value="report" className="mt-4"><ReportPanel /></TabsContent>
      </Tabs>
    </div>
  );
}

function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! I'm your AI Career Coach. Ask me about skills, certifications, the job market, or placement strategy for your cybersecurity track." },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const chat = useMutation({
    mutationFn: (message: string) =>
      apiFetch<{ reply: string; provider: string }>("/api/ai/career/chat", {
        method: "POST",
        body: JSON.stringify({ message }),
      }),
    onSuccess: (data) => setMessages((p) => [...p, { role: "assistant", content: data.reply }]),
    onError: (e) => setMessages((p) => [...p, { role: "assistant", content: `Sorry, I hit an error: ${(e as Error).message}` }]),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, chat.isPending]);

  const send = (text: string) => {
    if (!text.trim() || chat.isPending) return;
    setMessages((p) => [...p, { role: "user", content: text }]);
    setInput("");
    chat.mutate(text);
  };

  return (
    <Card className="bg-white border-border/60 flex flex-col h-[520px]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${msg.role === "assistant" ? "bg-purple-100" : "bg-primary/10"}`}>
                {msg.role === "assistant" ? <Bot className="h-3.5 w-3.5 text-purple-600" /> : <User className="h-3.5 w-3.5 text-primary" />}
              </div>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${msg.role === "assistant" ? "bg-muted/40 text-foreground rounded-tl-sm" : "bg-primary text-white rounded-tr-sm"}`}>
                {msg.content.replace(/\*\*(.*?)\*\*/g, "$1")}
              </div>
            </motion.div>
          ))}
          {chat.isPending && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div className="h-7 w-7 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                <Bot className="h-3.5 w-3.5 text-purple-600" />
              </div>
              <div className="bg-muted/40 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => <div key={i} className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />)}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="px-4 py-2 border-t border-border/40">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {QUICK_PROMPTS.map((p) => (
            <button key={p} onClick={() => send(p)} disabled={chat.isPending}
              className="text-[11px] text-muted-foreground whitespace-nowrap px-2.5 py-1.5 rounded-full border border-border/60 hover:border-primary hover:text-primary transition-colors shrink-0">
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 border-t border-border/40">
        <div className="flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(input)}
            placeholder="Ask about your cybersecurity career…" className="flex-1 text-sm" disabled={chat.isPending} />
          <Button onClick={() => send(input)} disabled={!input.trim() || chat.isPending} size="sm" className="px-3">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function ReportPanel() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["ai", "career", "report"],
    queryFn: () => apiFetch<CareerReport>("/api/ai/career/report"),
  });

  if (isLoading) return <CenterLoader label="Building your career report…" />;
  if (isError) return (
    <Card className="bg-red-50 border-red-200"><CardContent className="py-4 text-sm text-red-700">
      Failed to load report: {(error as Error).message}
      <Button size="sm" variant="outline" className="ml-3" onClick={() => refetch()}>Retry</Button>
    </CardContent></Card>
  );
  if (!data) return null;

  const sal = data.expectedSalary;
  const fmt = (n: number) => `${n}`;

  const exportPdf = () => {
    const html = `
      <h2>Placement Readiness — ${escapeHtml(String(data.placementReadiness.score))}/100 (${escapeHtml(data.placementReadiness.level)})</h2>
      <p>${escapeHtml(data.placementReadiness.summary)}</p>
      <table><tr><th>Factor</th><th>Score</th><th>Note</th></tr>
      ${data.placementReadiness.factors.map((f) => `<tr><td>${escapeHtml(f.label)}</td><td>${f.score}/${f.max}</td><td>${escapeHtml(f.note)}</td></tr>`).join("")}</table>
      <h2>Skill Gap</h2><p>${escapeHtml(data.skillGap.summary)}</p>
      <h3>To Develop</h3><p>${data.skillGap.gap.map((g) => `<span class="pill">${escapeHtml(g)}</span>`).join(" ") || "You're covering the core skills — keep deepening them."}</p>
      <h2>Roadmap</h2>
      ${data.roadmap.map((r) => `<h3>Phase ${r.phase}: ${escapeHtml(r.title)} (${r.durationWeeks} weeks)</h3><ul>${r.focus.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}</ul>`).join("")}
      <h2>Recommended Certifications</h2>
      <table><tr><th>Certification</th><th>Provider</th><th>Level</th><th>Why</th></tr>
      ${data.certifications.map((c) => `<tr><td>${escapeHtml(c.name)}</td><td>${escapeHtml(c.provider)}</td><td>${escapeHtml(c.level)}</td><td>${escapeHtml(c.why)}</td></tr>`).join("")}</table>
      <h2>Target Companies</h2>
      <table><tr><th>Company</th><th>Roles</th><th>Location</th><th>Tier</th></tr>
      ${data.targetCompanies.map((c) => `<tr><td>${escapeHtml(c.name)}</td><td>${escapeHtml(c.roles.join(", "))}</td><td>${escapeHtml(c.location)}</td><td>${escapeHtml(c.tier)}</td></tr>`).join("")}</table>
      <h2>Expected Salary (${escapeHtml(sal.currency)})</h2>
      <div class="grid">
        <div class="stat"><div class="label">Fresher</div><div class="value">${fmt(sal.fresher.min)}–${fmt(sal.fresher.max)}</div></div>
        <div class="stat"><div class="label">Mid</div><div class="value">${fmt(sal.mid.min)}–${fmt(sal.mid.max)}</div></div>
        <div class="stat"><div class="label">Senior</div><div class="value">${fmt(sal.senior.min)}–${fmt(sal.senior.max)}</div></div>
      </div>
      <p>${escapeHtml(sal.note)}</p>`;
    printReport("Career Report", html);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {data.context?.trackName && <Badge className="bg-purple-100 text-purple-700 border-purple-200">{data.context.trackName}</Badge>}
          <Badge variant="outline" className={`text-[10px] ${data.provider !== "mock" ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-amber-200 text-amber-700 bg-amber-50"}`}>
            <Sparkles className="h-3 w-3 mr-1" />{data.provider !== "mock" ? `Live AI · ${data.provider}` : "Offline model"}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Refresh"}
          </Button>
          <Button size="sm" onClick={exportPdf}><Download className="h-3.5 w-3.5 mr-1.5" />Export PDF</Button>
        </div>
      </div>

      <Card className="bg-white border-border/60">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4 text-purple-600" />Placement Readiness</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-end gap-3">
            <span className="text-4xl font-bold text-purple-700">{data.placementReadiness.score}</span>
            <span className="text-sm text-muted-foreground mb-1">/100 · {data.placementReadiness.level}</span>
          </div>
          <Progress value={data.placementReadiness.score} className="h-2" />
          <p className="text-sm text-muted-foreground">{data.placementReadiness.summary}</p>
          <div className="grid sm:grid-cols-2 gap-2 pt-1">
            {data.placementReadiness.factors.map((f) => (
              <div key={f.label} className="rounded-lg border border-border/60 p-2.5">
                <div className="flex justify-between text-xs mb-1"><span className="font-medium">{f.label}</span><span className="text-muted-foreground">{f.score}/{f.max}</span></div>
                <Progress value={(f.score / f.max) * 100} className="h-1.5" />
                <p className="text-[11px] text-muted-foreground mt-1">{f.note}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-border/60">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Map className="h-4 w-4 text-blue-600" />Learning Roadmap</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {data.roadmap.map((r) => (
            <div key={r.phase} className="flex gap-3">
              <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">{r.phase}</div>
              <div>
                <div className="text-sm font-medium">{r.title} <span className="text-xs text-muted-foreground font-normal">· {r.durationWeeks} weeks</span></div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {r.focus.map((f) => <span key={f} className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{f}</span>)}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="bg-white border-border/60">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Award className="h-4 w-4 text-amber-600" />Certifications</CardTitle></CardHeader>
          <CardContent className="space-y-2.5">
            {data.certifications.map((c) => (
              <div key={c.name} className="border-b border-border/40 pb-2 last:border-0 last:pb-0">
                <div className="text-sm font-medium">{c.name} <Badge variant="outline" className="text-[10px] ml-1">{c.level}</Badge></div>
                <div className="text-xs text-muted-foreground">{c.provider} — {c.why}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-white border-border/60">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4 text-emerald-600" />Target Companies</CardTitle></CardHeader>
          <CardContent className="space-y-2.5">
            {data.targetCompanies.map((c) => (
              <div key={c.name} className="border-b border-border/40 pb-2 last:border-0 last:pb-0">
                <div className="text-sm font-medium flex items-center gap-1.5">{c.name} <Badge variant="outline" className="text-[10px]">{c.tier}</Badge></div>
                <div className="text-xs text-muted-foreground">{c.roles.join(", ")} · {c.location}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white border-border/60">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-cyan-600" />Expected Salary <span className="text-xs text-muted-foreground font-normal">({sal.currency})</span></CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {[["Fresher", sal.fresher], ["Mid", sal.mid], ["Senior", sal.senior]].map(([label, r]: any) => (
              <div key={label} className="rounded-lg border border-border/60 p-3 text-center">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
                <div className="text-lg font-bold text-cyan-700">{r.min}–{r.max}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">{sal.note}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function CenterLoader({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
