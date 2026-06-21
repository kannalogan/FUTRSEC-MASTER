import { useMentorAnalytics } from "@/lib/mentor-api";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, GridSkeleton } from "@/components/page-shell";
import { BarChart3, Clock, BookOpen, Gauge, FlaskConical, ClipboardCheck, FileText, Activity } from "lucide-react";

function Stat({ icon: Icon, label, value, color }: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; label: string; value: string | number; color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}18` }}>
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
        <div>
          <div className="text-lg font-bold font-heading leading-none">{value}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function heatColor(count: number, max: number): string {
  if (count === 0) return "#EEF2F7";
  const intensity = Math.min(1, count / Math.max(1, max));
  const alpha = 0.2 + intensity * 0.8;
  return `rgba(37, 99, 235, ${alpha})`;
}

export default function MentorAnalyticsPage() {
  const { data, isLoading } = useMentorAnalytics();

  if (isLoading || !data) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <PageHeader icon={BarChart3} title="Cohort Analytics" subtitle="Aggregate performance across your assigned students." />
        <GridSkeleton cols={3} rows={2} />
      </div>
    );
  }

  const maxHeat = Math.max(1, ...data.activityHeatmap.map((h) => h.count));
  const ftsTotal = data.ftsDistribution.low + data.ftsDistribution.mid + data.ftsDistribution.high;
  const dist = [
    { label: "Low (<40)", value: data.ftsDistribution.low, color: "#EF4444" },
    { label: "Mid (40–70)", value: data.ftsDistribution.mid, color: "#F97316" },
    { label: "High (>70)", value: data.ftsDistribution.high, color: "#10B981" },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader icon={BarChart3} title="Cohort Analytics" subtitle="Aggregate performance across your assigned students." />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
        <Stat icon={BookOpen} label="Cohort Size" value={data.cohortSize} color="#2563EB" />
        <Stat icon={Clock} label="Avg Learning Hrs" value={data.avgLearningHours} color="#8B5CF6" />
        <Stat icon={BookOpen} label="Avg Completion" value={`${data.avgCompletion}%`} color="#06B6D4" />
        <Stat icon={Gauge} label="Avg FTS" value={data.avgFts} color="#F97316" />
        <Stat icon={FlaskConical} label="Labs Completed" value={data.labsCompleted} color="#10B981" />
        <Stat icon={ClipboardCheck} label="Assessment Pass %" value={`${data.assessmentPassRate}%`} color="#0EA5E9" />
        <Stat icon={FileText} label="Assignments" value={data.assignmentsSubmitted} color="#64748B" />
        <Stat icon={Activity} label="Active (14d)" value={data.activeStudentsLast14} color="#EF4444" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4">FTS Distribution</h3>
            <div className="space-y-3">
              {dist.map((d) => (
                <div key={d.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{d.label}</span>
                    <span className="font-medium">{d.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${ftsTotal ? (d.value / ftsTotal) * 100 : 0}%`, backgroundColor: d.color }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4">Lab Points & Assessments</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold font-heading text-primary">{data.labPoints}</div>
                <div className="text-xs text-muted-foreground mt-1">Total Lab Points</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold font-heading text-primary">{data.assessmentsTaken}</div>
                <div className="text-xs text-muted-foreground mt-1">Assessments Taken</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold mb-4">Activity Heatmap (last 30 days)</h3>
          <div className="flex flex-wrap gap-1">
            {data.activityHeatmap.map((h) => (
              <div
                key={h.date}
                title={`${h.date}: ${h.count} active`}
                className="h-5 w-5 rounded-sm"
                style={{ backgroundColor: heatColor(h.count, maxHeat) }}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
