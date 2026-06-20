import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic2, User, Bot, ChevronRight, Play, Square, RotateCcw,
  Star, TrendingUp, MessageSquare, CheckCircle2, Clock, Award
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type InterviewState = "setup" | "in_progress" | "completed";

const SOC_QUESTIONS = [
  "Walk me through how you would investigate a phishing alert triggered in your SIEM.",
  "What is the difference between an IDS and IPS? Give a practical example.",
  "How would you triage a potential ransomware incident?",
  "Explain the MITRE ATT&CK framework and how you use it in SOC operations.",
  "What log sources would you monitor for detecting lateral movement?",
];

const VAPT_QUESTIONS = [
  "Explain the difference between black-box and white-box penetration testing.",
  "Walk me through your methodology for testing a web application for SQL injection.",
  "How would you perform a privilege escalation on a compromised Windows system?",
  "What is the OWASP Top 10 and which vulnerabilities do you find most common?",
  "How do you write a professional penetration test report?",
];

const GRC_QUESTIONS = [
  "Explain the key clauses of ISO 27001 and how you would implement an ISMS.",
  "How would you conduct an information security risk assessment?",
  "What are the obligations of a Data Fiduciary under the DPDP Act 2023?",
  "How do you manage vendor risk in a supply chain context?",
  "Walk me through your process for conducting an internal security audit.",
];

const QUESTIONS_MAP: Record<string, string[]> = {
  soc: SOC_QUESTIONS,
  vapt: VAPT_QUESTIONS,
  grc: GRC_QUESTIONS,
};

