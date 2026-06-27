import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  useStudentTasks,
  useCompleteResourceTask,
  useSubmitAssignment,
  useAcknowledgeDeclaration,
  type StudentTask,
} from "@/lib/student-tasks-api";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  FolderKanban,
  CheckCircle2,
  ClipboardList,
  FileText,
  Upload,
  PenLine,
  ExternalLink,
  Loader2,
  Paperclip,
  Clock,
} from "lucide-react";
import { PageHeader, GridSkeleton, EmptyState } from "@/components/page-shell";

const TYPE_META: Record<
  StudentTask["type"],
  { label: string; icon: typeof FolderKanban; color: string }
> = {
  assessment: { label: "Assessment", icon: ClipboardList, color: "#2563EB" },
  resource: { label: "Resource", icon: FileText, color: "#10B981" },
  assignment: { label: "Assignment", icon: Upload, color: "#F97316" },
  declaration: { label: "Declaration", icon: PenLine, color: "#8B5CF6" },
};

const REVIEW_META: Record<
  string,
  { label: string; className: string }
> = {
  pending: { label: "Awaiting review", className: "text-amber-600" },
  approved: { label: "Approved", className: "text-success" },
  rejected: { label: "Rejected", className: "text-destructive" },
  changes_requested: {
    label: "Changes requested",
    className: "text-orange-600",
  },
};

