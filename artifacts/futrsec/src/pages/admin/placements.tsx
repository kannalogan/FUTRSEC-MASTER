import { useAdminPlacements, type AdminPlacement } from "@/lib/admin-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader, CardSkeleton, EmptyState } from "@/components/page-shell";
import { exportToCSV } from "@/lib/export-utils";
import { format } from "date-fns";
import { Award, Download } from "lucide-react";

export default function AdminPlacementsPage() {
  const { data, isLoading } = useAdminPlacements();
  const placements = data?.placements ?? [];

  const handleExport = () => {
    exportToCSV<AdminPlacement>("admin-placements", [
      { key: "student", label: "Student", format: (r) => r.student?.fullName ?? "" },
      { key: "email", label: "Email", format: (r) => r.student?.email ?? "" },
      { key: "job", label: "Job", format: (r) => r.job?.title ?? "" },
      { key: "status", label: "Status" },
      { key: "salary", label: "Salary", format: (r) => (r.salary != null ? r.salary : "") },
      { key: "joiningDate", label: "Joining Date", format: (r) => r.joiningDate ? format(new Date(r.joiningDate), "dd MMM yyyy") : "" },
      { key: "createdAt", label: "Created", format: (r) => r.createdAt ? format(new Date(r.createdAt), "dd MMM yyyy") : "" },
    ], placements);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        icon={Award}
        title="Placements"
        subtitle="All student placements recorded across the platform."
        actions={
          <Button size="sm" variant="outline" onClick={handleExport} disabled={placements.length === 0}>
            <Download className="h-4 w-4 mr-1.5" /> Export CSV
          </Button>
        }
      />

      {isLoading ? (
        <CardSkeleton rows={6} />
      ) : placements.length === 0 ? (
        <EmptyState icon={Award} title="No placements found" description="No placements have been recorded yet." />
      ) : (
        <Card>
          <CardContent className="p-0">
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
                {placements.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.student?.fullName ?? p.student?.email ?? "—"}</TableCell>
                    <TableCell>{p.job?.title ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">{p.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {p.salary != null ? `₹${p.salary.toLocaleString("en-IN")}` : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {p.joiningDate ? format(new Date(p.joiningDate), "dd MMM yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {p.createdAt ? format(new Date(p.createdAt), "dd MMM yyyy") : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
