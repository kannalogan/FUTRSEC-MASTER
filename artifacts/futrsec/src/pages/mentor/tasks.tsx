import { useState } from "react";
import {
  useMentorTasks, useCreateTask, useUpdateTask, useDeleteTask, useMentorBatches,
  TRACK_LABELS, TRACKS,
  type MentorTaskType, type MentorTaskAudience, type CreateTaskBody,
} from "@/lib/mentor-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader, CardSkeleton, EmptyState } from "@/components/page-shell";
import { useToast } from "@/hooks/use-toast";
import {
  ListChecks, Plus, Send, Archive, CalendarClock, Trash2, FileText,
  ClipboardCheck, BookOpen, FileSignature, Target, Users
} from "lucide-react";
import { motion } from "framer-motion";

const TYPE_META: Record<MentorTaskType, { label: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; color: string }> = {
  assessment: { label: "Assessment", icon: ClipboardCheck, color: "#2563EB" },
  resource: { label: "Resource", icon: BookOpen, color: "#10B981" },
  assignment: { label: "Assignment", icon: FileText, color: "#F97316" },
  declaration: { label: "Declaration", icon: FileSignature, color: "#8B5CF6" },
};

const AUDIENCE_OPTIONS: { value: MentorTaskAudience; label: string }[] = [
  { value: "all_students", label: "All Students" },
  { value: "trial_students", label: "Trial Students" },
  { value: "all_batches", label: "All Batches" },
  { value: "specific_batches", label: "Specific Batches" },
  { value: "future_batches", label: "Future Batches" },
];

const STATUS_STYLE: Record<string, string> = {
  published: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  draft: "bg-muted text-muted-foreground border-border",
  scheduled: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  archived: "bg-muted/50 text-muted-foreground/70 border-border/50",
};

function toLocalInput(date: Date) {
  const off = date.getTimezoneOffset();
  return new Date(date.getTime() - off * 60000).toISOString().slice(0, 16);
}

