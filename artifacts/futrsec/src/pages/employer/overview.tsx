import { Link } from "wouter";
import { useEmployerOverview } from "@/lib/employer-api";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, GridSkeleton } from "@/components/page-shell";
import {
  Briefcase, BriefcaseBusiness, FileText, Star, CalendarCheck,
  BadgeCheck, UserCheck, Building2, Users, BarChart3, Settings,
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
  { href: "/employer/jobs", label: "Manage Jobs", icon: Briefcase },
  { href: "/employer/candidates", label: "Candidates", icon: Users },
  { href: "/employer/interviews", label: "Interviews", icon: CalendarCheck },
  { href: "/employer/offers", label: "Offers", icon: BadgeCheck },
  { href: "/employer/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/employer/settings", label: "Company Settings", icon: Settings },
];

export default function EmployerOverview() {
  const { data, isLoading } = useEmployerOverview();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader icon={Building2} title="Employer Overview" subtitle="A snapshot of your jobs, applicants and hiring pipeline." />

      {isLoading || !data ? (
        <GridSkeleton cols={3} rows={3} />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <StatCard icon={Briefcase} label="Total Jobs" value={data.totalJobs} color="#2563EB" />
            <StatCard icon={BriefcaseBusiness} label="Active Jobs" value={data.activeJobs} color="#10B981" />
            <StatCard icon={FileText} label="Applications" value={data.applications} color="#8B5CF6" />
            <StatCard icon={Star} label="Shortlisted" value={data.shortlisted} color="#F97316" />
            <StatCard icon={CalendarCheck} label="Interviews" value={data.interviews} color="#06B6D4" />
            <StatCard icon={BadgeCheck} label="Offers" value={data.offers} color="#0EA5E9" />
            <StatCard icon={UserCheck} label="Hired" value={data.hired} color="#22C55E" />
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
