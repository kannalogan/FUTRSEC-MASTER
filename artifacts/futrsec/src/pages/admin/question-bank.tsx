import { useState } from "react";
import {
  useAdminQuestions, useAdminPending, useAdminQBAnalytics, useApproveQuestion, useRejectQuestion, useAdminDeleteQuestion,
  QB_TRACK_LABELS, QB_TRACKS, QB_TYPES, QB_TYPE_LABELS, QB_DIFFICULTIES, QB_STATUSES,
  type QBQuestion, type QBFilters,
} from "@/lib/question-bank-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader, CardSkeleton, EmptyState } from "@/components/page-shell";
import { useToast } from "@/hooks/use-toast";
import { downloadFile } from "@/lib/api";
import {
  Library, Search, CheckCircle2, XCircle, Clock, Download, Eye, Trash2, Check, ShieldCheck, Inbox,
} from "lucide-react";

const STATUS_META: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
  archived: "bg-muted/50 text-muted-foreground/70 border-border/50",
};
const DIFF_COLOR: Record<string, string> = {
  beginner: "text-emerald-600", intermediate: "text-blue-600", advanced: "text-amber-600", expert: "text-destructive",
};

function QuestionPreview({ q }: { q: QBQuestion }) {
  return (
    <div className="space-y-3">
      <p className="text-base font-medium text-foreground">{q.questionText}</p>
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="secondary">{QB_TRACK_LABELS[q.careerTrack] ?? q.careerTrack}</Badge>
        <Badge variant="outline">{QB_TYPE_LABELS[q.questionType]}</Badge>
        <Badge variant="outline" className={`capitalize ${DIFF_COLOR[q.difficulty]}`}>{q.difficulty}</Badge>
        <Badge variant="outline">{q.marks} marks</Badge>
      </div>
      {q.options.length > 0 && (
        <ul className="space-y-1.5">
          {q.options.map((o, i) => (
            <li key={i} className={`text-sm flex items-center gap-2 rounded-lg border p-2.5 ${o.isCorrect ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium" : "border-border"}`}>
              {o.isCorrect ? <Check className="h-4 w-4 shrink-0" /> : <span className="w-4 shrink-0 text-xs font-semibold text-muted-foreground">{String.fromCharCode(65 + i)}</span>}
              {o.optionText}
            </li>
          ))}
        </ul>
      )}
      {q.explanation && <div className="rounded-lg bg-muted/40 border border-border/50 p-3"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Explanation</p><p className="text-sm text-foreground/90">{q.explanation}</p></div>}
      {q.skills.length > 0 && <div className="flex flex-wrap gap-1.5">{q.skills.map((s) => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}</div>}
    </div>
  );
}

export default function AdminQuestionBankPage() {
  const { toast } = useToast();
  const { data: analytics } = useAdminQBAnalytics();
  const { data: pendingData, isLoading: pendingLoading } = useAdminPending();
  const [filters, setFilters] = useState<QBFilters>({ page: 1, pageSize: 20 });
  const [search, setSearch] = useState("");
  const { data: libData, isLoading: libLoading } = useAdminQuestions({ ...filters, q: search || undefined });

  const approveMut = useApproveQuestion();
  const rejectMut = useRejectQuestion();
  const deleteMut = useAdminDeleteQuestion();

  const [preview, setPreview] = useState<QBQuestion | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const pending = pendingData?.items ?? [];
  const lib = libData?.items ?? [];
  const setF = (patch: Partial<QBFilters>) => setFilters((f) => ({ ...f, ...patch, page: 1 }));

  const doApprove = (id: number) => approveMut.mutate({ id }, {
    onSuccess: () => toast({ title: "Question approved" }),
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });
  const confirmReject = () => {
    if (rejectId === null) return;
    if (!rejectReason.trim()) { toast({ title: "Provide a reason", variant: "destructive" }); return; }
    rejectMut.mutate({ id: rejectId, reason: rejectReason.trim() }, {
      onSuccess: () => { toast({ title: "Question sent back" }); setRejectId(null); setRejectReason(""); },
      onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
    });
  };

  const doExport = () => downloadFile("/api/admin/question-bank/export.csv", "question-bank.csv").catch((e: Error) => toast({ title: e.message, variant: "destructive" }));

  return (
    <div>
      <PageHeader
        title="Question Bank Governance"
        subtitle="Review mentor submissions and manage the global question library."
        icon={ShieldCheck}
        actions={<Button variant="outline" className="gap-1.5 font-semibold bg-background" onClick={doExport}><Download className="h-4 w-4" /> Export CSV</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="glass-card"><CardContent className="p-5 flex items-center gap-4"><div className="h-11 w-11 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center"><Clock className="h-5 w-5" /></div><div><p className="text-2xl font-bold leading-none">{analytics?.pending ?? 0}</p><p className="text-sm text-muted-foreground mt-1">Pending review</p></div></CardContent></Card>
        <Card className="glass-card"><CardContent className="p-5 flex items-center gap-4"><div className="h-11 w-11 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center"><CheckCircle2 className="h-5 w-5" /></div><div><p className="text-2xl font-bold leading-none">{analytics?.byStatus?.approved ?? 0}</p><p className="text-sm text-muted-foreground mt-1">Approved</p></div></CardContent></Card>
        <Card className="glass-card"><CardContent className="p-5 flex items-center gap-4"><div className="h-11 w-11 rounded-xl bg-destructive/15 text-destructive flex items-center justify-center"><XCircle className="h-5 w-5" /></div><div><p className="text-2xl font-bold leading-none">{analytics?.byStatus?.rejected ?? 0}</p><p className="text-sm text-muted-foreground mt-1">Rejected</p></div></CardContent></Card>
        <Card className="glass-card"><CardContent className="p-5 flex items-center gap-4"><div className="h-11 w-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center"><Library className="h-5 w-5" /></div><div><p className="text-2xl font-bold leading-none">{analytics?.total ?? 0}</p><p className="text-sm text-muted-foreground mt-1">Total library</p></div></CardContent></Card>
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="mb-5">
          <TabsTrigger value="pending" className="gap-1.5"><Inbox className="h-4 w-4" /> Approval Queue {pending.length > 0 && <Badge variant="secondary" className="ml-1 text-xs">{pending.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="library" className="gap-1.5"><Library className="h-4 w-4" /> Global Library</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {pendingLoading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} rows={2} />)}</div>
          ) : pending.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Inbox zero" description="No questions are waiting for review right now." />
          ) : (
            <div className="space-y-3">
              {pending.map((q) => (
                <Card key={q.id} className="glass-card">
                  <CardContent className="p-5 flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground line-clamp-2">{q.questionText}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <Badge variant="secondary" className="text-xs">{QB_TRACK_LABELS[q.careerTrack] ?? q.careerTrack}</Badge>
                        <Badge variant="outline" className="text-xs">{QB_TYPE_LABELS[q.questionType]}</Badge>
                        <Badge variant="outline" className={`text-xs capitalize ${DIFF_COLOR[q.difficulty]}`}>{q.difficulty}</Badge>
                        <Badge variant="outline" className="text-xs">Mentor #{q.createdBy}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setPreview(q)}><Eye className="h-4 w-4" /> View</Button>
                      <Button variant="outline" size="sm" className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => { setRejectId(q.id); setRejectReason(""); }}><XCircle className="h-4 w-4" /> Reject</Button>
                      <Button size="sm" className="gap-1.5" onClick={() => doApprove(q.id)} disabled={approveMut.isPending}><CheckCircle2 className="h-4 w-4" /> Approve</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="library">
          <Card className="glass-card mb-5">
            <CardContent className="p-4 flex flex-wrap items-center gap-2.5">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="pl-9 h-10" />
              </div>
              <Select value={filters.track ?? "all"} onValueChange={(v) => setF({ track: v })}><SelectTrigger className="h-10 w-[140px]"><SelectValue placeholder="Track" /></SelectTrigger><SelectContent><SelectItem value="all">All tracks</SelectItem>{QB_TRACKS.map((t) => <SelectItem key={t} value={t}>{QB_TRACK_LABELS[t]}</SelectItem>)}</SelectContent></Select>
              <Select value={filters.type ?? "all"} onValueChange={(v) => setF({ type: v })}><SelectTrigger className="h-10 w-[140px]"><SelectValue placeholder="Type" /></SelectTrigger><SelectContent><SelectItem value="all">All types</SelectItem>{QB_TYPES.map((t) => <SelectItem key={t} value={t}>{QB_TYPE_LABELS[t]}</SelectItem>)}</SelectContent></Select>
              <Select value={filters.difficulty ?? "all"} onValueChange={(v) => setF({ difficulty: v })}><SelectTrigger className="h-10 w-[130px]"><SelectValue placeholder="Difficulty" /></SelectTrigger><SelectContent><SelectItem value="all">All levels</SelectItem>{QB_DIFFICULTIES.map((d) => <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>)}</SelectContent></Select>
              <Select value={filters.status ?? "all"} onValueChange={(v) => setF({ status: v })}><SelectTrigger className="h-10 w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{QB_STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent></Select>
            </CardContent>
          </Card>

          {libLoading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} rows={2} />)}</div>
          ) : lib.length === 0 ? (
            <EmptyState icon={Library} title="No questions found" description="Try adjusting your filters." />
          ) : (
            <Card className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="min-w-[320px]">Question</TableHead>
                      <TableHead>Track</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Difficulty</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-24 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lib.map((q) => (
                      <TableRow key={q.id} className="group">
                        <TableCell className="max-w-md"><p className="font-medium text-sm line-clamp-2">{q.questionText}</p>{q.topic && <p className="text-xs text-muted-foreground mt-0.5">{q.topic}</p>}</TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs">{QB_TRACK_LABELS[q.careerTrack] ?? q.careerTrack}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{QB_TYPE_LABELS[q.questionType]}</TableCell>
                        <TableCell className={`text-sm font-medium capitalize ${DIFF_COLOR[q.difficulty]}`}>{q.difficulty}</TableCell>
                        <TableCell><Badge className={`text-xs capitalize ${STATUS_META[q.status]}`}>{q.status}</Badge></TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreview(q)}><Eye className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(q.id)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Preview dialog */}
      <Dialog open={preview !== null} onOpenChange={(v) => { if (!v) setPreview(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle className="text-lg font-heading">Question Preview</DialogTitle><DialogDescription className="text-sm">Full details as the learner would see them.</DialogDescription></DialogHeader>
          {preview && <QuestionPreview q={preview} />}
          {preview?.status === "pending" && (
            <DialogFooter className="mt-2">
              <Button variant="outline" className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => { setRejectId(preview.id); setRejectReason(""); setPreview(null); }}><XCircle className="h-4 w-4" /> Reject</Button>
              <Button className="gap-1.5" onClick={() => { doApprove(preview.id); setPreview(null); }}><CheckCircle2 className="h-4 w-4" /> Approve</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={rejectId !== null} onOpenChange={(v) => { if (!v) { setRejectId(null); setRejectReason(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-lg font-heading">Reject question</DialogTitle><DialogDescription className="text-sm">The mentor sees this reason and can revise and resubmit.</DialogDescription></DialogHeader>
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={4} placeholder="What needs to change?" className="resize-none" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setRejectId(null); setRejectReason(""); }}>Cancel</Button>
            <Button className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={confirmReject} disabled={rejectMut.isPending}>Send back</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent className="glass-card border-destructive/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive"><Trash2 className="h-5 w-5" /> Delete question</AlertDialogTitle>
            <AlertDialogDescription className="text-base text-foreground/80">This permanently removes the question from the global library. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="font-semibold">Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold px-6" onClick={() => {
              if (deleteId !== null) deleteMut.mutate(deleteId, { onSuccess: () => toast({ title: "Question deleted" }), onError: (e: Error) => toast({ title: e.message, variant: "destructive" }) });
              setDeleteId(null);
            }}>Confirm Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
