import { Link } from "wouter";
import {
  useAdminOverview,
  useAdminTrackAnalytics,
  TRACK_LABELS,
  TRACK_COLORS,
} from "@/lib/admin-api";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, GridSkeleton } from "@/components/page-shell";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  Gauge,
  Users,
  UserCheck,
  Building2,
  Briefcase,
  FileText,
  Award,
  IndianRupee,
  CreditCard,
  Activity,
  CalendarDays,
  Sparkles,
  GraduationCap,
  ShieldCheck,
  Receipt,
  Bot,
  FileLock2,
  History,
} from "lucide-react";

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <Card>
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

const QUICK_LINKS = [
  { href: "/admin/students", label: "Students", icon: GraduationCap },
  { href: "/admin/mentors", label: "Mentors", icon: UserCheck },
  { href: "/admin/tpos", label: "TPOs", icon: ShieldCheck },
  { href: "/admin/companies", label: "Companies", icon: Building2 },
  { href: "/admin/jobs", label: "Jobs", icon: Briefcase },
  { href: "/admin/applications", label: "Applications", icon: FileText },
  { href: "/admin/placements", label: "Placements", icon: Award },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/admin/payments", label: "Payments", icon: Receipt },
  { href: "/admin/ai-usage", label: "AI Usage", icon: Bot },
  { href: "/admin/consent-logs", label: "Consent Logs", icon: FileLock2 },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: History },
];

export default function AdminOverviewPage() {
  const { data, isLoading } = useAdminOverview();
  const { data: trackData } = useAdminTrackAnalytics();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader
        icon={Gauge}
        title="Platform Overview"
        subtitle="A real-time snapshot of the entire FUTRSEC platform."
      />

      {isLoading || !data ? (
        <GridSkeleton cols={3} rows={4} />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard icon={Users} label="Total Students" value={data.totalStudents} color="#2563EB" />
            <StatCard icon={UserCheck} label="Mentors" value={data.mentors} color="#8B5CF6" />
            <StatCard icon={ShieldCheck} label="TPOs" value={data.tpos} color="#0EA5E9" />
            <StatCard icon={Building2} label="Companies" value={data.companies} color="#F97316" />
            <StatCard icon={Briefcase} label="Jobs" value={data.jobs} color="#10B981" />
            <StatCard icon={FileText} label="Applications" value={data.applications} color="#06B6D4" />
            <StatCard icon={Award} label="Placements" value={data.placements} color="#22C55E" />
            <StatCard
              icon={IndianRupee}
              label="Revenue"
              value={`₹${data.revenue.toLocaleString("en-IN")}`}
              color="#16A34A"
            />
            <StatCard icon={CreditCard} label="Subscriptions" value={data.subscriptions} color="#EC4899" />
            <StatCard icon={Activity} label="Daily Active Users" value={data.dailyActiveUsers} color="#EF4444" />
            <StatCard icon={CalendarDays} label="Monthly Active Users" value={data.monthlyActiveUsers} color="#F59E0B" />
            <StatCard icon={Sparkles} label="AI Usage" value={data.aiUsage} color="#A855F7" />
          </div>

          <Card className="mb-6">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold mb-4">Students by Track</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {(["soc", "vapt", "grc"] as const).map((t) => (
                  <div key={t} className="flex items-center gap-3 rounded-lg bg-muted/40 p-4">
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: TRACK_COLORS[t] }}
                    />
                    <div>
                      <div className="text-xl font-bold font-heading leading-none">
                        {data.byTrack[t]}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{TRACK_LABELS[t]}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {trackData && trackData.rows.length > 0 && (
            <Card className="mb-6">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold mb-4">Track Analytics</h3>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={trackData.rows.map((r) => ({
                        ...r,
                        name: TRACK_LABELS[r.track] ?? r.track,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="students" name="Students" fill="#2563EB" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="applications" name="Applications" fill="#F97316" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="placements" name="Placements" fill="#10B981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
            Quick Links
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
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
