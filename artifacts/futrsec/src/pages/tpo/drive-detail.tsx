import { useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import {
  useDrive, useDriveInvites, useDriveStatus,
  useCreateRound, useUpdateRound, useDeleteRound,
  useInviteStudents, useAutoInvite, useUpdateInvite,
  useTpoStudentDirectory,
  ROUND_TYPES, ROUND_TYPE_LABELS, PIPELINE_STAGES, STAGE_LABELS,
  TRACK_LABELS,
  type RoundBody, type DriveRound,
} from "@/lib/placement-drives-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader, CardSkeleton, EmptyState } from "@/components/page-shell";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Briefcase, Building2, Plus, Pencil, Trash2, Users, CalendarDays, ArrowLeft,
  Layers, UserPlus, Sparkles, MapPin, Video, ShieldCheck, Send,
} from "lucide-react";

const STAGE_BADGE: Record<string, string> = {
  invited: "bg-muted text-muted-foreground border-border",
  shortlisted: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  technical: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30",
  hr: "bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30",
  final: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  offer: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  joined: "bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 border-emerald-600/40",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
  withdrawn: "bg-muted text-muted-foreground border-border",
};

const INVITE_STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  accepted: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  declined: "bg-destructive/15 text-destructive border-destructive/30",
};

interface RoundForm {
  name: string;
  type: string;
  sequence: string;
  durationMinutes: string;
  venue: string;
  meetingUrl: string;
  interviewerName: string;
  capacity: string;
  scheduledAt: string;
}

const EMPTY_ROUND: RoundForm = {
  name: "", type: "technical", sequence: "", durationMinutes: "45",
  venue: "", meetingUrl: "", interviewerName: "", capacity: "", scheduledAt: "",
};

function fmtDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "—" : format(d, "dd MMM yyyy, h:mm a");
}

