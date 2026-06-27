import { useState } from "react";
import {
  useMentorQuestions, useMentorQBAnalytics, useDeleteQuestion, useSubmitQuestion, useDuplicateQuestion,
  QB_TRACK_LABELS, QB_TYPES, QB_TYPE_LABELS, QB_DIFFICULTIES, QB_STATUSES,
  type QBQuestion, type QBFilters,
} from "@/lib/question-bank-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader, CardSkeleton, EmptyState } from "@/components/page-shell";
import { useToast } from "@/hooks/use-toast";
import { downloadFile } from "@/lib/api";
import { QuestionEditorDialog } from "@/components/question-bank/question-editor-dialog";
import { AIGenerateDialog } from "@/components/question-bank/ai-generate-dialog";
import { PaperBuilderDialog } from "@/components/question-bank/paper-builder-dialog";
import {
  Library, Plus, Wand2, FileStack, Search, MoreHorizontal, Pencil, Trash2, Send, Copy,
  LayoutGrid, List, Download, Database, CheckCircle2, Clock, FileEdit, XCircle, TrendingUp,
} from "lucide-react";
import { motion } from "framer-motion";

const STATUS_META: Record<string, { label: string; className: string; icon: React.ComponentType<{ className?: string }> }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground border-border", icon: FileEdit },
  pending: { label: "Pending", className: "bg-warning/10 text-warning border-warning/30", icon: Clock },
  approved: { label: "Approved", className: "bg-success/10 text-success border-success/30", icon: CheckCircle2 },
  rejected: { label: "Rejected", className: "bg-destructive/15 text-destructive border-destructive/30", icon: XCircle },
  archived: { label: "Archived", className: "bg-muted/50 text-muted-foreground/70 border-border/50", icon: Database },
};
const DIFF_COLOR: Record<string, string> = {
  beginner: "text-emerald-600 dark:text-emerald-400", intermediate: "text-blue-600 dark:text-blue-400", advanced: "text-amber-600 dark:text-amber-400", expert: "text-destructive",
};
const KANBAN_COLS = ["draft", "pending", "approved", "rejected"] as const;