export default function TasksPage() {
  const [filter, setFilter] = useState<"all" | "pending" | "done">("all");
  const { data, isLoading } = useStudentTasks();
  const tasks = data?.tasks ?? [];

  const isDone = (t: StudentTask) => t.status === "completed";
  const filtered = tasks.filter((t) =>
    filter === "all" ? true : filter === "done" ? isDone(t) : !isDone(t)
  );
  const doneCount = tasks.filter(isDone).length;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <PageHeader
        icon={FolderKanban}
        title="Tasks"
        subtitle="Assessments, resources, assignments and declarations from your mentor"
        actions={
          tasks.length > 0 ? (
            <Badge className="bg-primary/10 text-primary border-primary/20">
              {doneCount} / {tasks.length} done
            </Badge>
          ) : undefined
        }
      />

      <div className="flex gap-2 mb-5">
        {(["all", "pending", "done"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg capitalize transition-colors ${
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {isLoading ? (
        <GridSkeleton cols={1} rows={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title={filter === "all" ? "No tasks yet" : `No ${filter} tasks`}
          description="Your mentor hasn't assigned any tasks yet. Check back soon."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((t, idx) => (
            <TaskCard key={t.assignmentId} task={t} idx={idx} />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskCard({ task, idx }: { task: StudentTask; idx: number }) {
  const meta = TYPE_META[task.type];
  const Icon = meta.icon;
  const done = task.status === "completed";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, delay: idx * 0.03 }}
    >
      <Card className={`bg-card border-border/60 ${done ? "opacity-80" : ""}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div
              className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${meta.color}1a` }}
            >
              {done ? (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ) : (
                <Icon className="h-5 w-5" style={{ color: meta.color }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-medium text-sm text-foreground">
                  {task.title}
                </h3>
                <Badge variant="outline" className="text-[10px] capitalize">
                  {meta.label}
                </Badge>
                {task.points != null && (
                  <Badge variant="outline" className="text-[10px]">
                    {task.points} pts
                  </Badge>
                )}
              </div>
              {task.description && (
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {task.description}
                </p>
              )}
              {task.endDate && !done && (
                <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Due {new Date(task.endDate).toLocaleDateString()}
                </p>
              )}
              <div className="mt-3">
                <TaskAction task={task} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function TaskAction({ task }: { task: StudentTask }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const completeResource = useCompleteResourceTask();
  const done = task.status === "completed";

  if (task.type === "assessment") {
    const a = task.assessment;
    const exhausted =
      a?.attemptsRemaining != null && a.attemptsRemaining <= 0;
    return (
      <div className="flex items-center gap-3 flex-wrap">
        {a && a.attemptsUsed > 0 && (
          <span className="text-xs text-muted-foreground">
            {task.maxAttempts != null
              ? `${a.attemptsUsed}/${task.maxAttempts} attempts used`
              : `${a.attemptsUsed} attempts`}
          </span>
        )}
        {done ? (
          <Badge variant="outline" className="text-success text-xs">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Completed
          </Badge>
        ) : !a || !a.isActive ? (
          <Badge variant="outline" className="text-muted-foreground text-xs">
            Assessment unavailable
          </Badge>
        ) : exhausted ? (
          <Badge variant="outline" className="text-destructive text-xs">
            No attempts remaining
          </Badge>
        ) : (
          <Button
            size="sm"
            onClick={() =>
              setLocation(`/assessment/${task.refId}?taskId=${task.taskId}`)
            }
          >
            {a.attemptsUsed > 0 ? "Retake" : "Start"} Assessment
          </Button>
        )}
      </div>
    );
  }

  if (task.type === "resource") {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {task.contentUrl && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(task.contentUrl!, "_blank")}
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Open
          </Button>
        )}
        {done ? (
          <Badge variant="outline" className="text-success text-xs">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Completed
          </Badge>
        ) : (
          <Button
            size="sm"
            disabled={completeResource.isPending}
            onClick={() =>
              completeResource.mutate(task.assignmentId, {
                onSuccess: () =>
                  toast({ title: "Marked as complete" }),
                onError: (e) =>
                  toast({
                    title: "Failed",
                    description:
                      e instanceof Error ? e.message : "Try again",
                    variant: "destructive",
                  }),
              })
            }
          >
            {completeResource.isPending && (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            )}
            Mark Complete
          </Button>
        )}
      </div>
    );
  }

  if (task.type === "assignment") return <AssignmentAction task={task} />;
  if (task.type === "declaration") return <DeclarationAction task={task} />;
  return null;
}

function AssignmentAction({ task }: { task: StudentTask }) {
  const { toast } = useToast();
  const submit = useSubmitAssignment();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<{ id: number; name: string } | null>(null);

  const review = task.reviewStatus
    ? REVIEW_META[task.reviewStatus]
    : undefined;
  const approved = task.reviewStatus === "approved";

  const handleFile = async (f: File) => {
    setUploading(true);
    try {
      const { uploadURL, objectPath } = await apiFetch<{
        uploadURL: string;
        objectPath: string;
      }>("/api/storage/uploads/request-url", {
        method: "POST",
        body: JSON.stringify({
          name: f.name,
          contentType: f.type || "application/octet-stream",
          size: f.size,
        }),
      });
      const put = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": f.type || "application/octet-stream" },
        body: f,
      });
      if (!put.ok) throw new Error(`Upload failed (${put.status})`);
      const saved = await apiFetch<{ file: { id: number } }>(
        "/api/storage/files",
        {
          method: "POST",
          body: JSON.stringify({
            objectPath,
            name: f.name,
            contentType: f.type || "application/octet-stream",
            size: f.size,
            usageArea: "assignments",
          }),
        }
      );
      setFile({ id: saved.file.id, name: f.name });
      toast({ title: "File attached", description: f.name });
    } catch (e) {
      toast({
        title: "Upload failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    submit.mutate(
      {
        assignmentId: task.assignmentId,
        submissionText: text.trim() || undefined,
        fileId: file?.id,
      },
      {
        onSuccess: () => {
          toast({ title: "Submitted for review" });
          setOpen(false);
          setText("");
          setFile(null);
        },
        onError: (e) =>
          toast({
            title: "Submission failed",
            description: e instanceof Error ? e.message : "Try again",
            variant: "destructive",
          }),
      }
    );
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {task.submittedAt && review && (
        <span className={`text-xs font-medium ${review.className}`}>
          {review.label}
        </span>
      )}
      {task.score != null && (
        <Badge variant="outline" className="text-xs">
          Score {task.score}
        </Badge>
      )}
      {task.reviewNotes && (
        <p className="text-xs text-muted-foreground w-full">
          Mentor: {task.reviewNotes}
        </p>
      )}
      {approved ? (
        <Badge variant="outline" className="text-success text-xs">
          <CheckCircle2 className="h-3 w-3 mr-1" /> Approved
        </Badge>
      ) : (
        <Button size="sm" onClick={() => setOpen(true)}>
          {task.submittedAt ? "Resubmit" : "Submit Work"}
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Assignment</DialogTitle>
            <DialogDescription>{task.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-1.5 block">Notes / Answer</Label>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Describe your work or paste your answer…"
                rows={5}
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Attachment (optional)</Label>
              {file ? (
                <div className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg px-3 py-2">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 truncate">{file.name}</span>
                  <button
                    className="text-xs text-destructive"
                    onClick={() => setFile(null)}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 text-sm border border-dashed border-border rounded-lg px-3 py-3 cursor-pointer hover:bg-muted/50 transition-colors">
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-muted-foreground">
                    {uploading ? "Uploading…" : "Choose a file"}
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                    }}
                  />
                </label>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                submit.isPending ||
                uploading ||
                (!text.trim() && !file)
              }
            >
              {submit.isPending && (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              )}
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DeclarationAction({ task }: { task: StudentTask }) {
  const { toast } = useToast();
  const ack = useAcknowledgeDeclaration();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  if (task.acknowledged) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="text-success text-xs">
          <CheckCircle2 className="h-3 w-3 mr-1" /> Signed
        </Badge>
        {task.signatureName && (
          <span className="text-xs text-muted-foreground">
            by {task.signatureName}
            {task.signedAt
              ? ` · ${new Date(task.signedAt).toLocaleDateString()}`
              : ""}
          </span>
        )}
      </div>
    );
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <PenLine className="h-3.5 w-3.5 mr-1.5" /> Review & Sign
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{task.title}</DialogTitle>
            {task.description && (
              <DialogDescription className="whitespace-pre-wrap text-left">
                {task.description}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-3">
            {task.contentUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(task.contentUrl!, "_blank")}
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> View document
              </Button>
            )}
            <div>
              <Label className="mb-1.5 block">
                Type your full name to sign
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              By signing, you acknowledge and agree to the terms above. This is
              recorded with a timestamp.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!name.trim() || ack.isPending}
              onClick={() =>
                ack.mutate(
                  {
                    assignmentId: task.assignmentId,
                    signatureName: name.trim(),
                  },
                  {
                    onSuccess: () => {
                      toast({ title: "Declaration signed" });
                      setOpen(false);
                    },
                    onError: (e) =>
                      toast({
                        title: "Failed",
                        description:
                          e instanceof Error ? e.message : "Try again",
                        variant: "destructive",
                      }),
                  }
                )
              }
            >
              {ack.isPending && (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              )}
              Sign & Accept
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
