import { useMentorAnalytics } from "@/lib/mentor-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, GridSkeleton } from "@/components/page-shell";
import { BarChart3, Clock, BookOpen, Gauge, FlaskConical, ClipboardCheck, FileText, Activity } from "lucide-react";
import { motion } from "framer-motion";

function Stat({ icon: Icon, label, value, color, delay }: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; label: string; value: string | number; color: string; delay: number;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay }}>
      <Card className="glass-card hover-lift">
        <CardContent className="p-5 flex flex-col gap-4">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 bg-background/50 ring-1 ring-border elevation-1">
            <Icon className="h-5 w-5" style={{ color }} />
          </div>
          <div>
            <div className="text-3xl font-heading font-bold text-foreground tracking-tight mb-1">{value}</div>
            <div className="text-sm font-medium text-muted-foreground">{label}</div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function heatColor(count: number, max: number): string {
  if (count === 0) return "var(--muted)";
  const intensity = Math.min(1, count / Math.max(1, max));
  const alpha = 0.2 + intensity * 0.8;
  return `hsla(var(--primary) / ${alpha})`;
}

export default function MentorAnalyticsPage() {
  const { data, isLoading } = useMentorAnalytics();

  if (isLoading || !data) {
    return (
      <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
        <PageHeader icon={BarChart3} title="Cohort Analytics" subtitle="Aggregate performance metrics across your assigned students." />
        <GridSkeleton cols={4} rows={2} />
      </div>
    );
  }

  const maxHeat = Math.max(1, ...data.activityHeatmap.map((h) => h.count));
  const ftsTotal = data.ftsDistribution.low + data.ftsDistribution.mid + data.ftsDistribution.high;
  const dist = [
    { label: "High Performing (>70)", value: data.ftsDistribution.high, color: "#10B981" },
    { label: "On Track (40–70)", value: data.ftsDistribution.mid, color: "#F97316" },
    { label: "At Risk (<40)", value: data.ftsDistribution.low, color: "#EF4444" },
  ];

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-10">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <PageHeader icon={BarChart3} title="Cohort Analytics" subtitle="Aggregate performance metrics across your assigned students." />
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <Stat icon={BookOpen} label="Cohort Size" value={data.cohortSize} color="#2563EB" delay={0.1} />
        <Stat icon={Clock} label="Avg Learning Hrs" value={data.avgLearningHours} color="#8B5CF6" delay={0.15} />
        <Stat icon={BookOpen} label="Avg Completion" value={`${data.avgCompletion}%`} color="#06B6D4" delay={0.2} />
        <Stat icon={Gauge} label="Avg FTS" value={data.avgFts} color="#F97316" delay={0.25} />
        <Stat icon={FlaskConical} label="Labs Completed" value={data.labsCompleted} color="#10B981" delay={0.3} />
        <Stat icon={ClipboardCheck} label="Assessment Pass" value={`${data.assessmentPassRate}%`} color="#0EA5E9" delay={0.35} />
        <Stat icon={FileText} label="Assignments" value={data.assignmentsSubmitted} color="#64748B" delay={0.4} />
        <Stat icon={Activity} label="Active (14d)" value={data.activeStudentsLast14} color="#EF4444" delay={0.45} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div className="lg:col-span-1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.5 }}>
          <Card className="glass-card h-full">
            <CardHeader>
              <CardTitle className="text-card-title flex items-center gap-2">
                <Gauge className="h-5 w-5 text-primary" /> FTS Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {dist.map((d) => {
                const percent = ftsTotal ? (d.value / ftsTotal) * 100 : 0;
                return (
                  <div key={d.label}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-foreground">{d.label}</span>
                      <span className="text-sm font-bold">{d.value} <span className="text-muted-foreground font-normal ml-1">({percent.toFixed(0)}%)</span></span>
                    </div>
                    <div className="h-3 rounded-full bg-muted overflow-hidden relative">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percent}%` }}
                        transition={{ duration: 1, delay: 0.6, ease: "easeOut" }}
                        className="h-full rounded-full absolute top-0 left-0" 
                        style={{ backgroundColor: d.color }} 
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div className="lg:col-span-2 space-y-6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.6 }}>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-card-title flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" /> Activity Heatmap (30 days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {data.activityHeatmap.map((h, i) => (
                  <motion.div
                    key={h.date}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.2, delay: 0.7 + i * 0.01 }}
                    title={`${h.date}: ${h.count} active`}
                    className="h-6 w-6 rounded-md ring-1 ring-border/50 cursor-crosshair hover:ring-primary transition-all"
                    style={{ backgroundColor: heatColor(h.count, maxHeat) }}
                  />
                ))}
              </div>
              <div className="flex items-center justify-end gap-2 mt-4 text-xs text-muted-foreground">
                <span>Less</span>
                <div className="flex gap-1">
                  {[0, 0.25, 0.5, 0.75, 1].map((intensity, i) => (
                    <div key={i} className="h-3 w-3 rounded-sm" style={{ backgroundColor: heatColor(intensity * maxHeat, maxHeat) }} />
                  ))}
                </div>
                <span>More</span>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-6">
            <Card className="glass-card">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <FlaskConical className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="text-kpi text-foreground leading-none mb-1">{data.labPoints}</div>
                  <div className="text-sm text-muted-foreground">Total Lab Points</div>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <ClipboardCheck className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                  <div className="text-kpi text-foreground leading-none mb-1">{data.assessmentsTaken}</div>
                  <div className="text-sm text-muted-foreground">Assessments Taken</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