function KpiCard({ icon: Icon, label, value, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; tone: string }) {
  return (
    <Card className="glass-card overflow-hidden">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${tone}`}><Icon className="h-5 w-5" /></div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
          <p className="text-sm text-muted-foreground mt-1 truncate">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MentorQuestionBankPage() {
  const { toast } = useToast();
  const [filters, setFilters] = useState<QBFilters>({ view: "all", page: 1, pageSize: 20 });
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"table" | "kanban">("table");
  const { data, isLoading } = useMentorQuestions({ ...filters, q: search || undefined });
  const { data: analytics } = useMentorQBAnalytics();
  const deleteMut = useDeleteQuestion();
  const submitMut = useSubmitQuestion();
  const dupMut = useDuplicateQuestion();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<QBQuestion | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [paperOpen, setPaperOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const tracks = analytics?.tracks ?? [];
  const items = data?.items ?? [];
  const setF = (patch: Partial<QBFilters>) => setFilters((f) => ({ ...f, ...patch, page: 1 }));

  const openNew = () => { setEditing(null); setEditorOpen(true); };
  const openEdit = (q: QBQuestion) => { setEditing(q); setEditorOpen(true); };

  const doSubmit = (id: number) => submitMut.mutate(id, {
    onSuccess: () => toast({ title: "Submitted for approval" }),
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });
  const doDuplicate = (id: number) => dupMut.mutate(id, {
    onSuccess: () => toast({ title: "Question duplicated as draft" }),
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const doExport = () => downloadFile("/api/mentor/question-bank/export.csv", "question-bank.csv").catch((e: Error) => toast({ title: e.message, variant: "destructive" }));

  const noTracks = analytics !== undefined && tracks.length === 0;

  return (
    <div>
      <PageHeader
        title="Question Bank"
        subtitle="Author, version, and submit reusable questions scoped to your tracks."
        icon={Library}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-1.5 font-semibold bg-background hidden sm:flex" onClick={() => setPaperOpen(true)}><FileStack className="h-4 w-4" /> Build Paper</Button>
            <Button variant="outline" className="gap-1.5 font-semibold bg-background" onClick={() => setAiOpen(true)}><Wand2 className="h-4 w-4" /> AI Generate</Button>
            <Button className="gap-1.5 font-semibold" onClick={openNew}><Plus className="h-4 w-4" /> New Question</Button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard icon={Library} label="Total questions" value={analytics?.total ?? "—"} tone="bg-primary/15 text-primary" />
        <KpiCard icon={CheckCircle2} label="Approved" value={analytics?.byStatus?.approved ?? 0} tone="bg-success/10 text-success" />
        <KpiCard icon={Clock} label="Pending review" value={analytics?.byStatus?.pending ?? 0} tone="bg-warning/10 text-warning" />
        <KpiCard icon={TrendingUp} label="Total usage" value={analytics?.totalUsage ?? 0} tone="bg-info/10 text-info" />
      </div>

      {/* Filters */}
      <Card className="glass-card mb-5">
        <CardContent className="p-4 flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search questions or topics…" className="pl-9 h-10" />
          </div>
          <Select value={filters.view ?? "all"} onValueChange={(v) => setF({ view: v })}>
            <SelectTrigger className="h-10 w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All visible</SelectItem><SelectItem value="own">My questions</SelectItem><SelectItem value="shared">Shared</SelectItem></SelectContent>
          </Select>
          <Select value={filters.track ?? "all"} onValueChange={(v) => setF({ track: v })}>
            <SelectTrigger className="h-10 w-[140px]"><SelectValue placeholder="Track" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All tracks</SelectItem>{tracks.map((t) => <SelectItem key={t} value={t}>{QB_TRACK_LABELS[t] ?? t}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filters.type ?? "all"} onValueChange={(v) => setF({ type: v })}>
            <SelectTrigger className="h-10 w-[140px]"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All types</SelectItem>{QB_TYPES.map((t) => <SelectItem key={t} value={t}>{QB_TYPE_LABELS[t]}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filters.difficulty ?? "all"} onValueChange={(v) => setF({ difficulty: v })}>
            <SelectTrigger className="h-10 w-[130px]"><SelectValue placeholder="Difficulty" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All levels</SelectItem>{QB_DIFFICULTIES.map((d) => <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filters.status ?? "all"} onValueChange={(v) => setF({ status: v })}>
            <SelectTrigger className="h-10 w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All statuses</SelectItem>{QB_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>)}</SelectContent>
          </Select>
          <div className="flex items-center rounded-lg border border-border p-0.5">
            <button onClick={() => setTab("table")} className={`h-8 w-8 rounded-md flex items-center justify-center ${tab === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}><List className="h-4 w-4" /></button>
            <button onClick={() => setTab("kanban")} className={`h-8 w-8 rounded-md flex items-center justify-center ${tab === "kanban" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}><LayoutGrid className="h-4 w-4" /></button>
          </div>
          <Button variant="ghost" size="icon" className="h-10 w-10" title="Export CSV" onClick={doExport}><Download className="h-4 w-4" /></Button>
        </CardContent>
      </Card>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} rows={2} />)}</div>
      ) : noTracks ? (
        <EmptyState icon={Library} title="No tracks assigned" description="You need at least one assigned batch or track before you can author questions." />
      ) : items.length === 0 ? (
        <EmptyState icon={Library} title="No questions yet" description="Create your first question or generate a batch with AI." action={<Button onClick={openNew} className="gap-1.5"><Plus className="h-4 w-4" /> New Question</Button>} />
      ) : tab === "table" ? (
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
                  <TableHead className="text-right">Usage</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((q) => {
                  const sm = STATUS_META[q.status];
                  const canEdit = q.status === "draft" || q.status === "rejected";
                  return (
                    <TableRow key={q.id} className="group">
                      <TableCell className="max-w-md">
                        <p className="font-medium text-sm text-foreground line-clamp-2">{q.questionText}</p>
                        {q.topic && <p className="text-xs text-muted-foreground mt-0.5">{q.topic}</p>}
                      </TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs">{QB_TRACK_LABELS[q.careerTrack] ?? q.careerTrack}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{QB_TYPE_LABELS[q.questionType]}</TableCell>
                      <TableCell className={`text-sm font-medium capitalize ${DIFF_COLOR[q.difficulty]}`}>{q.difficulty}</TableCell>
                      <TableCell><Badge className={`text-xs gap-1 ${sm.className}`}><sm.icon className="h-3 w-3" />{sm.label}</Badge></TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">{q.usageCount}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 opacity-60 group-hover:opacity-100"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            {canEdit && <DropdownMenuItem onClick={() => openEdit(q)}><Pencil className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>}
                            {canEdit && <DropdownMenuItem onClick={() => doSubmit(q.id)}><Send className="h-4 w-4 mr-2" /> Submit for approval</DropdownMenuItem>}
                            <DropdownMenuItem onClick={() => doDuplicate(q.id)}><Copy className="h-4 w-4 mr-2" /> Duplicate</DropdownMenuItem>
                            {canEdit && <><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteId(q.id)}><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem></>}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {KANBAN_COLS.map((col) => {
            const colItems = items.filter((q) => q.status === col);
            const sm = STATUS_META[col];
            return (
              <div key={col} className="rounded-xl bg-muted/30 border border-border/50 p-3">
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground"><sm.icon className="h-4 w-4" /> {sm.label}</span>
                  <Badge variant="secondary" className="text-xs">{colItems.length}</Badge>
                </div>
                <div className="space-y-2">
                  {colItems.map((q) => {
                    const canEdit = q.status === "draft" || q.status === "rejected";
                    return (
                      <motion.div key={q.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                        <Card className="bg-card hover-lift cursor-pointer" onClick={() => canEdit ? openEdit(q) : undefined}>
                          <CardContent className="p-3.5">
                            <p className="text-sm font-medium text-foreground line-clamp-3">{q.questionText}</p>
                            <div className="flex flex-wrap gap-1.5 mt-2.5">
                              <Badge variant="outline" className="text-xs">{QB_TYPE_LABELS[q.questionType]}</Badge>
                              <Badge variant="outline" className={`text-xs capitalize ${DIFF_COLOR[q.difficulty]}`}>{q.difficulty}</Badge>
                            </div>
                            {q.status === "rejected" && q.rejectionReason && <p className="text-xs text-destructive mt-2 line-clamp-2">↩ {q.rejectionReason}</p>}
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                  {colItems.length === 0 && <p className="text-xs text-muted-foreground/60 text-center py-6">Empty</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <QuestionEditorDialog open={editorOpen} onOpenChange={setEditorOpen} question={editing} tracks={tracks} />
      <AIGenerateDialog open={aiOpen} onOpenChange={setAiOpen} tracks={tracks} />
      <PaperBuilderDialog open={paperOpen} onOpenChange={setPaperOpen} tracks={tracks} />

      <AlertDialog open={deleteId !== null} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent className="glass-card border-destructive/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive"><Trash2 className="h-5 w-5" /> Delete question</AlertDialogTitle>
            <AlertDialogDescription className="text-base text-foreground/80">This permanently removes the question and its version history. This cannot be undone.</AlertDialogDescription>
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
