import { useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import {
  DndContext, useDraggable, useDroppable, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  useDrive, useDriveInvites, useDriveSchedules,
  useCreateSchedule, useReschedule, useSetAttendance, useSetResult, useCancelSchedule,
  ROUND_TYPE_LABELS, RESULT_VALUES,
  type Schedule, type DriveRound,
} from "@/lib/placement-drives-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { PageHeader, CardSkeleton, EmptyState } from "@/components/page-shell";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  CalendarDays, ArrowLeft, Plus, GripVertical, Check, X, MapPin, Video, Clock,
} from "lucide-react";

const SLOT_HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17];

const RESULT_BADGE: Record<string, string> = {
  pending: "bg-muted text-muted-foreground border-border",
  pass: "bg-success/10 text-success border-success/30",
  fail: "bg-destructive/15 text-destructive border-destructive/30",
  selected: "bg-success/10 text-success border-success/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
  offer: "bg-info/10 text-info border-info/30",
  joined: "bg-success/15 text-success border-success/40",
};

function dayString(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function durationOf(s: Schedule): number {
  const start = new Date(s.slotStart).getTime();
  const end = new Date(s.slotEnd).getTime();
  const mins = Math.round((end - start) / 60000);
  return mins > 0 ? mins : 45;
}

interface CreateForm {
  roundId: string;
  studentId: string;
  hour: string;
  durationMinutes: string;
  venue: string;
  meetingUrl: string;
}

const EMPTY_CREATE: CreateForm = {
  roundId: "", studentId: "", hour: "9", durationMinutes: "45", venue: "", meetingUrl: "",
};

export default function TpoDriveCalendar() {
  const params = useParams();
  const id = Number(params.id);
  const { toast } = useToast();

  const { data: detail, isLoading } = useDrive(id);
  const { data: schedulesData, isLoading: schedLoading } = useDriveSchedules(id);
  const { data: invitesData } = useDriveInvites(id);

  const createSchedule = useCreateSchedule(id);
  const reschedule = useReschedule(id);
  const setAttendance = useSetAttendance(id);
  const setResult = useSetResult(id);
  const cancelSchedule = useCancelSchedule(id);

  const drive = detail?.drive;
  const rounds = detail?.rounds ?? [];
  const schedules = schedulesData?.schedules ?? [];
  const acceptedInvites = useMemo(
    () => (invitesData?.invites ?? []).filter((i) => i.status === "accepted"),
    [invitesData],
  );

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const initialDay = drive?.driveDate ? new Date(drive.driveDate) : new Date();
  const [day, setDay] = useState<string>(dayString(initialDay));

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE);

  const daySchedules = useMemo(
    () => schedules.filter((s) => dayString(new Date(s.slotStart)) === day),
    [schedules, day],
  );

  const byHour = useMemo(() => {
    const map = new Map<number, Schedule[]>();
    for (const h of SLOT_HOURS) map.set(h, []);
    for (const s of daySchedules) {
      const h = new Date(s.slotStart).getHours();
      if (!map.has(h)) map.set(h, []);
      map.get(h)!.push(s);
    }
    return map;
  }, [daySchedules]);

  const offDaySchedules = useMemo(
    () => schedules.filter((s) => dayString(new Date(s.slotStart)) !== day),
    [schedules, day],
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const scheduleId = Number(e.active.id);
    const overId = e.over?.id;
    if (!overId || typeof overId !== "string" || !overId.startsWith("hour-")) return;
    const hour = Number(overId.replace("hour-", ""));
    const sched = schedules.find((s) => s.id === scheduleId);
    if (!sched) return;
    const cur = new Date(sched.slotStart);
    if (cur.getHours() === hour && dayString(cur) === day) return;
    const dur = durationOf(sched);
    const start = new Date(`${day}T${String(hour).padStart(2, "0")}:00:00`);
    const end = new Date(start.getTime() + dur * 60000);
    reschedule.mutate(
      {
        scheduleId,
        body: { slotStart: start.toISOString(), slotEnd: end.toISOString() },
      },
      {
        onSuccess: () => toast({ title: "Interview rescheduled" }),
        onError: (err: Error) =>
          toast({ title: "Could not reschedule", description: err.message, variant: "destructive" }),
      },
    );
  };

  const setCF = <K extends keyof CreateForm>(k: K, v: CreateForm[K]) =>
    setCreateForm((f) => ({ ...f, [k]: v }));

  const openCreate = () => {
    setCreateForm({ ...EMPTY_CREATE, roundId: rounds[0] ? String(rounds[0].id) : "" });
    setCreateOpen(true);
  };

  const submitCreate = () => {
    if (!createForm.roundId) { toast({ title: "Select a round", variant: "destructive" }); return; }
    if (!createForm.studentId) { toast({ title: "Select a student", variant: "destructive" }); return; }
    const hour = Number(createForm.hour);
    const dur = Number(createForm.durationMinutes) || 45;
    const start = new Date(`${day}T${String(hour).padStart(2, "0")}:00:00`);
    const end = new Date(start.getTime() + dur * 60000);
    createSchedule.mutate(
      {
        roundId: Number(createForm.roundId),
        body: {
          studentId: Number(createForm.studentId),
          slotStart: start.toISOString(),
          slotEnd: end.toISOString(),
          venue: createForm.venue.trim() || null,
          meetingUrl: createForm.meetingUrl.trim() || null,
        },
      },
      {
        onSuccess: () => { toast({ title: "Interview scheduled" }); setCreateOpen(false); },
        onError: (err: Error) =>
          toast({ title: "Could not schedule", description: err.message, variant: "destructive" }),
      },
    );
  };

  if (isLoading) {
    return <div className="p-6 max-w-7xl mx-auto space-y-4"><CardSkeleton rows={2} /><CardSkeleton rows={5} /></div>;
  }

  if (!drive) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <EmptyState
          icon={CalendarDays}
          title="Drive not found"
          description="This placement drive does not exist or you do not have access to it."
          action={<Link href="/tpo/drives"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-1.5" /> Back to drives</Button></Link>}
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Link href={`/tpo/drives/${id}`}>
        <Button variant="ghost" size="sm" className="mb-3 -ml-2 text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-1.5" /> {drive.companyName}
        </Button>
      </Link>

      <PageHeader
        icon={CalendarDays}
        title="Interview Calendar"
        subtitle="Drag interviews between time slots to reschedule. Conflicts are blocked automatically."
        actions={
          <div className="flex items-center gap-2">
            <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} className="w-[170px]" />
            <Button size="sm" onClick={openCreate} disabled={rounds.length === 0}>
              <Plus className="h-4 w-4 mr-1.5" /> Schedule
            </Button>
          </div>
        }
      />

      {rounds.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No rounds to schedule"
          description="Add interview rounds to this drive before scheduling student interviews."
          action={<Link href={`/tpo/drives/${id}`}><Button variant="outline">Manage rounds</Button></Link>}
        />
      ) : (
        <>
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="space-y-2">
              {SLOT_HOURS.map((hour) => (
                <HourRow
                  key={hour}
                  hour={hour}
                  schedules={byHour.get(hour) ?? []}
                  rounds={rounds}
                  loading={schedLoading}
                  onAttendance={(sid, att) =>
                    setAttendance.mutate(
                      { scheduleId: sid, attendance: att },
                      { onError: (e: Error) => toast({ title: e.message, variant: "destructive" }) },
                    )
                  }
                  onResult={(sid, body) =>
                    setResult.mutate(
                      { scheduleId: sid, body },
                      {
                        onSuccess: () => toast({ title: "Result saved" }),
                        onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
                      },
                    )
                  }
                  onCancel={(sid) =>
                    cancelSchedule.mutate(sid, {
                      onSuccess: () => toast({ title: "Interview cancelled" }),
                      onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
                    })
                  }
                />
              ))}
            </div>
          </DndContext>

          {offDaySchedules.length > 0 && (
            <Card className="mt-6">
              <CardContent className="p-4">
                <div className="text-sm font-medium text-foreground mb-2">
                  Interviews on other days ({offDaySchedules.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {offDaySchedules.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setDay(dayString(new Date(s.slotStart)))}
                      className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-muted/40 hover:bg-muted transition-colors"
                    >
                      {s.student?.fullName ?? "Student"} · {format(new Date(s.slotStart), "dd MMM, h:mm a")}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Create schedule dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Interview</DialogTitle>
            <DialogDescription>Book a slot for an accepted student on {format(new Date(`${day}T00:00:00`), "dd MMM yyyy")}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Round</Label>
              <Select value={createForm.roundId} onValueChange={(v) => setCF("roundId", v)}>
                <SelectTrigger><SelectValue placeholder="Select round" /></SelectTrigger>
                <SelectContent>
                  {rounds.map((r) => <SelectItem key={r.id} value={String(r.id)}>{r.sequence}. {r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Student (accepted)</Label>
              <Select value={createForm.studentId} onValueChange={(v) => setCF("studentId", v)}>
                <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>
                  {acceptedInvites.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">No accepted students yet</div>
                  ) : acceptedInvites.map((inv) => (
                    <SelectItem key={inv.studentId} value={String(inv.studentId)}>
                      {inv.student?.fullName ?? inv.student?.email ?? `Student ${inv.studentId}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Time slot</Label>
                <Select value={createForm.hour} onValueChange={(v) => setCF("hour", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SLOT_HOURS.map((h) => <SelectItem key={h} value={String(h)}>{format(new Date(2020, 0, 1, h), "h:mm a")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="c-dur">Duration (min)</Label>
                <Input id="c-dur" type="number" min={5} value={createForm.durationMinutes} onChange={(e) => setCF("durationMinutes", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="c-venue">Venue</Label>
                <Input id="c-venue" value={createForm.venue} onChange={(e) => setCF("venue", e.target.value)} placeholder="Optional" />
              </div>
              <div>
                <Label htmlFor="c-url">Meeting URL</Label>
                <Input id="c-url" value={createForm.meetingUrl} onChange={(e) => setCF("meetingUrl", e.target.value)} placeholder="Optional" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={submitCreate} disabled={createSchedule.isPending}>Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HourRow({
  hour, schedules, rounds, loading, onAttendance, onResult, onCancel,
}: {
  hour: number;
  schedules: Schedule[];
  rounds: DriveRound[];
  loading: boolean;
  onAttendance: (sid: number, att: "present" | "absent") => void;
  onResult: (sid: number, body: { result: string; score?: number | null; feedback?: string | null }) => void;
  onCancel: (sid: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `hour-${hour}` });
  return (
    <div className="flex gap-3">
      <div className="w-16 shrink-0 pt-2 text-right text-sm font-medium text-muted-foreground">
        {format(new Date(2020, 0, 1, hour), "h a")}
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-[64px] rounded-xl border border-dashed p-2 flex flex-wrap gap-2 transition-colors ${
          isOver ? "border-primary bg-primary/5" : "border-border bg-muted/20"
        }`}
      >
        {loading && schedules.length === 0 ? (
          <div className="text-xs text-muted-foreground self-center px-2">Loading…</div>
        ) : schedules.length === 0 ? (
          <div className="text-xs text-muted-foreground/60 self-center px-2">Drop interviews here</div>
        ) : (
          schedules.map((s) => (
            <ScheduleCard
              key={s.id}
              schedule={s}
              round={rounds.find((r) => r.id === s.roundId)}
              onAttendance={onAttendance}
              onResult={onResult}
              onCancel={onCancel}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ScheduleCard({
  schedule, round, onAttendance, onResult, onCancel,
}: {
  schedule: Schedule;
  round?: DriveRound;
  onAttendance: (sid: number, att: "present" | "absent") => void;
  onResult: (sid: number, body: { result: string; score?: number | null; feedback?: string | null }) => void;
  onCancel: (sid: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: String(schedule.id) });
  const [resultOpen, setResultOpen] = useState(false);
  const [result, setResultVal] = useState(schedule.result || "pending");
  const [score, setScore] = useState(schedule.score != null ? String(schedule.score) : "");
  const [feedback, setFeedback] = useState(schedule.feedback ?? "");

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 50 }
    : undefined;

  const saveResult = () => {
    onResult(schedule.id, {
      result,
      score: score ? Number(score) : null,
      feedback: feedback.trim() || null,
    });
    setResultOpen(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`w-[240px] rounded-lg border border-border bg-card elevation-1 p-2.5 ${isDragging ? "opacity-60" : ""}`}
    >
      <div className="flex items-start gap-1.5">
        <button {...listeners} {...attributes} className="mt-0.5 text-muted-foreground/60 hover:text-foreground cursor-grab active:cursor-grabbing touch-none">
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-foreground truncate">{schedule.student?.fullName ?? "Student"}</div>
          <div className="text-xs text-muted-foreground truncate">
            {round ? (ROUND_TYPE_LABELS[round.type] ?? round.name) : "Round"} · {format(new Date(schedule.slotStart), "h:mm a")}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
        {schedule.venue ? <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{schedule.venue}</span>
          : schedule.meetingUrl ? <span className="inline-flex items-center gap-1"><Video className="h-3 w-3" />Online</span>
          : <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{durationOf(schedule)}m</span>}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mt-2">
        <Badge variant="outline" className={`capitalize text-[10px] ${RESULT_BADGE[schedule.result] ?? ""}`}>{schedule.result}</Badge>
        {schedule.attendance !== "unknown" && (
          <Badge variant="outline" className="capitalize text-[10px]">{schedule.attendance}</Badge>
        )}
      </div>

      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/50">
        <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600" title="Present" onClick={() => onAttendance(schedule.id, "present")}>
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" title="Absent" onClick={() => onAttendance(schedule.id, "absent")}>
          <X className="h-3.5 w-3.5" />
        </Button>
        <Popover open={resultOpen} onOpenChange={setResultOpen}>
          <PopoverTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs ml-auto">Result</Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 space-y-3" align="end">
            <div>
              <Label className="text-xs">Outcome</Label>
              <Select value={result} onValueChange={setResultVal}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RESULT_VALUES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Score (0-100)</Label>
              <Input className="h-8" type="number" min={0} max={100} value={score} onChange={(e) => setScore(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Feedback</Label>
              <Input className="h-8" value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Optional" />
            </div>
            <div className="flex justify-between gap-2">
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { onCancel(schedule.id); setResultOpen(false); }}>
                Cancel slot
              </Button>
              <Button size="sm" onClick={saveResult}>Save</Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
