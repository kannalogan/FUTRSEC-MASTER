import { Link } from "wouter";
import { useTpoOverview, TRACK_LABELS, TRACK_COLORS, TRACKS } from "@/lib/tpo-api";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, GridSkeleton } from "@/components/page-shell";
import {
  Users, FileText, MessageSquare, Award, CheckCircle2, CalendarDays,
  BarChart3, Briefcase, FolderKanban, ClipboardList, Settings, Gauge,
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
  { href: "/tpo/directory", label: "Student Directory", icon: Users },
  { href: "/tpo/placements", label: "Placements", icon: Briefcase },
  { href: "/tpo/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/tpo/reports", label: "Track Reports", icon: ClipboardList },
  { href: "/tpo/events", label: "Events", icon: CalendarDays },
  { href: "/tpo/settings", label: "Settings", icon: Settings },
];

export default function TpoOverview() {
  const { data, isLoading } = useTpoOverview();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader icon={Gauge} title="TPO Overview" subtitle="A snapshot of student placements, applications and events." />

      {isLoading || !data ? (
        <GridSkeleton cols={3} rows={2} />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <StatCard icon={Users} label="Total Students" value={data.totalStudents} color="#2563EB" />
            <StatCard icon={FileText} label="Applications" value={data.applications} color="#8B5CF6" />
            <StatCard icon={MessageSquare} label="Interviews" value={data.interviews} color="#0EA5E9" />
            <StatCard icon={Award} label="Offers" value={data.offers} color="#F97316" />
            <StatCard icon={CheckCircle2} label="Placed" value={data.placed} color="#10B981" />
            <StatCard icon={CalendarDays} label="Events" value={data.events} color="#06B6D4" />
          </div>

          <Card className="mb-6">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-primary" /> Track Distribution
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {TRACKS.map((t) => (
                  <div key={t} className="rounded-lg border border-border/60 p-4 flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: TRACK_COLORS[t] }} />
                    <div>
                      <div className="text-xl font-bold font-heading leading-none">{data.byTrack[t]}</div>
                      <div className="text-xs text-muted-foreground mt-1">{TRACK_LABELS[t]}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Quick Links</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {QUICK_LINKS.map((q) => (
              <Link key={q.href} href={q.href}>
                <Card className="hover:border-primary/50 hover-lift transition-all cursor-pointer">
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