export default function TpoDriveDetail() {
  const params = useParams();
  const id = Number(params.id);
  const { toast } = useToast();

  const { data: detail, isLoading } = useDrive(id);
  const { data: invitesData, isLoading: invitesLoading } = useDriveInvites(id);
  const { data: directoryData } = useTpoStudentDirectory();

  const statusMut = useDriveStatus(id);
  const createRound = useCreateRound(id);
  const updateRound = useUpdateRound(id);
  const deleteRound = useDeleteRound(id);
  const inviteStudents = useInviteStudents(id);
  const autoInvite = useAutoInvite(id);
  const updateInvite = useUpdateInvite(id);

  const drive = detail?.drive;
  const rounds = detail?.rounds ?? [];
  const counts = detail?.counts;
  const invites = invitesData?.invites ?? [];
  const directory = directoryData?.students ?? [];

  const invitedIds = useMemo(() => new Set(invites.map((i) => i.studentId)), [invites]);
  const availableStudents = useMemo(
    () => directory.filter((s) => !invitedIds.has(s.id)),
    [directory, invitedIds],
  );

  const [roundDialog, setRoundDialog] = useState(false);
  const [editingRound, setEditingRound] = useState<DriveRound | null>(null);
  const [roundForm, setRoundForm] = useState<RoundForm>(EMPTY_ROUND);
  const [deleteRoundTarget, setDeleteRoundTarget] = useState<DriveRound | null>(null);

  const [inviteDialog, setInviteDialog] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<Set<number>>(new Set());
  const [studentSearch, setStudentSearch] = useState("");

  const setRF = <K extends keyof RoundForm>(k: K, v: RoundForm[K]) =>
    setRoundForm((f) => ({ ...f, [k]: v }));

  const openCreateRound = () => {
    setEditingRound(null);
    setRoundForm({ ...EMPTY_ROUND, sequence: String(rounds.length + 1) });
    setRoundDialog(true);
  };

  const openEditRound = (r: DriveRound) => {
    setEditingRound(r);
    setRoundForm({
      name: r.name,
      type: r.type,
      sequence: String(r.sequence),
      durationMinutes: String(r.durationMinutes),
      venue: r.venue ?? "",
      meetingUrl: r.meetingUrl ?? "",
      interviewerName: r.interviewerName ?? "",
      capacity: r.capacity != null ? String(r.capacity) : "",
      scheduledAt: r.scheduledAt ? r.scheduledAt.slice(0, 16) : "",
    });
    setRoundDialog(true);
  };

  const saveRound = () => {
    if (roundForm.name.trim().length < 2) {
      toast({ title: "Round name is required", variant: "destructive" });
      return;
    }
    const body: RoundBody = {
      name: roundForm.name.trim(),
      type: roundForm.type,
      sequence: roundForm.sequence ? Number(roundForm.sequence) : rounds.length + 1,
      durationMinutes: roundForm.durationMinutes ? Number(roundForm.durationMinutes) : 45,
      venue: roundForm.venue.trim() || null,
      meetingUrl: roundForm.meetingUrl.trim() || null,
      interviewerName: roundForm.interviewerName.trim() || null,
      capacity: roundForm.capacity ? Number(roundForm.capacity) : null,
      scheduledAt: roundForm.scheduledAt ? new Date(roundForm.scheduledAt).toISOString() : null,
    };
    const onError = (e: Error) => toast({ title: e.message, variant: "destructive" });
    if (editingRound) {
      updateRound.mutate(
        { roundId: editingRound.id, body },
        {
          onSuccess: () => { toast({ title: "Round updated" }); setRoundDialog(false); },
          onError,
        },
      );
    } else {
      createRound.mutate(body, {
        onSuccess: () => { toast({ title: "Round added" }); setRoundDialog(false); },
        onError,
      });
    }
  };

  const confirmDeleteRound = () => {
    if (!deleteRoundTarget) return;
    deleteRound.mutate(deleteRoundTarget.id, {
      onSuccess: () => { toast({ title: "Round removed" }); setDeleteRoundTarget(null); },
      onError: (e: Error) => { toast({ title: e.message, variant: "destructive" }); setDeleteRoundTarget(null); },
    });
  };

  const openInvite = () => {
    setSelectedStudents(new Set());
    setStudentSearch("");
    setInviteDialog(true);
  };

  const toggleStudent = (sid: number) =>
    setSelectedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(sid)) next.delete(sid); else next.add(sid);
      return next;
    });

  const sendInvites = () => {
    if (selectedStudents.size === 0) {
      toast({ title: "Select at least one student", variant: "destructive" });
      return;
    }
    inviteStudents.mutate(Array.from(selectedStudents), {
      onSuccess: (r) => { toast({ title: `Invited ${r.invited} student(s)` }); setInviteDialog(false); },
      onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
    });
  };

  const runAutoInvite = () => {
    autoInvite.mutate(undefined, {
      onSuccess: (r) =>
        toast({ title: `Auto-invited ${r.invited} of ${r.eligible} eligible student(s)` }),
      onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
    });
  };

  const filteredAvailable = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return availableStudents;
    return availableStudents.filter(
      (s) =>
        (s.fullName ?? "").toLowerCase().includes(q) ||
        (s.email ?? "").toLowerCase().includes(q) ||
        (s.college ?? "").toLowerCase().includes(q),
    );
  }, [availableStudents, studentSearch]);

  if (isLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-4">
        <CardSkeleton rows={2} />
        <CardSkeleton rows={4} />
      </div>
    );
  }

  if (!drive) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <EmptyState
          icon={Briefcase}
          title="Drive not found"
          description="This placement drive does not exist or you do not have access to it."
          action={<Link href="/tpo/drives"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-1.5" /> Back to drives</Button></Link>}
        />
      </div>
    );
  }

  const canPublish = drive.status === "draft";
  const canCancel = drive.status !== "cancelled" && drive.status !== "completed";

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Link href="/tpo/drives">
        <Button variant="ghost" size="sm" className="mb-3 -ml-2 text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-1.5" /> All drives
        </Button>
      </Link>

      <PageHeader
        icon={Building2}
        title={drive.companyName}
        subtitle={drive.role}
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/tpo/drives/${id}/calendar`}>
              <Button variant="outline" size="sm"><CalendarDays className="h-4 w-4 mr-1.5" /> Calendar</Button>
            </Link>
            <Link href={`/tpo/drives/${id}/analytics`}>
              <Button variant="outline" size="sm">Analytics</Button>
            </Link>
            {canPublish && (
              <Button
                size="sm"
                disabled={statusMut.isPending}
                onClick={() =>
                  statusMut.mutate("publish", {
                    onSuccess: () => toast({ title: "Drive published", description: "Students can now be invited." }),
                    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
                  })
                }
              >
                <Send className="h-4 w-4 mr-1.5" /> Publish
              </Button>
            )}
            {canCancel && (
              <Button
                size="sm"
                variant="outline"
                className="text-destructive border-destructive/40"
                disabled={statusMut.isPending}
                onClick={() =>
                  statusMut.mutate("cancel", {
                    onSuccess: () => toast({ title: "Drive cancelled" }),
                    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
                  })
                }
              >
                Cancel Drive
              </Button>
            )}
          </div>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatTile icon={Users} label="Invited" value={counts?.invites ?? 0} />
        <StatTile icon={ShieldCheck} label="Accepted" value={counts?.accepted ?? 0} />
        <StatTile icon={CalendarDays} label="Scheduled" value={counts?.schedules ?? 0} />
        <StatTile icon={Layers} label="Rounds" value={counts?.rounds ?? 0} />
      </div>

      <Card className="mb-6">
        <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <Field label="Status" value={<Badge variant="outline" className="capitalize">{drive.status.replace(/_/g, " ")}</Badge>} />
          <Field label="Mode" value={<span className="capitalize">{drive.mode}</span>} />
          <Field label="Track" value={drive.careerTrack ? (TRACK_LABELS[drive.careerTrack] ?? drive.careerTrack) : "Any"} />
          <Field label="Package" value={drive.packageDetails || "—"} />
          <Field label="Drive date" value={fmtDate(drive.driveDate)} />
          <Field label="Min FTS score" value={drive.minFtsScore != null ? String(drive.minFtsScore) : "—"} />
          <Field
            label="Location"
            value={
              <span className="inline-flex items-center gap-1.5">
                {drive.mode === "remote" ? <Video className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
                {drive.mode === "remote" ? (drive.meetingUrl || "Online") : (drive.venue || "Venue TBD")}
              </span>
            }
          />
          <Field label="Eligibility" value={drive.eligibilityCriteria || "—"} />
        </CardContent>
      </Card>

      {/* Rounds */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-heading font-semibold text-foreground flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" /> Interview Rounds
        </h2>
        <Button size="sm" onClick={openCreateRound}><Plus className="h-4 w-4 mr-1.5" /> Add Round</Button>
      </div>

      {rounds.length === 0 ? (
        <Card className="mb-6"><CardContent className="p-8 text-center text-sm text-muted-foreground">
          No rounds yet. Add rounds (aptitude, technical, HR…) to structure this drive.
        </CardContent></Card>
      ) : (
        <div className="space-y-2 mb-6">
          {rounds.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                    {r.sequence}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-foreground truncate">{r.name}</div>
                    <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2 mt-0.5">
                      <Badge variant="outline">{ROUND_TYPE_LABELS[r.type] ?? r.type}</Badge>
                      <span>{r.durationMinutes} min</span>
                      {r.interviewerName && <span>· {r.interviewerName}</span>}
                      {r.capacity != null && <span>· cap {r.capacity}</span>}
                      {r.scheduledAt && <span>· {fmtDate(r.scheduledAt)}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="icon" variant="ghost" onClick={() => openEditRound(r)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteRoundTarget(r)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Invites */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-heading font-semibold text-foreground flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" /> Invited Students
        </h2>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={runAutoInvite} disabled={autoInvite.isPending}>
            <Sparkles className="h-4 w-4 mr-1.5" /> Auto-invite eligible
          </Button>
          <Button size="sm" onClick={openInvite}><UserPlus className="h-4 w-4 mr-1.5" /> Invite Students</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {invitesLoading ? (
            <div className="p-6"><CardSkeleton rows={3} /></div>
          ) : invites.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No students invited yet. Use auto-invite to add all eligible students.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Student</th>
                    <th className="px-4 py-3 font-medium">College</th>
                    <th className="px-4 py-3 font-medium">FTS</th>
                    <th className="px-4 py-3 font-medium">Response</th>
                    <th className="px-4 py-3 font-medium">Stage</th>
                  </tr>
                </thead>
                <tbody>
                  {invites.map((inv) => (
                    <tr key={inv.id} className="border-b border-border/50 last:border-0">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{inv.student?.fullName ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{inv.student?.email ?? ""}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{inv.college || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{inv.ftsScore}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`capitalize ${INVITE_STATUS_BADGE[inv.status] ?? ""}`}>{inv.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={inv.stage}
                          onValueChange={(v) =>
                            updateInvite.mutate(
                              { inviteId: inv.id, body: { stage: v } },
                              { onError: (e: Error) => toast({ title: e.message, variant: "destructive" }) },
                            )
                          }
                        >
                          <SelectTrigger className={`h-8 w-[150px] capitalize ${STAGE_BADGE[inv.stage] ?? ""}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PIPELINE_STAGES.map((s) => (
                              <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Round dialog */}
      <Dialog open={roundDialog} onOpenChange={setRoundDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRound ? "Edit Round" : "Add Round"}</DialogTitle>
            <DialogDescription>Define a stage of the interview process.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="r-name">Name</Label>
                <Input id="r-name" value={roundForm.name} onChange={(e) => setRF("name", e.target.value)} placeholder="Technical Round 1" />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={roundForm.type} onValueChange={(v) => setRF("type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROUND_TYPES.map((t) => <SelectItem key={t} value={t}>{ROUND_TYPE_LABELS[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="r-seq">Sequence</Label>
                <Input id="r-seq" type="number" min={1} value={roundForm.sequence} onChange={(e) => setRF("sequence", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="r-dur">Duration (min)</Label>
                <Input id="r-dur" type="number" min={5} value={roundForm.durationMinutes} onChange={(e) => setRF("durationMinutes", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="r-cap">Capacity</Label>
                <Input id="r-cap" type="number" min={0} value={roundForm.capacity} onChange={(e) => setRF("capacity", e.target.value)} placeholder="Optional" />
              </div>
            </div>
            <div>
              <Label htmlFor="r-interviewer">Interviewer</Label>
              <Input id="r-interviewer" value={roundForm.interviewerName} onChange={(e) => setRF("interviewerName", e.target.value)} placeholder="Optional" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="r-venue">Venue</Label>
                <Input id="r-venue" value={roundForm.venue} onChange={(e) => setRF("venue", e.target.value)} placeholder="Optional" />
              </div>
              <div>
                <Label htmlFor="r-url">Meeting URL</Label>
                <Input id="r-url" value={roundForm.meetingUrl} onChange={(e) => setRF("meetingUrl", e.target.value)} placeholder="Optional" />
              </div>
            </div>
            <div>
              <Label htmlFor="r-when">Scheduled at</Label>
              <Input id="r-when" type="datetime-local" value={roundForm.scheduledAt} onChange={(e) => setRF("scheduledAt", e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRoundDialog(false)}>Cancel</Button>
            <Button onClick={saveRound} disabled={createRound.isPending || updateRound.isPending}>
              {editingRound ? "Save Changes" : "Add Round"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite dialog */}
      <Dialog open={inviteDialog} onOpenChange={setInviteDialog}>
        <DialogContent className="max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Invite Students</DialogTitle>
            <DialogDescription>Select students to invite to this drive.</DialogDescription>
          </DialogHeader>
          <Input
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            placeholder="Search by name, email or college…"
            className="mb-2"
          />
          <div className="flex-1 overflow-y-auto border border-border rounded-lg divide-y divide-border/60 min-h-[200px] max-h-[45vh]">
            {filteredAvailable.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">No students available to invite.</div>
            ) : (
              filteredAvailable.map((s) => (
                <label key={s.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/50">
                  <Checkbox checked={selectedStudents.has(s.id)} onCheckedChange={() => toggleStudent(s.id)} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground truncate">{s.fullName ?? s.email}</div>
                    <div className="text-xs text-muted-foreground truncate">{s.college || s.email} · FTS {s.ftsScore}</div>
                  </div>
                  {s.careerTrack && <Badge variant="outline" className="shrink-0">{TRACK_LABELS[s.careerTrack] ?? s.careerTrack}</Badge>}
                </label>
              ))
            )}
          </div>
          <DialogFooter className="mt-2">
            <span className="text-sm text-muted-foreground mr-auto self-center">{selectedStudents.size} selected</span>
            <Button variant="ghost" onClick={() => setInviteDialog(false)}>Cancel</Button>
            <Button onClick={sendInvites} disabled={inviteStudents.isPending}>
              <UserPlus className="h-4 w-4 mr-1.5" /> Invite ({selectedStudents.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete round confirm */}
      <AlertDialog open={!!deleteRoundTarget} onOpenChange={(o) => !o && setDeleteRoundTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove round?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes “{deleteRoundTarget?.name}” and any interviews scheduled in it. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteRound} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatTile({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-bold text-foreground leading-none">{value}</div>
          <div className="text-xs text-muted-foreground mt-1">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1 border-b border-border/40 last:border-0 sm:last:border-b">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium text-right">{value}</span>
    </div>
  );
}
