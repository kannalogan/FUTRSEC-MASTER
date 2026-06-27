import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useMentorStudents, useMentorBatches } from "@/lib/mentor-api";
import {
  MI_TRACK_LABELS, useAssignMITemplate, type MITemplate, type MIAssignBody,
} from "@/lib/mock-interview-api";
import { Loader2, Users, Layers, Send, AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  template: MITemplate | null;
}

type Mode = "students" | "batches" | "all";

export function MockInterviewAssignDialog({ open, onOpenChange, template }: Props) {
  const { toast } = useToast();
  const assignMut = useAssignMITemplate();
  const { data: studentsData } = useMentorStudents();
  const { data: batchesData } = useMentorBatches();

  const [mode, setMode] = useState<Mode>("students");
  const [studentIds, setStudentIds] = useState<number[]>([]);
  const [batchIds, setBatchIds] = useState<number[]>([]);

  useEffect(() => {
    if (open) { setMode("students"); setStudentIds([]); setBatchIds([]); }
  }, [open]);

  if (!template) return null;

  // Track isolation surfaced in the UI: only same-track students are eligible.
  const eligibleStudents = (studentsData?.students ?? []).filter((s) => s.careerTrack === template.careerTrack);
  const eligibleBatches = (batchesData?.batches ?? []).filter((b) => b.careerTrack === template.careerTrack);

  const toggleStudent = (id: number) =>
    setStudentIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleBatch = (id: number) =>
    setBatchIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = async () => {
    const body: MIAssignBody =
      mode === "students" ? { mode: "students", studentIds }
      : mode === "batches" ? { mode: "batches", batchIds }
      : { mode: "all" };

    if (mode === "students" && studentIds.length === 0) {
      toast({ title: "Select at least one student", variant: "destructive" });
      return;
    }
    if (mode === "batches" && batchIds.length === 0) {
      toast({ title: "Select at least one batch", variant: "destructive" });
      return;
    }

    try {
      const r = await assignMut.mutateAsync({ id: template.id, body });
      const parts = [`${r.assigned} assigned`];
      if (r.alreadyAssigned) parts.push(`${r.alreadyAssigned} already assigned`);
      if (r.skippedTrackMismatch) parts.push(`${r.skippedTrackMismatch} skipped (off-track)`);
      toast({ title: "Assignment complete", description: parts.join(" · ") });
      onOpenChange(false);
    } catch (e) {
      toast({ title: "Assignment failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  const TabBtn = ({ value, icon: Icon, label }: { value: Mode; icon: React.ComponentType<{ className?: string }>; label: string }) => (
    <button
      onClick={() => setMode(value)}
      className={`flex-1 flex items-center justify-center gap-1.5 text-sm px-3 py-2 rounded-lg border transition-colors ${
        mode === value ? "bg-primary text-primary-foreground border-primary" : "border-border/60 text-muted-foreground hover:border-primary/40"
      }`}
    >
      <Icon className="h-4 w-4" />{label}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign “{template.title}”</DialogTitle>
          <DialogDescription>
            Only students on the {MI_TRACK_LABELS[template.careerTrack] ?? template.careerTrack} track can be assigned.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <TabBtn value="students" icon={Users} label="Students" />
            <TabBtn value="batches" icon={Layers} label="Batches" />
            <TabBtn value="all" icon={Send} label="All eligible" />
          </div>

          {mode === "students" && (
            <ScrollArea className="h-64 rounded-lg border border-border/60">
              <div className="p-2 space-y-1">
                {eligibleStudents.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-4 text-center">No students on this track are assigned to you.</p>
                ) : (
                  eligibleStudents.map((s) => (
                    <label key={s.id} className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-muted/50 cursor-pointer">
                      <Checkbox checked={studentIds.includes(s.id)} onCheckedChange={() => toggleStudent(s.id)} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{s.fullName ?? "Unnamed"}</p>
                        <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </ScrollArea>
          )}

          {mode === "batches" && (
            <ScrollArea className="h-64 rounded-lg border border-border/60">
              <div className="p-2 space-y-1">
                {eligibleBatches.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-4 text-center">No batches on this track.</p>
                ) : (
                  eligibleBatches.map((b) => (
                    <label key={b.id} className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-muted/50 cursor-pointer">
                      <Checkbox checked={batchIds.includes(b.id)} onCheckedChange={() => toggleBatch(b.id)} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{b.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{b.studentCount} students</p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </ScrollArea>
          )}

          {mode === "all" && (
            <div className="rounded-lg border border-border/60 p-4 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                This assigns the interview to <span className="font-medium text-foreground">all {eligibleStudents.length} of your students</span> on the {MI_TRACK_LABELS[template.careerTrack] ?? template.careerTrack} track. Students on other tracks are skipped automatically.
              </p>
            </div>
          )}

          {mode === "students" && studentIds.length > 0 && (
            <Badge variant="outline">{studentIds.length} selected</Badge>
          )}
          {mode === "batches" && batchIds.length > 0 && (
            <Badge variant="outline">{batchIds.length} selected</Badge>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={assignMut.isPending}>
            {assignMut.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
