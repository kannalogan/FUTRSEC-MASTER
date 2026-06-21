import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { BrainCircuit, Loader2, CheckCircle2, Target, AlertCircle, Sparkles } from "lucide-react";

type SkillGap = {
  current: string[];
  required: string[];
  gap: string[];
  summary: string;
  track: string;
  provider: string;
};

export default function SkillGapAnalyzer() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["ai", "career", "skill-gap"],
    queryFn: () => apiFetch<SkillGap>("/api/ai/career/skill-gap"),
  });

  const coverage = data ? Math.round((data.current.length / Math.max(1, data.required.length)) * 100) : 0;

  return (
    <div className="p-5 lg:p-8 max-w-3xl mx-auto flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center">
          <BrainCircuit className="h-5 w-5 text-violet-600" />
        </div>
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">Skill Gap Analyzer</h1>
          <p className="text-sm text-muted-foreground">See what you have and what you still need for your track</p>
        </div>
        {data && (
          <Button size="sm" variant="outline" className="ml-auto" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Refresh"}
          </Button>
        )}
      </div>

      {isLoading && <div className="flex flex-col items-center py-16 gap-3 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin text-violet-600" /><p className="text-sm">Analyzing your skills…</p></div>}

      {isError && (
        <Card className="bg-red-50 border-red-200"><CardContent className="py-4 text-sm text-red-700">
          {(error as Error).message}<Button size="sm" variant="outline" className="ml-3" onClick={() => refetch()}>Retry</Button>
        </CardContent></Card>
      )}

      {data && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <Card className="bg-card border-border/60">
            <CardContent className="pt-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Skill Coverage</span>
                <Badge variant="outline" className="text-[10px]">{data.provider !== "mock" ? `Live AI · ${data.provider}` : "Offline model"}</Badge>
              </div>
              <div className="flex items-end gap-2"><span className="text-3xl font-bold text-violet-700">{coverage}%</span></div>
              <Progress value={coverage} className="h-2" />
              <p className="text-sm text-muted-foreground">{data.summary}</p>
            </CardContent>
          </Card>

          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="bg-card border-border/60">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Skills You Have</CardTitle></CardHeader>
              <CardContent>
                {data.current.length ? (
                  <div className="flex flex-wrap gap-1.5">{data.current.map((s) => <span key={s} className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">{s}</span>)}</div>
                ) : <p className="text-sm text-muted-foreground">Complete labs, projects and assessments to build verified skills.</p>}
              </CardContent>
            </Card>

            <Card className="bg-card border-border/60">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertCircle className="h-4 w-4 text-amber-600" />Skills To Develop</CardTitle></CardHeader>
              <CardContent>
                {data.gap.length ? (
                  <div className="flex flex-wrap gap-1.5">{data.gap.map((s) => <span key={s} className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full">{s}</span>)}</div>
                ) : <p className="text-sm text-emerald-700 flex items-center gap-1.5"><Sparkles className="h-4 w-4" />You're covering all core skills — keep deepening them!</p>}
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card border-border/60">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4 text-violet-600" />Required for Your Track</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {data.required.map((s) => {
                  const have = data.current.includes(s);
                  return <span key={s} className={`text-xs px-2.5 py-1 rounded-full flex items-center gap-1 ${have ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                    {have && <CheckCircle2 className="h-3 w-3" />}{s}
                  </span>;
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
