import { Link } from "wouter";
import { useMentorOverview } from "@/lib/mentor-api";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, GridSkeleton } from "@/components/page-shell";
import { motion } from "framer-motion";
import {
  Users, UserCheck, Layers, AlertTriangle, Gauge, FileText,
  Megaphone, BarChart3, ListChecks, ArrowUpRight
} from "lucide-react";

function StatCard({ icon: Icon, label, value, color, delay }: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string; value: string | number; color: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className="glass-card overflow-hidden relative group">
        <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: color }} />
        <CardContent className="p-6 flex flex-col justify-between h-full">
          <div className="flex justify-between items-start mb-4">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 bg-background/50 elevation-1 ring-1 ring-border">
              <Icon className="h-5 w-5" style={{ color }} />
            </div>
          </div>
          <div>
            <div className="text-kpi text-foreground mb-1">{value}</div>
            <div className="text-eyebrow text-muted-foreground">{label}</div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

const QUICK_LINKS = [
  { href: "/mentor/students", label: "Assigned Students", icon: Users, desc: "Monitor live progress" },
  { href: "/mentor/analytics", label: "Cohort Analytics", icon: BarChart3, desc: "FTS & heatmaps" },
  { href: "/mentor/at-risk", label: "At-Risk Students", icon: AlertTriangle, desc: "Signals & interventions" },
  { href: "/mentor/broadcasts", label: "Broadcast Notes", icon: Megaphone, desc: "Announcements" },
  { href: "/mentor/tasks", label: "Task Builder", icon: ListChecks, desc: "Create & assign" },
  { href: "/mentor/reports", label: "Reports", icon: FileText, desc: "Export CSV data" },
];

export default function MentorOverview() {
  const { data, isLoading } = useMentorOverview();

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-10">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <PageHeader 
          icon={Gauge} 
          title="Mentor Command Center" 
          subtitle="Your daily dashboard for cohort health, risk signals, and task management." 
        />
      </motion.div>

      {isLoading || !data ? (
        <GridSkeleton cols={4} rows={2} />
      ) : (
        <div className="space-y-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard icon={Users} label="Total Students" value={data.totalStudents} color="#2563EB" delay={0.1} />
            <StatCard icon={UserCheck} label="Trial Students" value={data.trialStudents} color="#8B5CF6" delay={0.15} />
            <StatCard icon={Layers} label="Active Batches" value={`${data.activeBatches}/${data.totalBatches}`} color="#10B981" delay={0.2} />
            <StatCard icon={AlertTriangle} label="At-Risk Students" value={data.atRiskStudents} color="#EF4444" delay={0.25} />
            <StatCard icon={Gauge} label="Avg FTS" value={data.avgFts} color="#F97316" delay={0.3} />
            <StatCard icon={ListChecks} label="Published Tasks" value={data.publishedTasks} color="#06B6D4" delay={0.35} />
            <StatCard icon={FileText} label="Draft Tasks" value={data.draftTasks} color="#64748B" delay={0.4} />
            <StatCard icon={ListChecks} label="Scheduled Tasks" value={data.scheduledTasks} color="#0EA5E9" delay={0.45} />
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.5 }}
            className="space-y-5"
          >
            <h2 className="text-section-title text-foreground border-b pb-2">Quick Navigation</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {QUICK_LINKS.map((q, i) => (
                <Link key={q.href} href={q.href}>
                  <Card className="hover-lift cursor-pointer group bg-card border-border/60">
                    <CardContent className="p-5 flex items-start gap-4">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <q.icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-card-title">{q.label}</span>
                          <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{q.desc}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
