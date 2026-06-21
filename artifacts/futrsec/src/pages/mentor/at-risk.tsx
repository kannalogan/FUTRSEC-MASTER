import { useMentorAtRisk } from "@/lib/mentor-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader, CardSkeleton, EmptyState } from "@/components/page-shell";
import { RiskBadge } from "./students";
import { AlertTriangle, ShieldCheck, Lightbulb } from "lucide-react";

export default function MentorAtRiskPage() {
  const { data, isLoading } = useMentorAtRisk();
  const students = data?.students ?? [];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader icon={AlertTriangle} title="At-Risk Students" subtitle="Early-warning signals and recommended interventions." />

      {isLoading ? (
        <div className="space-y-3"><CardSkeleton rows={3} /><CardSkeleton rows={3} /></div>
      ) : students.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="No at-risk students" description="Everyone in your cohort is on track. Great work!" />
      ) : (
        <div className="space-y-4">
          {students.map((s) => (
            <Card key={s.studentId}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-foreground">{s.fullName ?? s.email}</h3>
                    <p className="text-xs text-muted-foreground">{s.email}</p>
                  </div>
                  <RiskBadge level={s.riskLevel} score={s.riskScore} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Signals</p>
                    <div className="flex flex-wrap gap-1.5">
                      {s.signals.map((sig, i) => (
                        <Badge key={i} variant="outline" className="text-xs border-red-200 text-red-600 dark:border-red-500/30 dark:text-red-400">
                          {sig}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                      <Lightbulb className="h-3 w-3" /> Recommendations
                    </p>
                    <ul className="space-y-1">
                      {s.recommendations.map((rec, i) => (
                        <li key={i} className="text-sm text-foreground/80 flex gap-2">
                          <span className="text-primary mt-0.5">•</span>{rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
