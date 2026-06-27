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
import { Users, Search, Activity } from "lucide-react";
import { motion } from "framer-motion";

const RISK_STYLE: Record<string, string> = {
  high: "bg-danger/10 text-danger border border-danger/30",
  medium: "bg-warning/10 text-warning border border-warning/30",
  low: "bg-success/10 text-success border border-success/30",
};

export function RiskBadge({ level, score }: { level: string; score?: number }) {
  return (
    <Badge variant="outline" className={`${RISK_STYLE[level] ?? RISK_STYLE.low} px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wide text-xs`}>
      {level}{typeof score === "number" ? ` · ${score}` : ""}
    </Badge>
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
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <PageHeader 
          icon={Users} 
          title="Assigned Students" 
          subtitle="Monitor live progress, engagement, and risk factors for your cohort." 
        />
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
        className="flex items-center justify-between"
      >
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            placeholder="Search students by name or email..." 
            className="pl-10 h-12 bg-card border-border/60 shadow-sm text-base rounded-xl focus-visible:ring-primary" 
          />
        </div>
      </motion.div>

      {isLoading ? (
        <CardSkeleton rows={8} />
      ) : students.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <EmptyState icon={Users} title="No students found" description={search ? "Try adjusting your search query." : "An admin assigns students to your cohort."} />
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
          <Card className="glass-card overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="py-4">Student Details</TableHead>
                  <TableHead>Career Track</TableHead>
                  <TableHead>Module Progress</TableHead>
                  <TableHead className="text-right">FTS Score</TableHead>
                  <TableHead className="text-right">Risk Level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s, idx) => (
                  <TableRow key={s.id} className="hover:bg-muted/30 transition-colors group">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-violet/20 flex items-center justify-center ring-1 ring-border shrink-0">
                          <span className="font-bold text-sm text-foreground">
                            {s.fullName?.[0]?.toUpperCase() ?? s.email?.[0]?.toUpperCase() ?? "U"}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-foreground flex items-center gap-2 text-base">
                            {s.fullName ?? "—"}
                            {s.isTrial && <Badge variant="secondary" className="text-xs uppercase tracking-wide">Trial</Badge>}
                          </div>
                          <div className="text-sm text-muted-foreground mt-0.5">{s.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {s.careerTrack ? (
                        <Badge variant="outline" style={{ borderColor: `${TRACK_COLORS[s.careerTrack]}50`, color: TRACK_COLORS[s.careerTrack], backgroundColor: `${TRACK_COLORS[s.careerTrack]}10` }} className="text-xs py-1 px-2.5">
                          {TRACK_LABELS[s.careerTrack] ?? s.careerTrack}
                        </Badge>
                      ) : <span className="text-muted-foreground text-sm">—</span>}
                    </TableCell>
                    <TableCell className="w-48">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{s.lessonsCompleted} lessons</span>
                          <span className="font-medium text-foreground">{s.avgModuleProgress}%</span>
                        </div>
                        <Progress value={s.avgModuleProgress} className="h-1.5" />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5 font-mono text-base font-semibold text-foreground">
                        <Activity className="h-4 w-4 text-primary" /> {s.ftsTotal}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <RiskBadge level={s.riskLevel} score={s.riskScore} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
