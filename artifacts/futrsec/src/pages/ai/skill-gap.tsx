import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import {
  BrainCircuit, CheckCircle2, XCircle, ArrowRight, BookOpen, FlaskConical,
  Clock, Zap, RefreshCw, Target, TrendingUp, Layers
} from "lucide-react";

const SOC_SKILLS = {
  current: ["SIEM", "Log Analysis", "Incident Triage", "Basic Networking"],
  target: ["Threat Hunting", "Malware Analysis", "SOAR", "Cloud Security", "Forensics", "Detection Engineering", "QRadar", "Splunk Advanced"],
  recommendations: [
    { type: "course", title: "Threat Hunting with Elastic", module: "Threat Hunting", duration: "3h", priority: "High" },
    { type: "lab", title: "Malware Analysis Lab", module: "Malware Analysis", duration: "90m", priority: "High" },
    { type: "course", title: "SOAR Fundamentals", module: "Detection Engineering", duration: "2h", priority: "Medium" },
    { type: "course", title: "Splunk Power User", module: "SIEM & Log Management", duration: "4h", priority: "Medium" },
    { type: "lab", title: "Cloud Security Basics Lab", module: "Cloud Security", duration: "2h", priority: "Low" },
  ],
  estimatedCompletion: "6 weeks",
  jobReadiness: 62,
};

export default function SkillGapAnalyzer() {
  const [analyzed, setAnalyzed] = useState(false);

  const { data: profileData } = useQuery({
    queryKey: ["profile/me"],
    queryFn: () => apiFetch<any>("/api/profile/me"),
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      return apiFetch<any>("/api/ai/skill-gap", {
        method: "POST",
        body: JSON.stringify({ track: profileData?.user?.track?.slug }),
      }).catch(() => SOC_SKILLS);
    },
    onSuccess: () => setAnalyzed(true),
  });

  const data = analyzeMutation.data ?? SOC_SKILLS;
  const track = profileData?.user?.track;

  const gapPercent = Math.round(100 - data.jobReadiness);

  return (
    <div className="p-5 lg:p-8 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center">
          <BrainCircuit className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">AI Skill Gap Analyzer</h1>
          <p className="text-sm text-muted-foreground">Identify missing skills and get a personalized learning plan</p>
        </div>
        {track && <Badge className="ml-auto bg-indigo-100 text-indigo-700 border-indigo-200">{track.name}</Badge>}
      </div>

      {!analyzed ? (
        <Card className="bg-white border-border/60">
          <CardContent className="p-6 text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-indigo-50 flex items-center justify-center mx-auto">
              <Target className="h-8 w-8 text-indigo-500" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Analyze Your Skill Gap</p>
              <p className="text-sm text-muted-foreground mt-1">
                We'll compare your current skills against the requirements for {track?.name ?? "your track"} roles in India's job market.
              </p>
            </div>
            <Button
              onClick={() => analyzeMutation.mutate()}
              disabled={analyzeMutation.isPending}
              className="gap-2"
            >
              {analyzeMutation.isPending ? (
                <><RefreshCw className="h-4 w-4 animate-spin" />Analyzing...</>
              ) : (
                <><Zap className="h-4 w-4" />Analyze My Skill Gap</>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <AnimatePresence>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Summary */}
            <Card className="bg-white border-border/60">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-6 flex-wrap">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground mb-2">Job Readiness</p>
                    <Progress value={data.jobReadiness} className="h-3 mb-1" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Current: {data.jobReadiness}%</span>
                      <span>Target: 100%</span>
                    </div>
                  </div>
                  <div className="text-center shrink-0">
                    <p className="text-3xl font-bold font-heading text-foreground">{data.estimatedCompletion}</p>
                    <p className="text-xs text-muted-foreground">to close gap</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Skill comparison */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="bg-white border-border/60">
                <CardHeader className="pt-4 pb-2 px-5">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="h-4 w-4" />Skills You Have
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-4">
                  <div className="flex flex-wrap gap-1.5">
                    {data.current.map((s: string) => (
                      <Badge key={s} className="text-xs bg-green-50 text-green-700 border-green-200">{s}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border-border/60">
                <CardHeader className="pt-4 pb-2 px-5">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-red-600">
                    <XCircle className="h-4 w-4" />Skills to Develop
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-4">
                  <div className="flex flex-wrap gap-1.5">
                    {data.target.map((s: string) => (
                      <Badge key={s} variant="outline" className="text-xs border-red-200 text-red-600">{s}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recommendations */}
            <Card className="bg-white border-border/60">
              <CardHeader className="pt-4 pb-2 px-5">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />Recommended Learning Path
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4 space-y-2.5">
                {data.recommendations.map((r: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${r.type === "lab" ? "bg-orange-100" : "bg-blue-100"}`}>
                      {r.type === "lab" ? <FlaskConical className="h-4 w-4 text-orange-500" /> : <BookOpen className="h-4 w-4 text-blue-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{r.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1"><Layers className="h-3 w-3" />{r.module}</span>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{r.duration}</span>
                      </div>
                    </div>
                    <Badge
                      className={`text-[10px] shrink-0 ${
                        r.priority === "High" ? "bg-red-50 text-red-600 border-red-200" :
                        r.priority === "Medium" ? "bg-orange-50 text-orange-600 border-orange-200" :
                        "bg-muted text-muted-foreground"
                      }`}
                    >
                      {r.priority}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 gap-1.5 h-9 text-sm" onClick={() => setAnalyzed(false)}>
                <RefreshCw className="h-3.5 w-3.5" />Re-analyze
              </Button>
              <Button className="flex-1 gap-1.5 h-9 text-sm" onClick={() => window.location.href = "/learning"}>
                <ArrowRight className="h-3.5 w-3.5" />Start Learning
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
