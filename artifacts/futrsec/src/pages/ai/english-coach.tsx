import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useVoiceStatus, useVoiceRecorder } from "@/lib/voice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import {
  Languages, Loader2, Mic, Square, Sparkles, CheckCircle2, AlertTriangle, ArrowRight,
} from "lucide-react";

type EnglishResult = {
  scores: { grammar: number; vocabulary: number; fluency: number; confidence: number; pronunciation: number };
  overall: number;
  corrections: Array<{ original: string; suggestion: string; explanation: string }>;
  highlights: string[];
  roadmap: Array<{ area: string; level: string; actions: string[] }>;
  summary: string;
  pronunciationNote: string;
  provider: string;
};

const PROMPTS = [
  "Introduce yourself and describe why you want a career in cybersecurity.",
  "Explain a recent security concept you learned, in your own words.",
  "Describe a project or lab you completed and what you learned from it.",
];

export default function AIEnglishCoach() {
  const [text, setText] = useState("");
  const [fromVoice, setFromVoice] = useState(false);
  const voiceStatus = useVoiceStatus();
  const recorder = useVoiceRecorder();

  const mut = useMutation({
    mutationFn: (vars: { text: string; fromVoice: boolean }) =>
      apiFetch<EnglishResult>("/api/ai/english/evaluate", { method: "POST", body: JSON.stringify(vars) }),
  });

  const handleVoice = async () => {
    if (recorder.recording) {
      const t = await recorder.stopAndTranscribe();
      if (t) {
        setText((prev) => (prev ? prev + " " : "") + t);
        setFromVoice(true);
      }
    } else {
      recorder.start();
    }
  };

  return (
    <div className="p-5 lg:p-8 max-w-3xl mx-auto flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-teal-100 flex items-center justify-center">
          <Languages className="h-5 w-5 text-teal-600" />
        </div>
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">AI English Coach</h1>
          <p className="text-sm text-muted-foreground">Improve the English you'll use in interviews and on the job</p>
        </div>
      </div>

      <Card className="bg-white border-border/60">
        <CardContent className="pt-5 space-y-3">
          <div className="flex flex-wrap gap-2">
            {PROMPTS.map((p) => (
              <button key={p} onClick={() => setText(p)} className="text-[11px] text-muted-foreground px-2.5 py-1.5 rounded-full border border-border/60 hover:border-teal-300 hover:text-teal-700 transition-colors text-left">
                {p}
              </button>
            ))}
          </div>
          <Textarea
            value={text}
            onChange={(e) => { setText(e.target.value); setFromVoice(false); }}
            placeholder="Write (or speak) a few sentences to be evaluated for grammar, vocabulary, fluency and confidence…"
            className="min-h-[160px] text-sm"
          />
          {recorder.error && <p className="text-xs text-red-600">{recorder.error}</p>}
          <div className="flex items-center gap-2">
            {voiceStatus.data?.input && (
              <Button type="button" variant={recorder.recording ? "destructive" : "outline"} size="sm"
                onClick={handleVoice} disabled={recorder.transcribing}>
                {recorder.transcribing ? <Loader2 className="h-4 w-4 animate-spin" /> : recorder.recording ? <><Square className="h-4 w-4 mr-1.5" />Stop & Transcribe</> : <><Mic className="h-4 w-4 mr-1.5" />Speak</>}
              </Button>
            )}
            <span className="text-xs text-muted-foreground">{text.trim().split(/\s+/).filter(Boolean).length} words{fromVoice ? " · from voice" : ""}</span>
            <Button className="ml-auto" onClick={() => mut.mutate({ text, fromVoice })} disabled={text.trim().length < 10 || mut.isPending}>
              {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
              Evaluate
            </Button>
          </div>
        </CardContent>
      </Card>

      {mut.isError && (
        <Card className="bg-red-50 border-red-200"><CardContent className="py-3 text-sm text-red-700 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{(mut.error as Error).message}</CardContent></Card>
      )}

      {mut.data && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <Card className="bg-white border-border/60">
            <CardContent className="pt-5 flex items-center gap-5">
              <div className="text-center">
                <div className="text-4xl font-bold text-teal-700">{mut.data.overall}</div>
                <div className="text-[10px] uppercase text-muted-foreground tracking-wide">Overall</div>
              </div>
              <div className="flex-1 space-y-2">
                {Object.entries(mut.data.scores).filter(([k]) => k !== "pronunciation" || mut.data!.scores.pronunciation > 0).map(([k, v]) => (
                  <div key={k}>
                    <div className="flex justify-between text-xs mb-0.5"><span className="capitalize">{k}</span><span className="text-muted-foreground">{v}</span></div>
                    <Progress value={v} className="h-1.5" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-border/60">
            <CardContent className="pt-4 space-y-1">
              <p className="text-sm text-foreground">{mut.data.summary}</p>
              {mut.data.pronunciationNote && <p className="text-xs text-muted-foreground">{mut.data.pronunciationNote}</p>}
              <Badge variant="outline" className="text-[10px] mt-1">{mut.data.provider !== "mock" ? `Live AI · ${mut.data.provider}` : "Offline model"}</Badge>
            </CardContent>
          </Card>

          {mut.data.corrections.length > 0 && (
            <Card className="bg-white border-border/60">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" />Corrections</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {mut.data.corrections.map((c, i) => (
                  <div key={i} className="text-sm border-b border-border/40 pb-2 last:border-0 last:pb-0">
                    <span className="line-through text-red-500">{c.original}</span>
                    <ArrowRight className="h-3 w-3 inline mx-1.5 text-muted-foreground" />
                    <span className="text-emerald-600 font-medium">{c.suggestion}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">{c.explanation}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="bg-white border-border/60">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Highlights</CardTitle></CardHeader>
              <CardContent><ul className="space-y-1.5 text-sm">{mut.data.highlights.map((h, i) => <li key={i} className="flex gap-2"><span className="text-emerald-500 mt-0.5">•</span><span>{h}</span></li>)}</ul></CardContent>
            </Card>
            <Card className="bg-white border-border/60">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ArrowRight className="h-4 w-4 text-blue-600" />Improvement Plan</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {mut.data.roadmap.map((r, i) => (
                  <div key={i}>
                    <div className="text-sm font-medium">{r.area} <Badge variant="outline" className="text-[10px] ml-1">{r.level}</Badge></div>
                    <ul className="text-xs text-muted-foreground space-y-0.5 mt-0.5">{r.actions.map((a, j) => <li key={j}>• {a}</li>)}</ul>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </motion.div>
      )}
    </div>
  );
}
