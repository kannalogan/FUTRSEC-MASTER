import { useTpoTrackReports, TRACK_LABELS, type TpoTrackReport } from "@/lib/tpo-api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader, CardSkeleton, EmptyState } from "@/components/page-shell";
import { exportToCSV, exportToPDF, type ExportColumn } from "@/lib/export-utils";
import { ClipboardList, Download, FileText } from "lucide-react";

const COLUMNS: ExportColumn<TpoTrackReport>[] = [
  { key: "track", label: "Track", format: (r) => TRACK_LABELS[r.track] ?? r.track },
  { key: "students", label: "Students" },
  { key: "applications", label: "Applications" },
  { key: "offers", label: "Offers" },
  { key: "placed", label: "Placed" },
  { key: "avgFts", label: "Avg FTS" },
];

export default function TpoReports() {
  const { data, isLoading } = useTpoTrackReports();
  const rows = data?.rows ?? [];

  const exportCsv = () =>
    exportToCSV(`track-reports-${new Date().toISOString().slice(0, 10)}`, COLUMNS, rows);
  const exportPdf = () =>
    exportToPDF("Track Reports", COLUMNS, rows);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        icon={ClipboardList}
        title="Track Reports"
        subtitle="Per-track breakdown of students, applications and placements."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
              <Download className="h-4 w-4 mr-1.5" /> Export CSV
            </Button>
            <Button onClick={exportPdf} disabled={rows.length === 0}>
              <FileText className="h-4 w-4 mr-1.5" /> Export PDF
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <CardSkeleton rows={5} />
      ) : rows.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No report data" description="Track metrics will appear here once available." />
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Track</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Applications</TableHead>
                  <TableHead>Offers</TableHead>
                  <TableHead>Placed</TableHead>
                  <TableHead>Avg FTS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.track}>
                    <TableCell className="font-medium">{TRACK_LABELS[r.track] ?? r.track}</TableCell>
                    <TableCell>{r.students}</TableCell>
                    <TableCell>{r.applications}</TableCell>
                    <TableCell>{r.offers}</TableCell>
                    <TableCell>{r.placed}</TableCell>
                    <TableCell>{r.avgFts}</TableCell>
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
