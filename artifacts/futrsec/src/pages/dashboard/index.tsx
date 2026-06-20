import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User, BookOpen, FlaskConical, Target, Zap, TrendingUp, Clock,
  CheckCircle2, Lock, ChevronRight, Calendar, Briefcase, Shield, Star,
  AlertCircle, Bot, Flame
} from "lucide-react";

const TRACK_COLORS: Record<string, string> = {
  soc: "#2563EB",
  vapt: "#F97316",
  grc: "#10B981",
  ai_security: "#8B5CF6",
  cloud_security: "#06B6D4",
  forensics: "#EF4444",
};

const TRACK_LABELS: Record<string, string> = {
  soc: "SOC Analyst",
  vapt: "VAPT Professional",
  grc: "GRC Specialist",
  ai_security: "AI Security Engineer",
  cloud_security: "Cloud Security Architect",
  forensics: "Digital Forensics",
};

function KpiCard({ label, value, icon: Icon, color, suffix = "" }: {
  label: string; value: number | string; icon: React.ComponentType<any>; color: string; suffix?: string;
}) {
  return (
    <Card className="bg-white border-border/60 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
            <p className="text-2xl font-bold font-heading text-foreground">
              {value}<span className="text-sm font-normal text-muted-foreground">{suffix}</span>
            </p>
          </div>
          <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
            <Icon className="h-4.5 w-4.5" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CheckpointTimeline({ timeline }: { timeline: any[] }) {
  const statusIcon = (status: string) => {
    if (status === "completed") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (status === "locked") return <Lock className="h-4 w-4 text-muted-foreground/40" />;
    return <div className="h-4 w-4 rounded-full border-2 border-primary animate-pulse" />;
  };

  return (
    <div className="space-y-0">
      {timeline.map((cp, i) => (
        <div key={cp.id} className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 transition-colors ${
              cp.status === "completed" ? "border-green-500 bg-green-50" :
              cp.status === "locked" ? "border-border bg-muted/30" :
              "border-primary bg-primary/10"
            }`}>
              {statusIcon(cp.status)}
            </div>
            {i < timeline.length - 1 && (
              <div className={`w-0.5 h-8 mt-0.5 ${cp.status === "completed" ? "bg-green-300" : "bg-border"}`} />
            )}
          </div>
          <div className="pt-1.5 pb-3">
            <p className={`text-sm font-medium ${cp.status === "locked" ? "text-muted-foreground/60" : "text-foreground"}`}>
              {cp.title}
            </p>
            <p className="text-xs text-muted-foreground">{cp.description ?? `FTS ≥ ${cp.requiredScore}`}</p>
          </div>
        </div>
      ))}
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-full flex items-center justify-center border-2 border-dashed border-primary/40 bg-primary/5">
          <Bot className="h-4 w-4 text-primary/60" />
        </div>
        <div className="pt-1.5">
          <p className="text-sm font-medium text-muted-foreground/70">AI Job Agent Unlock</p>
          <p className="text-xs text-muted-foreground">Complete CP5 to activate</p>
        </div>
      </div>
    </div>
  );
}

export default function DashboardHome() {
  const { user } = useAuth();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard/home"],
    queryFn: () => apiFetch<any>("/api/dashboard/home"),
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = data?.user?.firstName || (user?.fullName?.split(" ")[0]) || "Student";
  const trackSlug = data?.track?.slug ?? null;
  const trackColor = trackSlug ? (TRACK_COLORS[trackSlug] ?? "#2563EB") : "#2563EB";
  const trackLabel = trackSlug ? (TRACK_LABELS[trackSlug] ?? trackSlug) : null;

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <Skeleton className="h-32 rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 lg:p-8 flex flex-col items-center justify-center min-h-[300px] text-center">
        <AlertCircle className="h-10 w-10 text-destructive mb-3" />
        <p className="font-medium text-foreground">Failed to load dashboard</p>
        <p className="text-sm text-muted-foreground">Please refresh the page</p>
      </div>
    );
  }

  const kpis = data?.kpis ?? {};
  const trial = data?.trial ?? {};
  const timeline = data?.checkpointTimeline ?? [];

  return (
    <div className="p-5 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl overflow-hidden relative"
        style={{ background: `linear-gradient(135deg, ${trackColor}18 0%, ${trackColor}08 100%)` }}
      >
        <div className="border border-border/60 rounded-2xl p-5 lg:p-7">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-muted-foreground text-sm mb-1">{greeting} 👋</p>
              <h1 className="font-heading text-2xl lg:text-3xl font-bold text-foreground">
                {firstName}
              </h1>
              {trackLabel && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: trackColor }} />
                  <span className="text-sm font-medium" style={{ color: trackColor }}>{trackLabel}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              {trial.isActive && (
                <div className="text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-bold text-foreground">Day {trial.day} / {trial.totalDays}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{trial.daysRemaining} days remaining</p>
                  <Progress value={(trial.day / trial.totalDays) * 100} className="h-1.5 mt-2 w-32" />
                </div>
              )}
              {trackLabel && (
                <div className="h-12 w-12 rounded-xl flex items-center justify-center border-2" style={{ borderColor: trackColor, backgroundColor: `${trackColor}15` }}>
                  <Shield className="h-6 w-6" style={{ color: trackColor }} />
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* KPI Grid */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Overview</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="Profile Completion" value={kpis.profileCompletion ?? 0} suffix="%" icon={User} color="#2563EB" />
          <KpiCard label="Tasks Completed" value={kpis.tasksCompleted ?? 0} icon={CheckCircle2} color="#10B981" />
          <KpiCard label="Learning Hours" value={kpis.learningHours ?? 0} suffix="h" icon={BookOpen} color="#F97316" />
          <KpiCard label="Checkpoint Progress" value={kpis.checkpointProgress ?? 0} suffix="%" icon={Target} color="#8B5CF6" />
          <KpiCard label="FTS Score" value={kpis.ftsScore ?? 0} icon={Star} color="#F59E0B" />
          <KpiCard label="AI Readiness" value={kpis.aiReadiness ?? 0} suffix="%" icon={Bot} color="#8B5CF6" />
          <KpiCard label="Placement Ready" value={kpis.placementReadiness ?? 0} suffix="%" icon={Briefcase} color="#10B981" />
          <KpiCard label="Subscription" value={kpis.subscriptionStatus === "trial" ? "Trial" : "Free"} icon={Zap} color="#2563EB" />
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Checkpoint timeline */}
        <Card className="bg-white border-border/60 lg:col-span-1">
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-sm font-semibold">Journey Timeline</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {timeline.length > 0 ? (
              <CheckpointTimeline timeline={timeline} />
            ) : (
              <div className="text-center py-4 text-sm text-muted-foreground">
                <Target className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Complete your track selection to unlock checkpoints
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick actions + recent activity */}
        <div className="lg:col-span-2 space-y-4">
          {/* Quick actions */}
          <Card className="bg-white border-border/60">
            <CardHeader className="pb-3 pt-4 px-5">
              <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { label: "Continue Learning", href: "/learning", icon: BookOpen, color: "#2563EB" },
                  { label: "Start a Lab", href: "/labs", icon: FlaskConical, color: "#F97316" },
                  { label: "Browse Jobs", href: "/jobs", icon: Briefcase, color: "#10B981" },
                  { label: "AI Career Coach", href: "/ai/career-coach", icon: Bot, color: "#8B5CF6" },
                  { label: "My Profile", href: "/profile", icon: User, color: "#06B6D4" },
                  { label: "DPDP Center", href: "/privacy", icon: Shield, color: "#EF4444" },
                ].map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="flex items-center gap-2.5 p-3 rounded-lg border border-border/60 hover:border-border hover:shadow-sm transition-all group"
                  >
                    <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${action.color}15` }}>
                      <action.icon className="h-3.5 w-3.5" style={{ color: action.color }} />
                    </div>
                    <span className="text-xs font-medium text-foreground/80 group-hover:text-foreground">{action.label}</span>
                    <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/40 group-hover:text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="bg-white border-border/60">
            <CardHeader className="pb-3 pt-4 px-5">
              <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {(data?.recentActivity?.labs?.length > 0 || data?.recentActivity?.applications?.length > 0) ? (
                <div className="space-y-2">
                  {data.recentActivity.labs?.slice(0, 3).map((lab: any) => (
                    <div key={lab.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30">
                      <div className="h-7 w-7 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                        <FlaskConical className="h-3.5 w-3.5 text-orange-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground">Lab attempt</p>
                        <p className="text-[11px] text-muted-foreground">{new Date(lab.startedAt).toLocaleDateString()}</p>
                      </div>
                      <Badge variant={lab.status === "completed" ? "default" : "secondary"} className="text-[10px]">
                        {lab.status}
                      </Badge>
                    </div>
                  ))}
                  {data.recentActivity.applications?.slice(0, 3).map((app: any) => (
                    <div key={app.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30">
                      <div className="h-7 w-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                        <Briefcase className="h-3.5 w-3.5 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground">Job application</p>
                        <p className="text-[11px] text-muted-foreground">{new Date(app.appliedAt).toLocaleDateString()}</p>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">{app.status}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>No activity yet</p>
                  <p className="text-xs mt-1">Start a lab or apply to a job to see your activity here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
