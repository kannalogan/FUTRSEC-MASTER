import { useTpoPlacements, type TpoPlacements } from "@/lib/tpo-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader, CardSkeleton, EmptyState } from "@/components/page-shell";
import { exportToCSV } from "@/lib/export-utils";
import { format } from "date-fns";
import { Briefcase, Download } from "lucide-react";

type Offer = TpoPlacements["offers"][number];

const FUNNEL_STAGES: { key: keyof TpoPlacements["funnel"]; label: string; color: string }[] = [
  { key: "applied", label: "Applied", color: "#2563EB" },
  { key: "shortlisted", label: "Shortlisted", color: "#8B5CF6" },
  { key: "interviewed", label: "Interviewed", color: "#0EA5E9" },
  { key: "offered", label: "Offered", color: "#F97316" },
  { key: "placed", label: "Placed", color: "#10B981" },
];

const STATUS_VARIANTS: Record<string, "secondary" | "outline" | "destructive"> = {
  accepted: "secondary",
  pending: "outline",
  rejected: "destructive",
};

function fmtDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "—" : format(d, "dd MMM yyyy");
}

export default function TpoPlacements() {
  const { data, isLoading } = useTpoPlacements();
  const offers = data?.offers ?? [];

  const exportCsv = () => {
    exportToCSV<Offer>(
      `placements-${new Date().toISOString().slice(0, 10)}`,
      [
        { key: "student", label: "Student", format: (o) => o.student?.fullName ?? o.student?.email ?? "" },
        { key: "email", label: "Email", format: (o) => o.student?.email ?? "" },
        { key: "job", label: "Job", format: (o) => o.job?.title ?? "" },
        { key: "status", label: "Status" },
        { key: "salary", label: "Salary", format: (o) => o.salary ?? "" },
        { key: "joiningDate", label: "Joining Date", format: (o) => (o.joiningDate ? fmtDate(o.joiningDate) : "") },
        { key: "createdAt", label: "Created At", format: (o) => fmtDate(o.createdAt) },
      ],
      offers,
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        icon={Briefcase}
        title="Placements"
        subtitle="Placement funnel and offer pipeline across your students."
        actions={
          <Button onClick={exportCsv} disabled={offers.length === 0}>
            <Download className="h-4 w-4 mr-1.5" /> Export CSV
          </Button>
        }
      />

      {isLoading || !data ? (
        <CardSkeleton rows={6} />
      ) : (
        <>
          <Card className="mb-6">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold mb-4">Placement Funnel</h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {FUNNEL_STAGES.map((stage) => (
                  <div key={stage.key} className="rounded-lg border border-border/60 p-4">
                    <div className="text-2xl font-bold font-heading leading-none" style={{ color: stage.color }}>
                      {data.funnel[stage.key]}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1.5">{stage.label}</div>
                    <div className="h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${data.funnel.applied ? (data.funnel[stage.key] / data.funnel.applied) * 100 : 0}%`,
                          backgroundColor: stage.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {offers.length === 0 ? (
            <EmptyState icon={Briefcase} title="No offers yet" description="Offers extended to your students will appear here." />
          ) : (
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Job</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Salary</TableHead>
                      <TableHead>Joining Date</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {offers.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="font-medium whitespace-nowrap">
                          {o.student?.fullName ?? o.student?.email ?? "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{o.job?.title ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANTS[o.status] ?? "outline"} className="capitalize">
                            {o.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{o.salary != null ? `₹${o.salary.toLocaleString("en-IN")}` : "—"}</TableCell>
                        <TableCell className="whitespace-nowrap">{fmtDate(o.joiningDate)}</TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{fmtDate(o.createdAt)}</TableCell>
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
