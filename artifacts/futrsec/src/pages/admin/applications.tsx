import { useAdminApplications, type AdminApplication } from "@/lib/admin-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader, CardSkeleton, EmptyState } from "@/components/page-shell";
import { exportToCSV } from "@/lib/export-utils";
import { format } from "date-fns";
import { FileText, Download } from "lucide-react";

export default function AdminApplicationsPage() {
  const { data, isLoading } = useAdminApplications();
  const applications = data?.applications ?? [];

  const handleExport = () => {
    exportToCSV<AdminApplication>("admin-applications", [
      { key: "student", label: "Student", format: (r) => r.student?.fullName ?? "" },
      { key: "email", label: "Email", format: (r) => r.student?.email ?? "" },
      { key: "job", label: "Job", format: (r) => r.job?.title ?? "" },
      { key: "status", label: "Status" },
      { key: "appliedAt", label: "Applied", format: (r) => r.appliedAt ? format(new Date(r.appliedAt), "dd MMM yyyy") : "" },
    ], applications);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        icon={FileText}
        title="Applications"
        subtitle="All job applications submitted by students."
        actions={
          <Button size="sm" variant="outline" onClick={handleExport} disabled={applications.length === 0}>
            <Download className="h-4 w-4 mr-1.5" /> Export CSV
          </Button>
        }
      />

      {isLoading ? (
        <CardSkeleton rows={6} />
      ) : applications.length === 0 ? (
        <EmptyState icon={FileText} title="No applications found" description="No applications have been submitted yet." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applied</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.student?.fullName ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{a.student?.email ?? "—"}</TableCell>
                    <TableCell>{a.job?.title ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">{a.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {a.appliedAt ? format(new Date(a.appliedAt), "dd MMM yyyy") : "—"}
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
