import { useState, useMemo } from "react";
import { useMentorStudents, TRACK_LABELS, TRACK_COLORS, type MentorStudent } from "@/lib/mentor-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader, CardSkeleton, EmptyState } from "@/components/page-shell";
import { Users, Search } from "lucide-react";

const RISK_STYLE: Record<string, string> = {
  high: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  low: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
};

export function RiskBadge({ level, score }: { level: string; score?: number }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${RISK_STYLE[level] ?? RISK_STYLE.low}`}>
      {level}{typeof score === "number" ? ` · ${score}` : ""}
    </span>
  );
}

export default function MentorStudentsPage() {
  const { data, isLoading } = useMentorStudents();
  const [search, setSearch] = useState("");

  const students = useMemo(() => {
    const list = data?.students ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((s: MentorStudent) =>
      (s.fullName ?? "").toLowerCase().includes(q) || (s.email ?? "").toLowerCase().includes(q)
    );
  }, [data, search]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader icon={Users} title="Assigned Students" subtitle="Students assigned to you, with live progress and risk." />

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter by name or email" className="pl-9" />
      </div>

      {isLoading ? (
        <CardSkeleton rows={6} />
      ) : students.length === 0 ? (
        <EmptyState icon={Users} title="No students assigned" description="An admin assigns students to your cohort." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Track</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Lessons</TableHead>
                  <TableHead>FTS</TableHead>
                  <TableHead>Risk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="font-medium flex items-center gap-2">
                        {s.fullName ?? "—"}
                        {s.isTrial && <Badge variant="outline" className="text-[10px]">Trial</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground">{s.email}</div>
                    </TableCell>
                    <TableCell>
                      {s.careerTrack ? (
                        <Badge style={{ backgroundColor: `${TRACK_COLORS[s.careerTrack]}20`, color: TRACK_COLORS[s.careerTrack] }} className="border-0">
                          {TRACK_LABELS[s.careerTrack] ?? s.careerTrack}
                        </Badge>
                      ) : <span className="text-muted-foreground text-sm">—</span>}
                    </TableCell>
                    <TableCell className="w-40">
                      <div className="flex items-center gap-2">
                        <Progress value={s.avgModuleProgress} className="h-2" />
                        <span className="text-xs text-muted-foreground w-9">{s.avgModuleProgress}%</span>
                      </div>
                    </TableCell>
                    <TableCell>{s.lessonsCompleted}</TableCell>
                    <TableCell>{s.ftsTotal}</TableCell>
                    <TableCell><RiskBadge level={s.riskLevel} score={s.riskScore} /></TableCell>
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