export default function MentorTasksPage() {
  const { toast } = useToast();
  const { data, isLoading } = useMentorTasks();
  const { data: batchData } = useMentorBatches();
  const createMut = useCreateTask();
  const updateMut = useUpdateTask();
  const deleteMut = useDeleteTask();

  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const tasks = data?.tasks ?? [];
  const batches = batchData?.batches ?? [];

  // form state
  const [type, setType] = useState<MentorTaskType>("resource");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contentUrl, setContentUrl] = useState("");
  const [careerTrack, setCareerTrack] = useState<string>("soc");
  const [audience, setAudience] = useState<MentorTaskAudience>("all_students");
  const [batchIds, setBatchIds] = useState<Set<number>>(new Set());
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  const resetForm = () => {
    setType("resource"); setTitle(""); setDescription(""); setContentUrl("");
    setCareerTrack("soc"); setAudience("all_students"); setBatchIds(new Set());
    setStartDate(""); setEndDate(""); setScheduledAt("");
  };

  const toggleBatch = (id: number) => {
    setBatchIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const submit = (action: "draft" | "publish" | "schedule") => {
    if (audience === "specific_batches" && batchIds.size === 0) {
      toast({ title: "Select at least one batch", variant: "destructive" });
      return;
    }
    if (action === "schedule" && !scheduledAt) {
      toast({ title: "Pick a schedule date", variant: "destructive" });
      return;
    }
    const body: CreateTaskBody = {
      type, title, careerTrack, audience, action,
      ...(description ? { description } : {}),
      ...(contentUrl ? { contentUrl } : {}),
      ...(audience === "specific_batches" ? { batchIds: Array.from(batchIds) } : {}),
      ...(startDate ? { startDate: new Date(startDate).toISOString() } : {}),
      ...(endDate ? { endDate: new Date(endDate).toISOString() } : {}),
      ...(action === "schedule" ? { scheduledAt: new Date(scheduledAt).toISOString() } : {}),
    };
    createMut.mutate(body, {
      onSuccess: (r: any) => {
        toast({ title: `Task ${action === "draft" ? "saved as draft" : action + "ed"}`, description: r?.task?.assigned ? `${r.task.assigned} student(s) assigned.` : undefined });
        resetForm(); setOpen(false);
      },
      onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
    });
  };

  const act = (id: number, action: "publish" | "archive" | "draft") => {
    updateMut.mutate({ id, action }, {
      onSuccess: (r: any) => toast({ title: `Task ${action}ed`, description: action === "publish" && r?.task?.assigned ? `${r.task.assigned} student(s) assigned.` : undefined }),
      onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
    });
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <PageHeader
          icon={ListChecks}
          title="Task Builder"
          subtitle="Design, schedule, and assign custom modules to your cohort."
          actions={<Button onClick={() => setOpen(true)} className="rounded-full px-6 font-semibold shadow-sm"><Plus className="h-4 w-4 mr-2" /> Create Task</Button>}
        />
      </motion.div>

      {isLoading ? (
        <CardSkeleton rows={8} />
      ) : tasks.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <EmptyState
            icon={ListChecks}
            title="Task library is empty"
            description="Build your first assessment, assignment, or resource for your students."
            action={<Button onClick={() => setOpen(true)} className="mt-4"><Plus className="h-4 w-4 mr-2" /> Create Task</Button>}
          />
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
          <Card className="glass-card overflow-hidden border-border/60">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="py-4">Task Definition</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Target Audience</TableHead>
                  <TableHead className="text-center">Assigned</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Manage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((t) => {
                  const meta = TYPE_META[t.type];
                  return (
                    <TableRow key={t.id} className="group hover:bg-muted/30 transition-colors">
                      <TableCell className="py-4">
                        <div className="font-semibold text-foreground text-base tracking-tight mb-1">{t.title}</div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium uppercase tracking-wide">
                          <Target className="h-3 w-3" /> {TRACK_LABELS[t.careerTrack] ?? t.careerTrack}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-background text-xs uppercase tracking-wider py-1 px-2.5 font-semibold" style={{ borderColor: `${meta.color}40`, color: meta.color }}>
                          <meta.icon className="h-3.5 w-3.5 mr-1.5 inline-block" />
                          {meta.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {AUDIENCE_OPTIONS.find((a) => a.value === t.audience)?.label ?? t.audience}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-muted font-bold text-sm">
                          {t.assignedCount}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`border text-xs uppercase tracking-wider py-0.5 px-2 ${STATUS_STYLE[t.status] ?? STATUS_STYLE.draft}`}>{t.status}</Badge>
                        {t.status === "scheduled" && t.scheduledAt && (
                          <div className="text-sm font-medium text-muted-foreground mt-1.5 flex items-center gap-1">
                            <CalendarClock className="h-3 w-3" /> {new Date(t.scheduledAt).toLocaleString()}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          {t.status !== "published" && (
                            <Button size="icon" variant="ghost" title="Publish" onClick={() => act(t.id, "publish")} disabled={updateMut.isPending} className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10">
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                          {t.status !== "archived" && (
                            <Button size="icon" variant="ghost" title="Archive" onClick={() => act(t.id, "archive")} disabled={updateMut.isPending} className="h-8 w-8 hover:bg-muted">
                              <Archive className="h-4 w-4" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" title="Delete" onClick={() => setDeleteId(t.id)} disabled={deleteMut.isPending} className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </motion.div>
      )}

      <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); setOpen(v); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 border-border/60 glass-card">
          <div className="bg-muted/50 p-6 border-b border-border/50 sticky top-0 z-10 backdrop-blur-md">
            <DialogHeader>
              <DialogTitle className="text-2xl font-heading">Task Configuration</DialogTitle>
              <DialogDescription>Define parameters, schedule, and targeting for your new task.</DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-6 space-y-8">
            <div className="space-y-3">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Task Category</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(Object.keys(TYPE_META) as MentorTaskType[]).map((t) => {
                  const meta = TYPE_META[t];
                  const isActive = type === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`flex flex-col items-center justify-center gap-3 rounded-xl border p-4 transition-all duration-200 ${isActive ? "border-primary bg-primary/5 shadow-[0_0_15px_-3px_rgba(59,130,246,0.3)] ring-1 ring-primary/50" : "border-border hover:bg-muted/50 hover:border-border/80"}`}
                    >
                      <div className={`p-2.5 rounded-full ${isActive ? 'bg-background shadow-sm' : 'bg-muted'}`}>
                        <meta.icon className="h-5 w-5" style={{ color: isActive ? meta.color : "var(--muted-foreground)" }} />
                      </div>
                      <span className={`text-sm font-semibold ${isActive ? "text-foreground" : "text-muted-foreground"}`}>{meta.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="t-title" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Task Title</Label>
                <Input id="t-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Incident Response Lab #1" className="h-11 font-medium" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="t-desc" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Detailed Instructions (Optional)</Label>
                <Textarea id="t-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="resize-none" placeholder="Provide context, goals, and grading criteria..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="t-url" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">External Content Link (Optional)</Label>
                <Input id="t-url" value={contentUrl} onChange={(e) => setContentUrl(e.target.value)} placeholder="https://..." className="h-11" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 rounded-xl bg-muted/30 border border-border/50">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Career Track Requirement</Label>
                <Select value={careerTrack} onValueChange={setCareerTrack}>
                  <SelectTrigger className="h-11 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRACKS.map((t) => <SelectItem key={t} value={t} className="font-medium">{TRACK_LABELS[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Target Audience</Label>
                <Select value={audience} onValueChange={(v) => setAudience(v as MentorTaskAudience)}>
                  <SelectTrigger className="h-11 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AUDIENCE_OPTIONS.map((a) => <SelectItem key={a.value} value={a.value} className="font-medium">{a.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {audience === "specific_batches" && (
                <div className="col-span-1 md:col-span-2 space-y-2 mt-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Select Target Batches</Label>
                  {batches.length === 0 ? (
                    <p className="text-sm text-amber-600 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20 font-medium">You have no active batches assigned to target.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-background border rounded-xl p-3 max-h-40 overflow-y-auto">
                      {batches.map((b) => (
                        <label key={b.id} className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg border transition-colors ${batchIds.has(b.id) ? 'bg-primary/5 border-primary/30 text-primary' : 'hover:bg-muted/50 border-transparent text-foreground'}`}>
                          <input type="checkbox" className="accent-primary w-4 h-4 rounded border-border" checked={batchIds.has(b.id)} onChange={() => toggleBatch(b.id)} />
                          <span className="font-medium text-sm truncate">{b.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="t-start" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Available From (Optional)</Label>
                <Input id="t-start" type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-11 text-sm font-medium" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="t-end" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Due Deadline (Optional)</Label>
                <Input id="t-end" type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-11 text-sm font-medium" />
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-border/50">
              <Label htmlFor="t-sched" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <CalendarClock className="h-4 w-4" /> Automate Publishing (Optional)
              </Label>
              <Input id="t-sched" type="datetime-local" min={toLocalInput(new Date())} value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="h-11 text-sm font-medium max-w-sm" />
            </div>
          </div>

          <div className="bg-muted/50 p-6 border-t border-border/50 flex flex-col-reverse sm:flex-row justify-end gap-3 sticky bottom-0 z-10 backdrop-blur-md">
            <Button variant="ghost" className="font-semibold" onClick={() => submit("draft")} disabled={!title || createMut.isPending}>Save as Draft</Button>
            <Button variant="outline" className="font-semibold bg-background" onClick={() => submit("schedule")} disabled={!title || !scheduledAt || createMut.isPending}>
              <CalendarClock className="h-4 w-4 mr-2" /> Schedule Automation
            </Button>
            <Button onClick={() => submit("publish")} disabled={!title || createMut.isPending} className="font-semibold px-6">
              <Send className="h-4 w-4 mr-2" /> Publish Immediately
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent className="glass-card border-destructive/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" /> Permanent Deletion
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-foreground/80">
              This action will instantly destroy the task, removing it from all student dashboards. Any submitted work tied to this task may become orphaned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="font-semibold">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold px-6"
              onClick={() => {
                if (deleteId !== null) {
                  deleteMut.mutate(deleteId, {
                    onSuccess: () => toast({ title: "Task annihilated" }),
                    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
                  });
                }
                setDeleteId(null);
              }}
            >
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