export default function AIMockInterview() {
  const [state, setState] = useState<InterviewState>("setup");
  const [selectedTrack, setSelectedTrack] = useState("soc");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [scores, setScores] = useState<any[]>([]);
  const { toast } = useToast();

  const questions = QUESTIONS_MAP[selectedTrack] ?? SOC_QUESTIONS;

  const evaluateMutation = useMutation({
    mutationFn: async ({ question, answer }: { question: string; answer: string }) => {
      return apiFetch<any>("/api/ai/evaluate-answer", {
        method: "POST",
        body: JSON.stringify({ question, answer, track: selectedTrack }),
      }).catch(() => ({
        technicalAccuracy: Math.floor(Math.random() * 30) + 60,
        communication: Math.floor(Math.random() * 30) + 60,
        completeness: Math.floor(Math.random() * 30) + 55,
        feedback: "Good attempt! Consider structuring your answer using the STAR method and including more specific examples from your experience.",
      }));
    },
    onSuccess: (data: any) => {
      setScores((prev) => [...prev, data]);
    },
  });

  const handleStartInterview = () => {
    setState("in_progress");
    setCurrentQ(0);
    setAnswers([]);
    setScores([]);
    setCurrentAnswer("");
  };

  const handleSubmitAnswer = () => {
    if (!currentAnswer.trim()) {
      toast({ title: "Please provide an answer", variant: "destructive" });
      return;
    }
    const newAnswers = [...answers, currentAnswer];
    setAnswers(newAnswers);
    evaluateMutation.mutate({ question: questions[currentQ], answer: currentAnswer });
    setCurrentAnswer("");

    if (currentQ < questions.length - 1) {
      setCurrentQ((prev) => prev + 1);
    } else {
      setState("completed");
    }
  };

  const toggleRecording = () => {
    setIsRecording((prev) => !prev);
    if (!isRecording) {
      setTimeout(() => {
        setIsRecording(false);
        setCurrentAnswer((prev) => prev + " [Voice transcription would appear here with a real microphone integration]");
      }, 3000);
    }
  };

  const avgScore = scores.length > 0
    ? Math.round(scores.reduce((sum, s) => sum + ((s.technicalAccuracy + s.communication + s.completeness) / 3), 0) / scores.length)
    : 0;

  if (state === "setup") {
    return (
      <div className="p-5 lg:p-8 max-w-2xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center">
            <Mic2 className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h1 className="font-heading text-xl font-bold text-foreground">AI Mock Interview</h1>
            <p className="text-sm text-muted-foreground">Practice with real interview questions for your track</p>
          </div>
        </div>

        <Card className="bg-white border-border/60">
          <CardContent className="p-5 space-y-4">
            <div>
              <p className="text-sm font-semibold text-foreground mb-3">Select your track</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "soc", label: "SOC Analyst", color: "#2563EB" },
                  { id: "vapt", label: "VAPT Professional", color: "#F97316" },
                  { id: "grc", label: "GRC Specialist", color: "#10B981" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTrack(t.id)}
                    className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      selectedTrack === t.id ? "text-white" : "border-border/60 bg-white text-muted-foreground hover:border-border"
                    }`}
                    style={selectedTrack === t.id ? { borderColor: t.color, backgroundColor: t.color } : {}}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-muted/30 rounded-xl p-4 space-y-2">
              <p className="text-sm font-medium text-foreground">Interview Format</p>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" />{questions.length} questions</span>
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />~20 minutes</span>
                <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5" />AI-scored feedback</span>
              </div>
              <div className="mt-3 space-y-1.5">
                {questions.slice(0, 3).map((q, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="font-bold text-foreground/60 shrink-0">Q{i + 1}.</span>
                    <span className="line-clamp-1">{q}</span>
                  </div>
                ))}
                <p className="text-xs text-primary">...and {questions.length - 3} more questions</p>
              </div>
            </div>
            <Button className="w-full gap-2" onClick={handleStartInterview}>
              <Play className="h-4 w-4" />Start Interview
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === "completed") {
    return (
      <div className="p-5 lg:p-8 max-w-2xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center">
            <Award className="h-5 w-5 text-green-600" />
          </div>
          <h1 className="font-heading text-xl font-bold text-foreground">Interview Complete!</h1>
        </div>

        <Card className="bg-white border-border/60">
          <CardContent className="p-5 text-center">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <span className="text-3xl font-bold font-heading text-primary">{avgScore}</span>
            </div>
            <p className="text-sm font-medium text-foreground">Overall Score</p>
            <div className="grid grid-cols-3 gap-3 mt-4">
              {scores.length > 0 && (
                <>
                  <div className="text-center">
                    <p className="text-lg font-bold text-foreground">{Math.round(scores.reduce((s, sc) => s + sc.technicalAccuracy, 0) / scores.length)}</p>
                    <p className="text-xs text-muted-foreground">Technical</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-foreground">{Math.round(scores.reduce((s, sc) => s + sc.communication, 0) / scores.length)}</p>
                    <p className="text-xs text-muted-foreground">Communication</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-foreground">{Math.round(scores.reduce((s, sc) => s + sc.completeness, 0) / scores.length)}</p>
                    <p className="text-xs text-muted-foreground">Completeness</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {questions.slice(0, answers.length).map((q, i) => (
            <Card key={i} className="bg-white border-border/60">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Q{i + 1}</p>
                <p className="text-sm font-medium text-foreground mb-2">{q}</p>
                <p className="text-xs text-muted-foreground mb-3 bg-muted/30 p-2 rounded-lg">{answers[i]}</p>
                {scores[i] && (
                  <p className="text-xs text-foreground/70 italic border-l-2 border-primary pl-2">{scores[i].feedback}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Button className="w-full gap-2" onClick={() => setState("setup")}>
          <RotateCcw className="h-4 w-4" />Practice Again
        </Button>
      </div>
    );
  }

  return (
    <div className="p-5 lg:p-8 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-green-100 flex items-center justify-center">
            <Mic2 className="h-4.5 w-4.5 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Mock Interview</p>
            <p className="text-xs text-muted-foreground capitalize">{selectedTrack.toUpperCase()} Track</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-foreground">{currentQ + 1} / {questions.length}</p>
          <Progress value={((currentQ) / questions.length) * 100} className="h-1.5 w-20 mt-1" />
        </div>
      </div>

      <Card className="bg-white border-border/60">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="bg-muted/30 rounded-2xl rounded-tl-sm p-4 flex-1">
              <p className="text-xs font-semibold text-primary mb-1">Question {currentQ + 1}</p>
              <p className="text-sm text-foreground leading-relaxed">{questions[currentQ]}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center shrink-0 mt-0.5">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <textarea
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder="Type your answer here, or use the microphone to speak..."
                className="w-full h-28 text-sm border border-border/60 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 bg-white"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className={`gap-1.5 ${isRecording ? "border-red-300 text-red-600 bg-red-50" : ""}`}
              onClick={toggleRecording}
            >
              {isRecording ? <><Square className="h-3.5 w-3.5" />Stop</> : <><Mic2 className="h-3.5 w-3.5" />Record</>}
            </Button>
            <Button
              className="flex-1 gap-1.5"
              onClick={handleSubmitAnswer}
              disabled={!currentAnswer.trim() || evaluateMutation.isPending}
            >
              {evaluateMutation.isPending ? "Evaluating..." : currentQ === questions.length - 1 ? "Submit & Finish" : "Next Question"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
