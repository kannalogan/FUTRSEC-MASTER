import { useMentorReports, type MentorReportRow } from "@/lib/mentor-api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader, CardSkeleton, EmptyState } from "@/components/page-shell";
import { RiskBadge } from "./students";
import { FileText, Download, Activity, Clock, BookOpen, ClipboardCheck } from "lucide-react";
import { motion } from "framer-motion";

const COLUMNS: { key: keyof MentorReportRow; label: string; icon?: any }[] = [
  { key: "fullName", label: "Identity" },
  { key: "careerTrack", label: "Track" },
  { key: "learningHours", label: "Hours", icon: Clock },
  { key: "lessonsCompleted", label: "Lessons", icon: BookOpen },
  { key: "avgModuleProgress", label: "Prog %" },
  { key: "ftsTotal", label: "FTS", icon: Activity },
  { key: "assessmentsPassed", label: "Passed", icon: ClipboardCheck },
  { key: "missedTasks", label: "Missed" },
];

function toCsv(rows: MentorReportRow[]): string {
  const header = ["Name", "Email", "Track", "Hours", "Lessons", "Progress", "FTS", "Labs", "Assessments", "Passed", "Assignments", "Missed", "Risk Level", "Risk Score"];
  const lines = rows.map((r) => [
    r.fullName, r.email, r.careerTrack, r.learningHours, r.lessonsCompleted, r.avgModuleProgress, r.ftsTotal, r.labsCompleted, r.assessmentsTaken, r.assessmentsPassed, r.assignmentsSubmitted, r.missedTasks, r.riskLevel, r.riskScore
  ].map(v => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(","));
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
    a.download = `futrsec-cohort-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 md:p-10 max-w-[1400px] mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <PageHeader
          icon={FileText}
          title="Data Exports"
          subtitle="Generate and download comprehensive performance matrix for your cohort."
          actions={
            <Button onClick={download} disabled={rows.length === 0} className="rounded-full px-6 font-semibold shadow-sm">
              <Download className="h-4 w-4 mr-2" /> Download CSV
            </Button>
          }
        />
      </motion.div>

      {isLoading ? (
        <CardSkeleton rows={10} />
      ) : rows.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <EmptyState 
            icon={FileText} 
            title="Telemetry unavailable" 
            description="Cohort telemetry data will compile here once student activity begins." 
          />
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
          <Card className="glass-card overflow-hidden border-border/60">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    {COLUMNS.map((c) => (
                      <TableHead key={c.key} className="whitespace-nowrap py-4">
                        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                          {c.icon && <c.icon className="h-3.5 w-3.5" />} {c.label}
                        </span>
                      </TableHead>
                    ))}
                    <TableHead className="text-right whitespace-nowrap">
                      <span className="text-xs font-bold uppercase tracking-wider">Risk Matrix</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={r.studentId} className="hover:bg-muted/30 transition-colors group">
                      <TableCell className="py-3">
                        <div className="font-semibold text-foreground truncate max-w-[180px]">{r.fullName ?? "—"}</div>
                        <div className="text-sm text-muted-foreground font-mono truncate max-w-[180px]">{r.email ?? "—"}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-background text-xs uppercase tracking-widest px-2 py-0.5 border-border/60">
                          {r.careerTrack ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{r.learningHours}h</TableCell>
                      <TableCell className="font-mono text-sm">{r.lessonsCompleted}</TableCell>
                      <TableCell>
                        <div className="font-mono text-sm font-semibold flex items-center gap-2">
                          {r.avgModuleProgress}%
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono font-bold px-2 py-0.5 text-primary bg-primary/10 border-0">
                          {r.ftsTotal}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{r.assessmentsPassed} / {r.assessmentsTaken}</TableCell>
                      <TableCell>
                        <span className={`font-mono text-sm font-bold ${r.missedTasks > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {r.missedTasks}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <RiskBadge level={r.riskLevel} score={r.riskScore} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
