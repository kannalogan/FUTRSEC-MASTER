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
  ClipboardCheck, BookOpen, FileSignature,
} from "lucide-react";

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
  published: "bg-emerald-100 text-emerald-700",
  draft: "bg-slate-100 text-slate-600",
  scheduled: "bg-blue-100 text-blue-700",
  archived: "bg-slate-100 text-slate-400",
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
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader
        icon={ListChecks}
        title="Task Builder"
        subtitle="Create assessments, resources, assignments & declarations for your cohort."
        actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> New Task</Button>}
      />

      {isLoading ? (
        <CardSkeleton rows={6} />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No tasks yet"
          description="Build your first task and publish it to your students."
          action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> New Task</Button>}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Audience</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((t) => {
                  const meta = TYPE_META[t.type];
                  return (
                    <TableRow key={t.id}>
                      <TableCell>
                        <div className="font-medium">{t.title}</div>
                        <div className="text-xs text-muted-foreground">{TRACK_LABELS[t.careerTrack] ?? t.careerTrack}</div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 text-sm">
                          <meta.icon className="h-3.5 w-3.5" style={{ color: meta.color }} />
                          {meta.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {AUDIENCE_OPTIONS.find((a) => a.value === t.audience)?.label ?? t.audience}
                      </TableCell>
                      <TableCell>{t.assignedCount}</TableCell>
                      <TableCell>
                        <Badge className={`border-0 ${STATUS_STYLE[t.status] ?? STATUS_STYLE.draft}`}>{t.status}</Badge>
                        {t.status === "scheduled" && t.scheduledAt && (
                          <div className="text-[10px] text-muted-foreground mt-0.5">{new Date(t.scheduledAt).toLocaleString()}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {t.status !== "published" && (
                            <Button size="sm" variant="ghost" title="Publish" onClick={() => act(t.id, "publish")} disabled={updateMut.isPending}>
                              <Send className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {t.status !== "archived" && (
                            <Button size="sm" variant="ghost" title="Archive" onClick={() => act(t.id, "archive")} disabled={updateMut.isPending}>
                              <Archive className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" title="Delete" onClick={() => setDeleteId(t.id)} disabled={deleteMut.isPending}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Builder dialog */}
      <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); setOpen(v); }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Task</DialogTitle>
            <DialogDescription>Configure type, audience, schedule and dates.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="mb-2 block">Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(TYPE_META) as MentorTaskType[]).map((t) => {
                  const meta = TYPE_META[t];
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${type === t ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}
                    >
                      <meta.icon className="h-4 w-4" style={{ color: meta.color }} />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label htmlFor="t-title">Title</Label>
              <Input id="t-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Module 3 assessment" />
            </div>
            <div>
              <Label htmlFor="t-desc">Description (optional)</Label>
              <Textarea id="t-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <div>
              <Label htmlFor="t-url">Content URL (optional)</Label>
              <Input id="t-url" value={contentUrl} onChange={(e) => setContentUrl(e.target.value)} placeholder="https://…" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Track</Label>
                <Select value={careerTrack} onValueChange={setCareerTrack}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRACKS.map((t) => <SelectItem key={t} value={t}>{TRACK_LABELS[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Audience</Label>
                <Select value={audience} onValueChange={(v) => setAudience(v as MentorTaskAudience)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AUDIENCE_OPTIONS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {audience === "specific_batches" && (
              <div>
                <Label className="mb-1.5 block">Select batches</Label>
                {batches.length === 0 ? (
                  <p className="text-xs text-muted-foreground">You have no batches assigned.</p>
                ) : (
                  <div className="space-y-1 border rounded-lg p-2 max-h-32 overflow-y-auto">
                    {batches.map((b) => (
                      <label key={b.id} className="flex items-center gap-2 px-1.5 py-1 cursor-pointer hover:bg-muted/50 rounded text-sm">
                        <input type="checkbox" checked={batchIds.has(b.id)} onChange={() => toggleBatch(b.id)} />
                        {b.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="t-start">Start date (optional)</Label>
                <Input id="t-start" type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="t-end">End date (optional)</Label>
                <Input id="t-end" type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>

            <div>
              <Label htmlFor="t-sched">Schedule publish at (optional)</Label>
              <Input id="t-sched" type="datetime-local" min={toLocalInput(new Date())} value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            </div>
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="ghost" onClick={() => submit("draft")} disabled={!title || createMut.isPending}>Save Draft</Button>
            <Button variant="outline" onClick={() => submit("schedule")} disabled={!title || !scheduledAt || createMut.isPending}>
              <CalendarClock className="h-4 w-4 mr-1.5" /> Schedule
            </Button>
            <Button onClick={() => submit("publish")} disabled={!title || createMut.isPending}>
              <Send className="h-4 w-4 mr-1.5" /> Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>This permanently removes the task and its assignments. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId !== null) {
                  deleteMut.mutate(deleteId, {
                    onSuccess: () => toast({ title: "Task deleted" }),
                    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
                  });
                }
                setDeleteId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
