import { useAdminAnalytics, TRACK_LABELS, TRACK_COLORS } from "@/lib/analytics-api";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, GridSkeleton, EmptyState } from "@/components/page-shell";
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  BarChart3, Briefcase, TrendingUp, IndianRupee, Award,
  Users, GraduationCap, CreditCard,
} from "lucide-react";

function inr(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}
function inrLakh(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}
function fmtMonth(key: string): string {
  const [y, m] = key.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const mi = parseInt(m, 10) - 1;
  return mi >= 0 && mi < 12 ? `${months[mi]} ${y?.slice(2)}` : key;
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

export default function AdminAnalyticsPage() {
  const { data, isLoading } = useAdminAnalytics();

  if (isLoading || !data) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <PageHeader
          icon={BarChart3}
          title="Placement & Revenue Analytics"
          subtitle="Platform-wide placement and revenue metrics"
        />
        <GridSkeleton cols={3} rows={2} />
      </div>
    );
  }

  const pieData = data.trackWisePlacement.map((d) => ({
    name: TRACK_LABELS[d.track] ?? d.track,
    value: d.count,
    color: TRACK_COLORS[d.track] ?? "#64748B",
  }));
  const hasTracks = pieData.some((d) => d.value > 0);
  const monthly = data.monthlyRevenue.map((m) => ({ month: fmtMonth(m.month), amount: Math.round(m.amount / 100) }));
  const hasMonthly = monthly.some((m) => m.amount > 0);
  const colleges = data.topColleges.slice(0, 8);
  const hasColleges = colleges.length > 0;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader
        icon={BarChart3}
        title="Placement & Revenue Analytics"
        subtitle="Platform-wide placement and revenue metrics"
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Briefcase} label="Total Placements" value={data.totalPlacements} color="#2563EB" />
        <StatCard icon={TrendingUp} label="Placement Rate" value={`${data.placementRate}%`} color="#10B981" />
        <StatCard icon={Award} label="Avg Package" value={inrLakh(data.avgPackage)} color="#F97316" />
        <StatCard icon={Award} label="Highest Package" value={inrLakh(data.highestPackage)} color="#8B5CF6" />
        <StatCard icon={IndianRupee} label="Total Revenue" value={inr(data.revenue)} color="#10B981" />
        <StatCard icon={CreditCard} label="Active Subscriptions" value={data.subscriptions} color="#2563EB" />
        <StatCard icon={TrendingUp} label="Trial Conversions" value={data.trialConversions} color="#F97316" />
        <StatCard icon={Users} label="DAU / MAU" value={`${data.dau} / ${data.mau}`} color="#8B5CF6" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4">Track-wise Placements</h3>
            {hasTracks ? (
              <>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                      {pieData.map((d) => <Cell key={d.name} fill={d.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 mt-3 justify-center">
                  {pieData.map((d) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-muted-foreground">{d.name}</span>
                      <span className="font-medium">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState icon={BarChart3} title="No placements" description="Track-wise placements will appear here." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4">Monthly Revenue</h3>
            {hasMonthly ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => inrLakh(v)} />
                  <Line type="monotone" dataKey="amount" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={IndianRupee} title="No revenue data" description="Revenue trends will appear here once payments are recorded." />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4" /> Top Colleges by Placements
            </h3>
            {hasColleges ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={colleges} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="college" width={140} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#2563EB" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={GraduationCap} title="No college data" description="College-wise placement breakdown will appear here." />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
