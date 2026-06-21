import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { Link, Redirect } from "wouter";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User, BookOpen, FlaskConical, Target, Zap, Clock,
  CheckCircle2, Lock, ChevronRight, Briefcase, Shield, Star,
  AlertCircle, Bot, Flame
} from "lucide-react";

const TRACK_COLORS: Record<string, string> = {
  soc: "#3B82F6",
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

function CircularProgress({ value, size = 84, stroke = 7, color = "#3B82F6", label, sub }: {
  value: number; size?: number; stroke?: number; color?: string; label: string; sub?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const offset = c - (pct / 100) * c;
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth={stroke} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
            strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.8s ease", filter: `drop-shadow(0 0 6px ${color}99)` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold font-heading text-foreground">{label}</span>
        </div>
      </div>
      {sub && <span className="text-[11px] text-muted-foreground mt-1.5">{sub}</span>}
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, color, suffix = "" }: {
  label: string; value: number | string; icon: React.ComponentType<any>; color: string; suffix?: string;
}) {
  return (
    <Card className="glass-card hover-lift border-0">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[13px] font-medium text-muted-foreground mb-1.5">{label}</p>
            <p className="text-3xl font-bold font-heading text-foreground">
              {value}<span className="text-base font-normal text-muted-foreground">{suffix}</span>
            </p>
          </div>
          <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}22`, boxShadow: `inset 0 0 0 1px ${color}33` }}>
            <Icon className="h-5 w-5" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CheckpointTimeline({ timeline }: { timeline: any[] }) {
  const statusIcon = (status: string) => {
    if (status === "completed") return <CheckCircle2 className="h-4 w-4 text-emerald" />;
    if (status === "locked") return <Lock className="h-4 w-4 text-muted-foreground/40" />;
    return <div className="h-4 w-4 rounded-full border-2 border-primary animate-pulse" />;
  };

  return (
    <div className="space-y-0">
      {timeline.map((cp, i) => (
        <div key={cp.id} className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 transition-colors ${
              cp.status === "completed" ? "border-emerald bg-emerald/10" :
              cp.status === "locked" ? "border-border bg-muted/30" :
              "border-primary bg-primary/10"
            }`}>
              {statusIcon(cp.status)}
            </div>
            {i < timeline.length - 1 && (
              <div className={`w-0.5 h-8 mt-0.5 ${cp.status === "completed" ? "bg-emerald/40" : "bg-border"}`} />
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

  if (user?.role === "tpo") return <Redirect to="/tpo" />;
  if (user?.role === "employer") return <Redirect to="/employer" />;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard/home"],
    queryFn: () => apiFetch<any>("/api/dashboard/home"),
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = data?.user?.firstName || (user?.fullName?.split(" ")[0]) || "Student";
  const trackSlug = data?.track?.slug ?? null;
  const trackColor = trackSlug ? (TRACK_COLORS[trackSlug] ?? "#3B82F6") : "#3B82F6";
  const trackLabel = trackSlug ? (TRACK_LABELS[trackSlug] ?? trackSlug) : null;

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        <Skeleton className="h-44 rounded-3xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
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
  const initial = (firstName?.[0] ?? "S").toUpperCase();

  return (
    <div className="p-5 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative rounded-3xl overflow-hidden glass-card p-6 lg:p-8"
      >
        {/* Animated ambient blobs */}
        <motion.div
          className="pointer-events-none absolute -top-24 -right-10 h-72 w-72 rounded-full blur-[90px]"
          style={{ backgroundColor: `${trackColor}40` }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.7, 0.5] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-violet/30 blur-[90px]"
          animate={{ scale: [1, 1.2, 1], opacity: [0.35, 0.55, 0.35] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative flex items-start justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-5">
            <div
              className="h-16 w-16 lg:h-20 lg:w-20 rounded-2xl flex items-center justify-center text-2xl font-bold font-heading text-white shrink-0 ring-1 ring-border"
              style={{ background: `linear-gradient(135deg, ${trackColor}, #8B5CF6)` }}
            >
              {initial}
            </div>
            <div>
              <p className="text-muted-foreground text-sm mb-1">{greeting}</p>
              <h1 className="text-page-title text-foreground">{firstName}</h1>
              {trackLabel && (
                <div className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full bg-muted/60 ring-1 ring-border">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: trackColor, boxShadow: `0 0 8px ${trackColor}` }} />
                  <span className="text-sm font-semibold" style={{ color: trackColor }}>{trackLabel}</span>
                </div>
              )}
            </div>
          </div>

          {/* Readiness rings */}
          <div className="flex items-center gap-6">
            <CircularProgress
              value={Number(kpis.ftsScore ?? 0)}
              color="#F59E0B"
              label={String(kpis.ftsScore ?? 0)}
              sub="FTS Score"
            />
            <CircularProgress
              value={Number(kpis.aiReadiness ?? 0)}
              color="#8B5CF6"
              label={`${kpis.aiReadiness ?? 0}%`}
              sub="AI Ready"
            />
            <CircularProgress
              value={Number(kpis.placementReadiness ?? 0)}
              color="#10B981"
              label={`${kpis.placementReadiness ?? 0}%`}
              sub="Placement"
            />
          </div>
        </div>

        {trial.isActive && (
          <div className="relative mt-6 flex items-center gap-3 rounded-2xl bg-muted/50 ring-1 ring-border px-4 py-3">
            <Flame className="h-5 w-5 text-orange-400 shrink-0" />
            <span className="text-sm font-semibold text-foreground">Trial — Day {trial.day} / {trial.totalDays}</span>
            <span className="text-xs text-muted-foreground">{trial.daysRemaining} days remaining</span>
            <div className="ml-auto h-2 w-40 max-w-[40vw] rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-orange-400 to-primary" style={{ width: `${(trial.day / trial.totalDays) * 100}%` }} />
            </div>
          </div>
        )}
      </motion.div>

      {/* KPI Grid */}
      <div>
        <h2 className="text-eyebrow text-muted-foreground mb-4">Overview</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KpiCard label="Profile Completion" value={kpis.profileCompletion ?? 0} suffix="%" icon={User} color="#3B82F6" />
          <KpiCard label="Tasks Completed" value={kpis.tasksCompleted ?? 0} icon={CheckCircle2} color="#10B981" />
          <KpiCard label="Learning Hours" value={kpis.learningHours ?? 0} suffix="h" icon={BookOpen} color="#F97316" />
          <KpiCard label="Checkpoint Progress" value={kpis.checkpointProgress ?? 0} suffix="%" icon={Target} color="#8B5CF6" />
          <KpiCard label="FTS Score" value={kpis.ftsScore ?? 0} icon={Star} color="#F59E0B" />
          <KpiCard label="AI Readiness" value={kpis.aiReadiness ?? 0} suffix="%" icon={Bot} color="#8B5CF6" />
          <KpiCard label="Placement Ready" value={kpis.placementReadiness ?? 0} suffix="%" icon={Briefcase} color="#10B981" />
          <KpiCard label="Subscription" value={kpis.subscriptionStatus === "trial" ? "Trial" : "Free"} icon={Zap} color="#3B82F6" />
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Checkpoint timeline */}
        <Card className="glass-card border-0 lg:col-span-1">
          <CardHeader className="pb-3 pt-5 px-6">
            <CardTitle className="text-card-title">Journey Timeline</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
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
        <div className="lg:col-span-2 space-y-6">
          {/* Quick actions */}
          <Card className="glass-card border-0">
            <CardHeader className="pb-3 pt-5 px-6">
              <CardTitle className="text-card-title">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: "Continue Learning", href: "/learning", icon: BookOpen, color: "#3B82F6" },
                  { label: "Start a Lab", href: "/labs", icon: FlaskConical, color: "#F97316" },
                  { label: "Browse Jobs", href: "/jobs", icon: Briefcase, color: "#10B981" },
                  { label: "AI Career Coach", href: "/ai/career-coach", icon: Bot, color: "#8B5CF6" },
                  { label: "My Profile", href: "/profile", icon: User, color: "#06B6D4" },
                  { label: "DPDP Center", href: "/privacy", icon: Shield, color: "#EF4444" },
                ].map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="flex items-center gap-3 p-3.5 rounded-xl bg-muted/40 ring-1 ring-border hover:ring-primary/30 hover:bg-muted/70 transition-all group"
                  >
                    <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${action.color}22` }}>
                      <action.icon className="h-4 w-4" style={{ color: action.color }} />
                    </div>
                    <span className="text-sm font-medium text-foreground/85 group-hover:text-foreground">{action.label}</span>
                    <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground/40 group-hover:text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="glass-card border-0">
            <CardHeader className="pb-3 pt-5 px-6">
              <CardTitle className="text-card-title">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              {(data?.recentActivity?.labs?.length > 0 || data?.recentActivity?.applications?.length > 0) ? (
                <div className="space-y-2.5">
                  {data.recentActivity.labs?.slice(0, 3).map((lab: any) => (
                    <div key={lab.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 ring-1 ring-border">
                      <div className="h-8 w-8 rounded-lg bg-orange-500/15 flex items-center justify-center shrink-0">
                        <FlaskConical className="h-4 w-4 text-orange-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">Lab attempt</p>
                        <p className="text-xs text-muted-foreground">{new Date(lab.startedAt).toLocaleDateString()}</p>
                      </div>
                      <Badge variant={lab.status === "completed" ? "default" : "secondary"} className="text-[10px]">
                        {lab.status}
                      </Badge>
                    </div>
                  ))}
                  {data.recentActivity.applications?.slice(0, 3).map((app: any) => (
                    <div key={app.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 ring-1 ring-border">
                      <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                        <Briefcase className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">Job application</p>
                        <p className="text-xs text-muted-foreground">{new Date(app.appliedAt).toLocaleDateString()}</p>
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
