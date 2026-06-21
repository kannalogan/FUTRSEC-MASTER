import { Link } from "wouter";
import { useMentorOverview } from "@/lib/mentor-api";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, GridSkeleton } from "@/components/page-shell";
import {
  Users, UserCheck, Layers, AlertTriangle, Gauge, FileText,
  Megaphone, BarChart3, ListChecks,
} from "lucide-react";

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string; value: string | number; color: string;
}) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}18` }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <div>
          <div className="text-2xl font-bold font-heading text-foreground leading-none">{value}</div>
          <div className="text-xs text-muted-foreground mt-1">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

const QUICK_LINKS = [
  { href: "/mentor/students", label: "Assigned Students", icon: Users },
  { href: "/mentor/analytics", label: "Cohort Analytics", icon: BarChart3 },
  { href: "/mentor/at-risk", label: "At-Risk Students", icon: AlertTriangle },
  { href: "/mentor/broadcasts", label: "Broadcast Notes", icon: Megaphone },
  { href: "/mentor/tasks", label: "Task Builder", icon: ListChecks },
  { href: "/mentor/reports", label: "Reports", icon: FileText },
];

export default function MentorOverview() {
  const { data, isLoading } = useMentorOverview();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader icon={Gauge} title="Mentor Overview" subtitle="A snapshot of your cohort, tasks and risk signals." />

      {isLoading || !data ? (
        <GridSkeleton cols={3} rows={3} />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <StatCard icon={Users} label="Total Students" value={data.totalStudents} color="#2563EB" />
            <StatCard icon={UserCheck} label="Trial Students" value={data.trialStudents} color="#8B5CF6" />
            <StatCard icon={Layers} label="Active Batches" value={`${data.activeBatches}/${data.totalBatches}`} color="#10B981" />
            <StatCard icon={AlertTriangle} label="At-Risk Students" value={data.atRiskStudents} color="#EF4444" />
            <StatCard icon={Gauge} label="Avg FTS" value={data.avgFts} color="#F97316" />
            <StatCard icon={ListChecks} label="Published Tasks" value={data.publishedTasks} color="#06B6D4" />
            <StatCard icon={FileText} label="Draft Tasks" value={data.draftTasks} color="#64748B" />
            <StatCard icon={ListChecks} label="Scheduled Tasks" value={data.scheduledTasks} color="#0EA5E9" />
          </div>

          <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Quick Links</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {QUICK_LINKS.map((q) => (
              <Link key={q.href} href={q.href}>
                <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-3">
                    <q.icon className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{q.label}</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
