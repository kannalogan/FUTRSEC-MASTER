import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Target, Lightbulb } from "lucide-react";
import { PageHeader, CardSkeleton } from "@/components/page-shell";

interface Factor {
  label: string;
  value: number;
  weight: string;
}
interface Prediction {
  placementProbability: number;
  currentScore: number;
  labsCompleted: number;
  factors: Factor[];
  recommendation: string;
}

export default function PlacementPredictorPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/ai/placement-prediction"],
    queryFn: () => apiFetch<Prediction>("/api/ai/placement-prediction"),
  });

  const prob = data?.placementProbability ?? 0;
  const probColor = prob >= 75 ? "#10B981" : prob >= 50 ? "#F59E0B" : "#EF4444";

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <PageHeader icon={TrendingUp} title="Placement Predictor" subtitle="AI estimate of your job placement readiness" />

      {isLoading ? (
        <div className="space-y-4"><CardSkeleton rows={2} /><CardSkeleton rows={4} /></div>
      ) : data ? (
        <div className="space-y-5">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="bg-white border-border/60">
              <CardContent className="p-6 text-center">
                <div className="relative h-40 w-40 mx-auto">
                  <svg className="h-40 w-40 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                    <motion.circle
                      cx="18" cy="18" r="15.5" fill="none" stroke={probColor} strokeWidth="3" strokeLinecap="round"
                      initial={{ strokeDasharray: "0 97.4" }}
                      animate={{ strokeDasharray: `${(prob / 100) * 97.4} 97.4` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold font-heading" style={{ color: probColor }}>{prob}%</span>
                    <span className="text-xs text-muted-foreground">placement chance</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-3 max-w-sm mx-auto">
                  Based on your FTS score of <span className="font-semibold text-foreground">{Math.round(data.currentScore)}</span> and{" "}
                  <span className="font-semibold text-foreground">{data.labsCompleted}</span> labs completed
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <Card className="bg-white border-border/60">
            <CardHeader className="pb-3 pt-4 px-5">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />Contributing Factors
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-4">
              {data.factors.map((f) => (
                <div key={f.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-foreground">{f.label}</span>
                    <span className="text-xs text-muted-foreground">{f.weight} weight</span>
                  </div>
                  <Progress value={Math.min(100, f.value)} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-200/60">
            <CardContent className="p-5 flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                <Lightbulb className="h-[18px] w-[18px] text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-foreground mb-1">AI Recommendation</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{data.recommendation}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
