import { Link, useParams } from "wouter";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, LabelList,
} from "recharts";
import {
  useDrive, useDriveAnalytics, useDriveSchedules,
  ROUND_TYPE_LABELS, STAGE_LABELS,
  type Schedule,
} from "@/lib/placement-drives-api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader, CardSkeleton, EmptyState } from "@/components/page-shell";
import { exportToCSV } from "@/lib/export-utils";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  BarChart3, ArrowLeft, Download, Users, ShieldCheck, Award, TrendingUp,
} from "lucide-react";

const FUNNEL_COLORS = ["#3B82F6", "#6366F1", "#8B5CF6", "#A855F7", "#F59E0B", "#10B981", "#059669", "#EF4444", "#94A3B8"];

export default function TpoDriveAnalytics() {
  const params = useParams();
  const id = Number(params.id);
  const { toast } = useToast();

  const { data: detail, isLoading } = useDrive(id);
  const { data: analytics, isLoading: aLoading } = useDriveAnalytics(id);
  const { data: schedulesData } = useDriveSchedules(id);

  const drive = detail?.drive;
  const schedules = schedulesData?.schedules ?? [];

  if (isLoading || aLoading) {
    return <div className="p-6 max-w-6xl mx-auto space-y-4"><CardSkeleton rows={2} /><CardSkeleton rows={4} /></div>;
  }

  if (!drive || !analytics) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <EmptyState
          icon={BarChart3}
          title="Drive not found"
          description="This placement drive does not exist or you do not have access to it."
          action={<Link href="/tpo/drives"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-1.5" /> Back to drives</Button></Link>}
        />
      </div>
    );
  }

  const funnelData = analytics.funnel.map((f) => ({
    stage: STAGE_LABELS[f.stage] ?? f.stage,
    count: f.count,
  }));

  const roundData = analytics.perRound.map((r) => ({
    name: r.name.length > 14 ? `${r.name.slice(0, 14)}…` : r.name,
    fullName: r.name,
    type: ROUND_TYPE_LABELS[r.type] ?? r.type,
    scheduled: r.scheduled,
    completed: r.completed,
    passed: r.passed,
    passRate: r.passRate,
  }));

  const exportFunnel = () => {
    exportToCSV(
      `${drive.companyName}-pipeline-${format(new Date(), "yyyyMMdd")}`,
      [
        { key: "stage", label: "Stage" },
        { key: "count", label: "Candidates" },
      ],
      funnelData,
    );
    toast({ title: "Pipeline exported" });
  };

  const exportRounds = () => {
    exportToCSV(
      `${drive.companyName}-rounds-${format(new Date(), "yyyyMMdd")}`,
      [
        { key: "fullName", label: "Round" },
        { key: "type", label: "Type" },
        { key: "scheduled", label: "Scheduled" },
        { key: "completed", label: "Completed" },
        { key: "passed", label: "Passed" },
        { key: "passRate", label: "Pass Rate %" },
      ],
      roundData,
    );
    toast({ title: "Round stats exported" });
  };

  const exportInterviews = () => {
    if (schedules.length === 0) { toast({ title: "No interviews to export", variant: "destructive" }); return; }
    exportToCSV<Schedule>(
      `${drive.companyName}-interviews-${format(new Date(), "yyyyMMdd")}`,
      [
        { key: "student", label: "Student", format: (s) => s.student?.fullName ?? "" },
        { key: "email", label: "Email", format: (s) => s.student?.email ?? "" },
        { key: "round", label: "Round", format: (s) => s.round?.name ?? "" },
        { key: "slotStart", label: "Slot", format: (s) => format(new Date(s.slotStart), "dd MMM yyyy h:mm a") },
        { key: "attendance", label: "Attendance" },
        { key: "result", label: "Result" },
        { key: "score", label: "Score", format: (s) => (s.score != null ? s.score : "") },
        { key: "feedback", label: "Feedback", format: (s) => s.feedback ?? "" },
      ],
      schedules,
    );
    toast({ title: "Interviews exported" });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Link href={`/tpo/drives/${id}`}>
        <Button variant="ghost" size="sm" className="mb-3 -ml-2 text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-1.5" /> {drive.companyName}
        </Button>
      </Link>

      <PageHeader
        icon={BarChart3}
        title="Drive Analytics"
        subtitle={`${drive.companyName} · ${drive.role}`}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={exportInterviews}><Download className="h-4 w-4 mr-1.5" /> Interviews CSV</Button>
          </div>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Kpi icon={Users} label="Invited" value={analytics.invited} />
        <Kpi icon={ShieldCheck} label="Accepted" value={analytics.accepted} sub={`${analytics.declined} declined · ${analytics.pending} pending`} />
        <Kpi icon={TrendingUp} label="Attendance" value={`${analytics.attendanceRate}%`} />
        <Kpi icon={Award} label="Offers" value={analytics.offers} sub={`${analytics.joined} joined`} />
      </div>

      {/* Funnel */}
      <Card className="mb-6">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-semibold text-foreground">Placement Pipeline</h2>
            <Button size="sm" variant="ghost" onClick={exportFunnel}><Download className="h-4 w-4 mr-1.5" /> CSV</Button>
          </div>
          {funnelData.every((f) => f.count === 0) ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No pipeline data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={funnelData} layout="vertical" margin={{ left: 20, right: 32 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis type="category" dataKey="stage" width={90} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--popover-foreground))" }}
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {funnelData.map((_, i) => <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />)}
                  <LabelList dataKey="count" position="right" fill="hsl(var(--foreground))" fontSize={12} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Per-round performance */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-semibold text-foreground">Round Performance</h2>
            <Button size="sm" variant="ghost" onClick={exportRounds} disabled={roundData.length === 0}><Download className="h-4 w-4 mr-1.5" /> CSV</Button>
          </div>
          {roundData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No rounds configured yet.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={roundData} margin={{ left: 0, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--popover-foreground))" }}
                    cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                  />
                  <Bar dataKey="scheduled" name="Scheduled" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completed" name="Completed" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="passed" name="Passed" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Round</th>
                      <th className="px-3 py-2 font-medium">Type</th>
                      <th className="px-3 py-2 font-medium text-right">Scheduled</th>
                      <th className="px-3 py-2 font-medium text-right">Completed</th>
                      <th className="px-3 py-2 font-medium text-right">Passed</th>
                      <th className="px-3 py-2 font-medium text-right">Pass Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roundData.map((r, i) => (
                      <tr key={i} className="border-b border-border/50 last:border-0">
                        <td className="px-3 py-2 text-foreground font-medium">{r.fullName}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.type}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{r.scheduled}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{r.completed}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{r.passed}</td>
                        <td className="px-3 py-2 text-right font-medium text-foreground">{r.passRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <Icon className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
        </div>
        <div className="text-2xl font-bold text-foreground leading-none">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}
