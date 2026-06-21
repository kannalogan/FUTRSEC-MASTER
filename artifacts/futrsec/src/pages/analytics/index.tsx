import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PageHeader, GridSkeleton } from "@/components/page-shell";
import {
  RadialBarChart, RadialBar, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, PolarAngleAxis,
} from "recharts";
import {
  BarChart3, Clock, Gauge, Target, FlaskConical, Rocket,
} from "lucide-react";
import { useStudentAnalytics } from "@/lib/analytics-api";

function StatCard({
  icon: Icon, label, value, suffix, color,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: number;
  suffix?: string;
  color: string;
}) {
  return (
    <Card className="bg-white border-border/60">
      <CardContent className="p-5 flex items-center gap-4">
        <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}18` }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <div>
          <div className="text-2xl font-bold font-heading text-foreground leading-none">
            {value}{suffix}
          </div>
          <div className="text-xs text-muted-foreground mt-1">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const { data, isLoading } = useStudentAnalytics();

  if (isLoading || !data) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <PageHeader icon={BarChart3} title="Analytics" subtitle="Your learning & job readiness analytics" />
        <GridSkeleton cols={3} rows={1} />
      </div>
    );
  }

  const readinessData = [{ name: "Job Readiness", value: data.jobReadiness, fill: "#2563EB" }];

  const progressBars = [
    { label: "Checkpoint Progress", value: data.checkpointProgress, color: "#7C3AED" },
    { label: "Lab Completion", value: data.labCompletion, color: "#F97316" },
    { label: "Job Readiness", value: data.jobReadiness, color: "#10B981" },
  ];

  const barData = [
    { name: "Checkpoints", value: data.checkpointProgress },
    { name: "Labs", value: data.labCompletion },
    { name: "Readiness", value: data.jobReadiness },
    { name: "FTS", value: data.ftsScore },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader icon={BarChart3} title="Analytics" subtitle="Your learning & job readiness analytics" />

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Clock} label="Learning Hours" value={data.learningHours} color="#0EA5E9" />
        <StatCard icon={Gauge} label="Future Talent Score" value={data.ftsScore} color="#F97316" />
        <StatCard icon={Target} label="Checkpoint Progress" value={data.checkpointProgress} suffix="%" color="#7C3AED" />
        <StatCard icon={FlaskConical} label="Lab Completion" value={data.labCompletion} suffix="%" color="#10B981" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Job readiness radial */}
        <Card className="bg-white border-border/60">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-1.5">
              <Rocket className="h-4 w-4 text-primary" />Job Readiness
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <RadialBarChart innerRadius="70%" outerRadius="100%" data={readinessData} startAngle={90} endAngle={-270}>
                <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                <RadialBar background dataKey="value" cornerRadius={12} angleAxisId={0} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="text-center -mt-32 mb-20">
              <div className="text-3xl font-bold text-foreground">{data.jobReadiness}%</div>
              <div className="text-xs text-muted-foreground">ready for placement</div>
            </div>
          </CardContent>
        </Card>

        {/* Progress breakdown */}
        <Card className="bg-white border-border/60">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-1.5">
              <Target className="h-4 w-4 text-primary" />Progress Breakdown
            </h3>
            <div className="space-y-4">
              {progressBars.map((b) => (
                <div key={b.label}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">{b.label}</span>
                    <span className="font-medium text-foreground">{b.value}%</span>
                  </div>
                  <Progress value={b.value} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Metrics comparison */}
        <Card className="bg-white border-border/60 lg:col-span-2">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4 text-primary" />Metrics Overview
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
