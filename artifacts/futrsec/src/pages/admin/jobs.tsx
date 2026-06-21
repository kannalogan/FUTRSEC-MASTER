import { useAdminJobs, TRACK_LABELS, TRACK_COLORS, type AdminJob } from "@/lib/admin-api";
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

export default function AdminJobsPage() {
  const { data, isLoading } = useAdminJobs();
  const jobs = data?.jobs ?? [];

  const handleExport = () => {
    exportToCSV<AdminJob>("admin-jobs", [
      { key: "title", label: "Title" },
      { key: "companyName", label: "Company", format: (r) => r.companyName ?? "" },
      { key: "type", label: "Type" },
      { key: "status", label: "Status" },
      { key: "location", label: "Location", format: (r) => r.location ?? "" },
      { key: "requiredTracks", label: "Required Tracks", format: (r) => (r.requiredTracks ?? []).map((t) => TRACK_LABELS[t] ?? t).join("; ") },
      { key: "createdAt", label: "Created", format: (r) => r.createdAt ? format(new Date(r.createdAt), "dd MMM yyyy") : "" },
    ], jobs);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        icon={Briefcase}
        title="Jobs"
        subtitle="All jobs and internships posted across the platform."
        actions={
          <Button size="sm" variant="outline" onClick={handleExport} disabled={jobs.length === 0}>
            <Download className="h-4 w-4 mr-1.5" /> Export CSV
          </Button>
        }
      />

      {isLoading ? (
        <CardSkeleton rows={6} />
      ) : jobs.length === 0 ? (
        <EmptyState icon={Briefcase} title="No jobs found" description="No jobs have been posted yet." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Required Tracks</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((j) => (
                  <TableRow key={j.id}>
                    <TableCell className="font-medium">{j.title}</TableCell>
                    <TableCell>{j.companyName ?? "—"}</TableCell>
                    <TableCell className="capitalize">{j.type}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">{j.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{j.location ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(j.requiredTracks ?? []).length === 0 ? (
                          <span className="text-muted-foreground text-sm">—</span>
                        ) : (
                          j.requiredTracks.map((t) => (
                            <Badge
                              key={t}
                              className="border-0"
                              style={{ backgroundColor: `${TRACK_COLORS[t] ?? "#64748B"}20`, color: TRACK_COLORS[t] ?? "#64748B" }}
                            >
                              {TRACK_LABELS[t] ?? t}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {j.createdAt ? format(new Date(j.createdAt), "dd MMM yyyy") : "—"}
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
