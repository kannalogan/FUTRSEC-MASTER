import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, GridSkeleton } from "@/components/page-shell";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import {
  LayoutDashboard, Users, BookOpen, FlaskConical, Briefcase, GraduationCap,
  UserCog, Building2, School, IndianRupee, TrendingUp, PieChart as PieIcon,
  BarChart3, Gauge, Target,
} from "lucide-react";

const TRACK_LABELS: Record<string, string> = {
  soc: "SOC Analyst",
  vapt: "VAPT Professional",
  grc: "GRC Specialist",
};
const TRACK_COLORS: Record<string, string> = {
  soc: "#2563EB",
  vapt: "#F97316",
  grc: "#10B981",
};

interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  trialStudents: number;
  premiumStudents: number;
  socStudents: number;
  vaptStudents: number;
  grcStudents: number;
  totalMentors: number;
  totalTpos: number;
  totalEmployers: number;
  totalCourses: number;
  totalLabs: number;
  totalJobs: number;
  totalInternships: number;
  revenue: number;
}

interface DashboardCharts {
  dailySignups: { date: string; count: number }[];
  trackDistribution: { track: string; count: number }[];
  trialVsPremium: { trial: number; premium: number; free: number };
  placement: { applied: number; interviewing: number; offers: number };
  ftsDistribution: { bucket: string; count: number }[];
}

function StatCard({
  icon: Icon, label, value, color,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <Card className="bg-card border-border/60">
      <CardContent className="p-5 flex items-center gap-4">
        <div
          className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${color}18` }}
        >
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <div>
          <div className="text-2xl font-bold font-heading text-foreground leading-none">
            {value}
          </div>
          <div className="text-xs text-muted-foreground mt-1">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

export default function AdminDashboardPage() {
  const statsQuery = useQuery({
    queryKey: ["/api/admin/dashboard/stats"],
    queryFn: () => apiFetch<DashboardStats>("/api/admin/dashboard/stats"),
  });
  const chartsQuery = useQuery({
    queryKey: ["/api/admin/dashboard/charts"],
    queryFn: () => apiFetch<DashboardCharts>("/api/admin/dashboard/charts"),
  });

  const stats = statsQuery.data;
  const charts = chartsQuery.data;
  const isLoading = statsQuery.isLoading || chartsQuery.isLoading;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader
        icon={LayoutDashboard}
        title="Admin Dashboard"
        subtitle="Platform-wide overview of students, content, and revenue"
      />

      {isLoading || !stats || !charts ? (
        <GridSkeleton cols={3} rows={3} />
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
            <StatCard icon={Users} label="Total Students" value={stats.totalStudents} color="#2563EB" />
            <StatCard icon={BookOpen} label="Courses" value={stats.totalCourses} color="#7C3AED" />
            <StatCard icon={FlaskConical} label="Labs" value={stats.totalLabs} color="#F97316" />
            <StatCard icon={Briefcase} label="Jobs" value={stats.totalJobs} color="#0EA5E9" />
            <StatCard icon={GraduationCap} label="Internships" value={stats.totalInternships} color="#10B981" />
            <StatCard icon={UserCog} label="Mentors" value={stats.totalMentors} color="#EC4899" />
            <StatCard icon={School} label="TPOs" value={stats.totalTpos} color="#8B5CF6" />
            <StatCard icon={Building2} label="Employers" value={stats.totalEmployers} color="#F59E0B" />
            <StatCard icon={IndianRupee} label="Revenue" value={inr(stats.revenue)} color="#16A34A" />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* Daily signups */}
            <Card className="bg-card border-border/60">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-primary" />Daily Signups (last 14 days)
                </h3>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={charts.dailySignups}>
                    <defs>
                      <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(d: string) => d.slice(5)}
                    />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#2563EB"
                      strokeWidth={2}
                      fill="url(#signupGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Track distribution */}
            <Card className="bg-card border-border/60">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-1.5">
                  <PieIcon className="h-4 w-4 text-primary" />Track Distribution
                </h3>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={charts.trackDistribution}
                      dataKey="count"
                      nameKey="track"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {charts.trackDistribution.map((entry) => (
                        <Cell key={entry.track} fill={TRACK_COLORS[entry.track] ?? "#94A3B8"} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        value,
                        TRACK_LABELS[name] ?? name,
                      ]}
                    />
                    <Legend
                      formatter={(value: string) => TRACK_LABELS[value] ?? value}
                      iconType="circle"
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* FTS distribution */}
          <Card className="bg-card border-border/60 mb-4">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-1.5">
                <BarChart3 className="h-4 w-4 text-primary" />Future Talent Score Distribution
              </h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={charts.ftsDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#F97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Trial vs Premium + Placement funnel */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="bg-card border-border/60">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-1.5">
                  <Gauge className="h-4 w-4 text-primary" />Subscription Mix
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-muted/50 p-4 text-center">
                    <div className="text-2xl font-bold text-foreground">{charts.trialVsPremium.free}</div>
                    <div className="text-xs text-muted-foreground mt-1">Free</div>
                  </div>
                  <div className="rounded-lg bg-warning/10 p-4 text-center">
                    <div className="text-2xl font-bold text-warning">{charts.trialVsPremium.trial}</div>
                    <div className="text-xs text-muted-foreground mt-1">Trial</div>
                  </div>
                  <div className="rounded-lg bg-success/10 p-4 text-center">
                    <div className="text-2xl font-bold text-success">{charts.trialVsPremium.premium}</div>
                    <div className="text-xs text-muted-foreground mt-1">Premium</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/60">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-1.5">
                  <Target className="h-4 w-4 text-primary" />Placement Funnel
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-info/10 p-4 text-center">
                    <div className="text-2xl font-bold text-info">{charts.placement.applied}</div>
                    <div className="text-xs text-muted-foreground mt-1">Applied</div>
                  </div>
                  <div className="rounded-lg bg-violet/10 p-4 text-center">
                    <div className="text-2xl font-bold text-violet">{charts.placement.interviewing}</div>
                    <div className="text-xs text-muted-foreground mt-1">Interviewing</div>
                  </div>
                  <div className="rounded-lg bg-success/10 p-4 text-center">
                    <div className="text-2xl font-bold text-success">{charts.placement.offers}</div>
                    <div className="text-xs text-muted-foreground mt-1">Offers</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
