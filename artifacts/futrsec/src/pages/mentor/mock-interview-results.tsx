import { useState } from "react";
import { Link, useRoute } from "wouter";
import {
  useMIResults, MI_TRACK_LABELS, MI_TYPE_LABELS,
  type MIResultRow,
} from "@/lib/mock-interview-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { PageHeader, CardSkeleton, EmptyState } from "@/components/page-shell";
import {
  ArrowLeft, Mic2, Users, CheckCircle2, Clock, Target, Eye, FileText,
} from "lucide-react";

const STATUS_BADGE: Record<string, string> = {
  assigned: "bg-muted text-muted-foreground border-border",
  in_progress: "bg-info/10 text-info border border-info/30",
  completed: "bg-success/10 text-success border border-success/30",
  expired: "bg-destructive/15 text-destructive border-destructive/30",
};

function scoreColor(s: number) {
  return s >= 70 ? "#10B981" : s >= 50 ? "#F97316" : "#EF4444";
}

export default function MentorMockInterviewResultsPage() {
  const [, params] = useRoute("/mentor/mock-interviews/:id");
  const id = params ? Number(params.id) : null;
  const validId = id !== null && Number.isInteger(id) ? id : null;
  const { data, isLoading } = useMIResults(validId);
  const [viewing, setViewing] = useState<MIResultRow | null>(null);

  if (isLoading) {
    return <div className="p-5 lg:p-8 max-w-6xl mx-auto space-y-4"><CardSkeleton rows={2} /><CardSkeleton rows={6} /></div>;
  }
  if (!data) {
    return (
      <div className="p-5 lg:p-8 max-w-6xl mx-auto">
        <EmptyState icon={Mic2} title="Template not found" description="This mock interview template does not exist or is not yours."
          action={<Button asChild variant="outline"><Link href="/mentor/mock-interviews"><ArrowLeft className="h-4 w-4 mr-1.5" />Back</Link></Button>} />
      </div>
    );
  }

  const t = data.template;
  const rows = data.results;
  const completed = rows.filter((r) => r.status === "completed");
  const inProgress = rows.filter((r) => r.status === "in_progress").length;
  const avg = completed.length
    ? Math.round(completed.reduce((s, r) => s + (r.score ?? 0), 0) / completed.length)
    : null;

  return (
    <div className="p-5 lg:p-8 max-w-6xl mx-auto">
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2 text-muted-foreground">
        <Link href="/mentor/mock-interviews"><ArrowLeft className="h-4 w-4 mr-1.5" />All templates</Link>
      </Button>

      <PageHeader
        icon={Mic2}
        title={t.title}
        subtitle={`${MI_TRACK_LABELS[t.careerTrack] ?? t.careerTrack} · ${MI_TYPE_LABELS[t.interviewType] ?? t.interviewType} · ${t.difficulty} · ${t.totalQuestions} questions`}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        <Card className="glass-card"><CardContent className="p-5 flex items-center gap-4">
          <div className="h-11 w-11 rounded-xl bg-info/15 text-info flex items-center justify-center"><Users className="h-5 w-5" /></div>
          <div><p className="text-2xl font-bold leading-none">{rows.length}</p><p className="text-sm text-muted-foreground mt-1">Assigned</p></div>
        </CardContent></Card>
        <Card className="glass-card"><CardContent className="p-5 flex items-center gap-4">
          <div className="h-11 w-11 rounded-xl bg-success/15 text-success flex items-center justify-center"><CheckCircle2 className="h-5 w-5" /></div>
          <div><p className="text-2xl font-bold leading-none">{completed.length}</p><p className="text-sm text-muted-foreground mt-1">Completed</p></div>
        </CardContent></Card>
        <Card className="glass-card"><CardContent className="p-5 flex items-center gap-4">
          <div className="h-11 w-11 rounded-xl bg-warning/15 text-warning flex items-center justify-center"><Clock className="h-5 w-5" /></div>
          <div><p className="text-2xl font-bold leading-none">{inProgress}</p><p className="text-sm text-muted-foreground mt-1">In progress</p></div>
        </CardContent></Card>
        <Card className="glass-card"><CardContent className="p-5 flex items-center gap-4">
          <div className="h-11 w-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center"><Target className="h-5 w-5" /></div>
          <div><p className="text-2xl font-bold leading-none">{avg != null ? `${avg}` : "—"}</p><p className="text-sm text-muted-foreground mt-1">Avg score</p></div>
        </CardContent></Card>
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Student results</CardTitle></CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <EmptyState icon={Users} title="No assignments yet" description="Assign this template to your students to start collecting results." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead className="text-right">Transcript</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.assignmentId}>
                    <TableCell>
                      <p className="font-medium text-foreground">{r.studentName ?? "Unnamed"}</p>
                      <p className="text-xs text-muted-foreground">{r.studentEmail}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`capitalize ${STATUS_BADGE[r.status] ?? ""}`}>{r.status.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell>
                      {r.score != null ? (
                        <span className="font-semibold" style={{ color: scoreColor(r.score) }}>{r.score}/100</span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.completedAt ? new Date(r.completedAt).toLocaleDateString("en-IN") : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.status === "completed" && r.evaluation ? (
                        <Button variant="outline" size="sm" onClick={() => setViewing(r)}><Eye className="h-3.5 w-3.5 mr-1.5" />View</Button>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <TranscriptDialog row={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}

function TranscriptDialog({ row, onClose }: { row: MIResultRow | null; onClose: () => void }) {
  if (!row || !row.evaluation) return null;
  const e = row.evaluation;
  const questions = row.transcript?.questions ?? [];
  const answers = row.transcript?.answers ?? [];

  return (
    <Dialog open={!!row} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileText className="h-4 w-4" />{row.studentName ?? "Student"} — Transcript</DialogTitle>
          <DialogDescription>Overall score {e.overall}/100</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-3">
            {Object.entries(e.scores).map(([k, v]) => (
              <div key={k}>
                <div className="flex justify-between text-xs mb-1"><span className="capitalize font-medium">{k}</span><span className="text-muted-foreground">{v}/100</span></div>
                <Progress value={v} className="h-1.5" />
              </div>
            ))}
          </div>

          {e.strengths.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-1.5 text-success">Strengths</p>
              <ul className="text-sm space-y-1 text-foreground/90">{e.strengths.map((s, i) => <li key={i} className="flex gap-2"><span className="text-success">•</span>{s}</li>)}</ul>
            </div>
          )}
          {e.weaknesses.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-1.5 text-warning">Areas to improve</p>
              <ul className="text-sm space-y-1 text-foreground/90">{e.weaknesses.map((s, i) => <li key={i} className="flex gap-2"><span className="text-warning">•</span>{s}</li>)}</ul>
            </div>
          )}
          {e.recommendations.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-1.5 text-info">Recommendations</p>
              <ul className="text-sm space-y-1 text-foreground/90">{e.recommendations.map((s, i) => <li key={i} className="flex gap-2"><span className="text-info">•</span>{s}</li>)}</ul>
            </div>
          )}

          <div>
            <p className="text-sm font-semibold mb-2">Question by question</p>
            <div className="space-y-3">
              {e.perQuestion.map((q, i) => (
                <div key={i} className="border-b border-border/40 pb-3 last:border-0">
                  <div className="flex justify-between gap-2">
                    <p className="text-sm font-medium">Q{i + 1}. {q.question}</p>
                    <Badge variant="outline" className="text-[10px] shrink-0">{q.score}/100</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 italic">"{q.answer || answers[i] || "(no answer)"}"</p>
                  <p className="text-xs text-foreground/80 mt-1">{q.feedback}</p>
                </div>
              ))}
              {e.perQuestion.length === 0 && questions.map((q, i) => (
                <div key={i} className="border-b border-border/40 pb-3 last:border-0">
                  <p className="text-sm font-medium">Q{i + 1}. {q.question}</p>
                  <p className="text-xs text-muted-foreground mt-1 italic">"{answers[i] || "(no answer)"}"</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
