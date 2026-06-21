import { useTpoAnalytics, TRACK_LABELS, TRACK_COLORS } from "@/lib/tpo-api";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, GridSkeleton, EmptyState } from "@/components/page-shell";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { BarChart3, Gauge } from "lucide-react";

export default function TpoAnalytics() {
  const { data, isLoading } = useTpoAnalytics();

  if (isLoading || !data) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <PageHeader icon={BarChart3} title="Analytics" subtitle="Track distribution and future-talent-score insights." />
        <GridSkeleton cols={2} rows={1} />
      </div>
    );
  }

  const pieData = data.trackDistribution.map((d) => ({
    name: TRACK_LABELS[d.track] ?? d.track,
    value: d.count,
    color: TRACK_COLORS[d.track] ?? "#64748B",
  }));
  const hasTracks = pieData.some((d) => d.value > 0);
  const hasBuckets = data.ftsBuckets.some((b) => b.count > 0);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader icon={BarChart3} title="Analytics" subtitle="Track distribution and future-talent-score insights." />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "#F9731618" }}>
              <Gauge className="h-5 w-5" style={{ color: "#F97316" }} />
            </div>
            <div>
              <div className="text-2xl font-bold font-heading text-foreground leading-none">{data.avgFts}</div>
              <div className="text-xs text-muted-foreground mt-1">Average FTS</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4">Track Distribution</h3>
            {hasTracks ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {pieData.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={BarChart3} title="No track data" description="No students assigned to tracks yet." />
            )}
            <div className="flex flex-wrap gap-3 mt-3 justify-center">
              {pieData.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-muted-foreground">{d.name}</span>
                  <span className="font-medium">{d.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4">FTS Distribution</h3>
            {hasBuckets ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.ftsBuckets}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#2563EB" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={BarChart3} title="No FTS data" description="FTS scores will appear here once available." />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
