import { useMentorReports, type MentorReportRow } from "@/lib/mentor-api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader, CardSkeleton, EmptyState } from "@/components/page-shell";
import { RiskBadge } from "./students";
import { FileText, Download } from "lucide-react";

const COLUMNS: { key: keyof MentorReportRow; label: string }[] = [
  { key: "fullName", label: "Name" },
  { key: "email", label: "Email" },
  { key: "careerTrack", label: "Track" },
  { key: "learningHours", label: "Learning Hrs" },
  { key: "lessonsCompleted", label: "Lessons" },
  { key: "avgModuleProgress", label: "Progress %" },
  { key: "ftsTotal", label: "FTS" },
  { key: "labsCompleted", label: "Labs" },
  { key: "assessmentsTaken", label: "Assessments" },
  { key: "assessmentsPassed", label: "Passed" },
  { key: "assignmentsSubmitted", label: "Assignments" },
  { key: "missedTasks", label: "Missed" },
];

function toCsv(rows: MentorReportRow[]): string {
  const header = [...COLUMNS.map((c) => c.label), "Risk Level", "Risk Score"];
  const lines = rows.map((r) => [
    ...COLUMNS.map((c) => {
      const v = r[c.key];
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }),
    r.riskLevel, r.riskScore,
  ].join(","));
  return [header.join(","), ...lines].join("\n");
}

export default function MentorReportsPage() {
  const { data, isLoading } = useMentorReports();
  const rows = data?.rows ?? [];

  const download = () => {
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cohort-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-full mx-auto">
      <PageHeader
        icon={FileText}
        title="Reports"
        subtitle="Full performance breakdown for your cohort. Export to CSV."
        actions={
          <Button onClick={download} disabled={rows.length === 0}>
            <Download className="h-4 w-4 mr-1.5" /> Export CSV
          </Button>
        }
      />

      {isLoading ? (
        <CardSkeleton rows={8} />
      ) : rows.length === 0 ? (
        <EmptyState icon={FileText} title="No data to report" description="Once you have assigned students, their metrics appear here." />
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {COLUMNS.map((c) => <TableHead key={c.key} className="whitespace-nowrap">{c.label}</TableHead>)}
                  <TableHead>Risk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.studentId}>
                    <TableCell className="font-medium whitespace-nowrap">{r.fullName ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">{r.email ?? "—"}</TableCell>
                    <TableCell className="uppercase text-xs">{r.careerTrack ?? "—"}</TableCell>
                    <TableCell>{r.learningHours}</TableCell>
                    <TableCell>{r.lessonsCompleted}</TableCell>
                    <TableCell>{r.avgModuleProgress}%</TableCell>
                    <TableCell>{r.ftsTotal}</TableCell>
                    <TableCell>{r.labsCompleted}</TableCell>
                    <TableCell>{r.assessmentsTaken}</TableCell>
                    <TableCell>{r.assessmentsPassed}</TableCell>
                    <TableCell>{r.assignmentsSubmitted}</TableCell>
                    <TableCell>{r.missedTasks}</TableCell>
                    <TableCell><RiskBadge level={r.riskLevel} score={r.riskScore} /></TableCell>
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
