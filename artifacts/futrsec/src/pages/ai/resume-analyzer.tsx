import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileSearch, Upload, CheckCircle2, AlertTriangle, XCircle, TrendingUp,
  Target, Star, Zap, ArrowRight, Download, RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ResumeResult {
  atsScore: number;
  formatting: string;
  keywordsFound: string[];
  keywordsMissing: string[];
  strengths: string[];
  improvements: string[];
  jobMatch: number;
  overallRating: string;
  provider?: string;
  contentAnalyzed?: boolean;
  note?: string;
}

export default function ResumeAnalyzer() {
  const [resumeUrl, setResumeUrl] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [mode, setMode] = useState<"url" | "text">("url");
  const [result, setResult] = useState<ResumeResult | null>(null);
  const { toast } = useToast();

  const analyzeMutation = useMutation({
    mutationFn: (payload: { resumeUrl?: string; resumeText?: string }) =>
      apiFetch<ResumeResult>("/api/ai/resume-analyze", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) => {
      setResult(data);
      toast({
        title: "Analysis complete!",
        description: data.contentAnalyzed === false
          ? "We couldn't read the document text — showing a track-based review."
          : "Your resume has been analyzed.",
      });
    },
    onError: (err: Error) => {
      toast({ title: "Couldn't analyze resume", description: err.message, variant: "destructive" });
    },
  });

  const handleAnalyze = () => {
    if (mode === "url") {
      if (!resumeUrl.trim()) {
        toast({ title: "Enter resume URL", description: "Paste a Google Drive or PDF URL", variant: "destructive" });
        return;
      }
      analyzeMutation.mutate({ resumeUrl: resumeUrl.trim() });
    } else {
      if (resumeText.trim().length < 80) {
        toast({ title: "Paste more text", description: "Paste your full resume text (at least a few lines).", variant: "destructive" });
        return;
      }
      analyzeMutation.mutate({ resumeText: resumeText.trim() });
    }
  };

  const atsColor = result?.atsScore
    ? result.atsScore >= 80 ? "#10B981" : result.atsScore >= 60 ? "#F59E0B" : "#EF4444"
    : "#2563EB";

  return (
    <div className="p-5 lg:p-8 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
          <FileSearch className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">AI Resume Analyzer</h1>
          <p className="text-sm text-muted-foreground">ATS score, keyword gaps, and improvement suggestions</p>
        </div>
      </div>

      {/* Upload */}
      <Card className="bg-card border-border/60">
        <CardContent className="p-5">
          <div className="flex gap-1 mb-3 p-0.5 bg-muted rounded-lg w-fit">
            <button
              onClick={() => setMode("url")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${mode === "url" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
            >
              From URL
            </button>
            <button
              onClick={() => setMode("text")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${mode === "text" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
            >
              Paste text
            </button>
          </div>

          {mode === "url" ? (
            <>
              <p className="text-sm font-medium text-foreground mb-3">Paste your resume URL (Google Drive, Dropbox, PDF link)</p>
              <div className="flex gap-2">
                <Input
                  value={resumeUrl}
                  onChange={(e) => setResumeUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/..."
                  className="flex-1 text-sm"
                />
                <Button onClick={handleAnalyze} disabled={analyzeMutation.isPending} className="gap-1.5 shrink-0">
                  {analyzeMutation.isPending ? (
                    <><RefreshCw className="h-4 w-4 animate-spin" />Analyzing...</>
                  ) : (
                    <><Zap className="h-4 w-4" />Analyze</>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Supports Google Drive, Dropbox, and direct PDF/text links. Make sure the file is publicly accessible. For scanned/image PDFs, use “Paste text” for the most accurate ATS score.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-foreground mb-3">Paste your full resume text</p>
              <textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="Paste the complete text of your resume here…"
                rows={8}
                className="w-full text-sm rounded-md border border-input bg-background px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="flex justify-end mt-3">
                <Button onClick={handleAnalyze} disabled={analyzeMutation.isPending} className="gap-1.5">
                  {analyzeMutation.isPending ? (
                    <><RefreshCw className="h-4 w-4 animate-spin" />Analyzing...</>
                  ) : (
                    <><Zap className="h-4 w-4" />Analyze</>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {result.note && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800">{result.note}</p>
              </div>
            )}
            {/* Score card */}
            <Card className="bg-card border-border/60">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-6 flex-wrap">
                  <div className="flex items-center gap-5">
                    <div className="relative h-20 w-20">
                      <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
                        <circle cx="40" cy="40" r="32" fill="none" stroke="#f0f0f0" strokeWidth="8" />
                        <circle
                          cx="40" cy="40" r="32" fill="none"
                          stroke={atsColor}
                          strokeWidth="8"
                          strokeDasharray={`${(result.atsScore / 100) * 201} 201`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xl font-bold font-heading" style={{ color: atsColor }}>{result.atsScore}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">ATS Score</p>
                      <Badge className="mt-1 text-xs" style={{ backgroundColor: `${atsColor}15`, color: atsColor, borderColor: `${atsColor}30` }}>
                        {result.atsScore >= 80 ? "Excellent" : result.atsScore >= 60 ? "Good" : "Needs Work"}
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold font-heading text-foreground">{result.overallRating}</p>
                      <p className="text-xs text-muted-foreground">Overall Rating</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold font-heading text-foreground">{result.jobMatch}%</p>
                      <p className="text-xs text-muted-foreground">Job Match</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Keywords */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="bg-card border-border/60">
                <CardHeader className="pt-4 pb-2 px-5">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="h-4 w-4" />Keywords Found ({result.keywordsFound.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-4">
                  <div className="flex flex-wrap gap-1.5">
                    {result.keywordsFound.map((k) => (
                      <Badge key={k} className="text-xs bg-green-50 text-green-700 border-green-200">{k}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card border-border/60">
                <CardHeader className="pt-4 pb-2 px-5">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-red-600">
                    <XCircle className="h-4 w-4" />Missing Keywords ({result.keywordsMissing.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-4">
                  <div className="flex flex-wrap gap-1.5">
                    {result.keywordsMissing.map((k) => (
                      <Badge key={k} variant="outline" className="text-xs border-red-200 text-red-600">{k}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Strengths & Improvements */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="bg-card border-border/60">
                <CardHeader className="pt-4 pb-2 px-5">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="h-4 w-4" />Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-4 space-y-2">
                  {result.strengths.map((s, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-foreground/80">{s}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card className="bg-card border-border/60">
                <CardHeader className="pt-4 pb-2 px-5">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-orange-600">
                    <AlertTriangle className="h-4 w-4" />Improvements
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-4 space-y-2">
                  {result.improvements.map((s, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <ArrowRight className="h-3.5 w-3.5 text-orange-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-foreground/80">{s}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 gap-1.5 h-9 text-sm" onClick={() => setResult(null)}>
                <RefreshCw className="h-3.5 w-3.5" />Analyze Another
              </Button>
              <Button className="flex-1 gap-1.5 h-9 text-sm">
                <Download className="h-3.5 w-3.5" />Download Report
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
