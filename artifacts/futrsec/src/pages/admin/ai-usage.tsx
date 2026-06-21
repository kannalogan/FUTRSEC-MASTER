import { useAdminAiUsage } from "@/lib/admin-api";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader, GridSkeleton, EmptyState } from "@/components/page-shell";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { format } from "date-fns";
import { Bot, MessagesSquare, Cpu } from "lucide-react";

function StatCard({
  icon: Icon, label, value, color,
}: {
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

export default function AdminAiUsagePage() {
  const { data, isLoading } = useAdminAiUsage();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader
        icon={Bot}
        title="AI Usage"
        subtitle="AI interactions, token consumption and model breakdown."
      />

      {isLoading || !data ? (
        <GridSkeleton cols={2} rows={1} />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <StatCard icon={MessagesSquare} label="Total Interactions" value={data.totalInteractions.toLocaleString("en-IN")} color="#2563EB" />
            <StatCard icon={Cpu} label="Total Tokens" value={data.totalTokens.toLocaleString("en-IN")} color="#A855F7" />
          </div>

          {data.byModel.length > 0 && (
            <Card className="mb-6">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold mb-4">Interactions by Model</h3>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.byModel}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="model" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" name="Interactions" fill="#2563EB" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
            Recent Interactions
          </h2>
          {data.recent.length === 0 ? (
            <EmptyState icon={Bot} title="No AI activity yet" description="AI interactions will appear here." />
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Tokens</TableHead>
                      <TableHead>When</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recent.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.user?.fullName ?? r.user?.email ?? "—"}</TableCell>
                        <TableCell>{r.model ?? "—"}</TableCell>
                        <TableCell>{r.tokens != null ? r.tokens.toLocaleString("en-IN") : "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {r.createdAt ? format(new Date(r.createdAt), "dd MMM yyyy, HH:mm") : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
