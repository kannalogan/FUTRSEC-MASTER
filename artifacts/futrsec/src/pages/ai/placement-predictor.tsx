import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { printReport, escapeHtml } from "@/lib/print-report";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { TrendingUp, Loader2, Download, Gauge } from "lucide-react";

type PlacementReadiness = {
  score: number;
  level: string;
  factors: Array<{ label: string; score: number; max: number; note: string }>;
  summary: string;
  context?: { trackName?: string };
};

export default function PlacementPredictor() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["ai", "career", "placement-readiness"],
    queryFn: () => apiFetch<PlacementReadiness>("/api/ai/career/placement-readiness"),
  });

  const ringColor = (s: number) => (s >= 70 ? "#10B981" : s >= 50 ? "#F97316" : "#EF4444");

  const exportPdf = () => {
    if (!data) return;
    const html = `
      <h2>Placement Readiness: ${data.score}/100 (${escapeHtml(data.level)})</h2>
      <p>${escapeHtml(data.summary)}</p>
      <table><tr><th>Factor</th><th>Score</th><th>Note</th></tr>
      ${data.factors.map((f) => `<tr><td>${escapeHtml(f.label)}</td><td>${f.score}/${f.max}</td><td>${escapeHtml(f.note)}</td></tr>`).join("")}</table>`;
    printReport("Placement Readiness Report", html);
  };

  return (
    <div className="p-5 lg:p-8 max-w-3xl mx-auto flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-sky-100 flex items-center justify-center">
          <TrendingUp className="h-5 w-5 text-sky-600" />
        </div>
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">Placement Predictor</h1>
          <p className="text-sm text-muted-foreground">Your data-driven readiness for placement, with the levers that move it</p>
        </div>
        {data && (
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Refresh"}
            </Button>
            <Button size="sm" onClick={exportPdf}><Download className="h-3.5 w-3.5 mr-1.5" />Export PDF</Button>
          </div>
        )}
      </div>

      {isLoading && <div className="flex flex-col items-center py-16 gap-3 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin text-sky-600" /><p className="text-sm">Computing your readiness…</p></div>}

      {isError && (
        <Card className="bg-red-50 border-red-200"><CardContent className="py-4 text-sm text-red-700">
          {(error as Error).message}<Button size="sm" variant="outline" className="ml-3" onClick={() => refetch()}>Retry</Button>
        </CardContent></Card>
      )}

      {data && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <Card className="bg-card border-border/60">
            <CardContent className="pt-6 flex flex-col items-center text-center gap-3">
              <div className="relative h-32 w-32">
                <svg viewBox="0 0 120 120" className="h-32 w-32 -rotate-90">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="#e2e8f0" strokeWidth="12" />
                  <circle cx="60" cy="60" r="52" fill="none" stroke={ringColor(data.score)} strokeWidth="12" strokeLinecap="round"
                    strokeDasharray={`${(data.score / 100) * 2 * Math.PI * 52} ${2 * Math.PI * 52}`} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold" style={{ color: ringColor(data.score) }}>{data.score}</span>
                  <span className="text-[10px] text-muted-foreground">/ 100</span>
                </div>
              </div>
              <div>
                <Badge className="bg-sky-100 text-sky-700 border-sky-200 flex items-center gap-1"><Gauge className="h-3 w-3" />{data.level}</Badge>
                {data.context?.trackName && <p className="text-xs text-muted-foreground mt-1">{data.context.trackName}</p>}
              </div>
              <p className="text-sm text-muted-foreground max-w-md">{data.summary}</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/60">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Readiness Factors</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {data.factors.map((f) => (
                <div key={f.label}>
                  <div className="flex justify-between text-xs mb-1"><span className="font-medium">{f.label}</span><span className="text-muted-foreground">{f.score}/{f.max}</span></div>
                  <Progress value={(f.score / f.max) * 100} className="h-1.5" />
                  <p className="text-[11px] text-muted-foreground mt-1">{f.note}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
