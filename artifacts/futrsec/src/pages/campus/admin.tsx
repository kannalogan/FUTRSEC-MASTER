import { useState } from "react";
import {
  useAdminDrives, useCreateDrive, useUpdateDrive,
  useAdminDriveRegistrations, useSetRegistrationResult,
  TRACK_LABELS, TRACKS,
  type AdminDrive, type CreateDriveBody, type EnrichedRegistration,
} from "@/lib/campus-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { PageHeader, GridSkeleton, EmptyState } from "@/components/page-shell";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Building, Plus, Pencil, Users, CalendarDays, Briefcase, CheckCircle2, XCircle,
} from "lucide-react";

const MODES = [
  { value: "onsite", label: "On-site" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
];
const DRIVE_STATUSES = [
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_VARIANTS: Record<string, "secondary" | "outline" | "destructive"> = {
  open: "secondary",
  closed: "outline",
  completed: "outline",
  cancelled: "destructive",
};

interface FormState {
  name: string;
  companyName: string;
  careerTrack: string;
  eligibleColleges: string;
  eligibleYears: string;
  eligibilityCriteria: string;
  packageDetails: string;
  mode: string;
  deadline: string;
  status: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  companyName: "",
  careerTrack: "soc",
  eligibleColleges: "",
  eligibleYears: "",
  eligibilityCriteria: "",
  packageDetails: "",
  mode: "onsite",
  deadline: "",
  status: "open",
};

function toDateInput(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

function fmtDate(value: string | null): string {
  if (!value) return "No deadline";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "No deadline" : format(d, "dd MMM yyyy");
}

function splitList(v: string): string[] {
  return v.split(",").map((x) => x.trim()).filter((x) => x.length > 0);
}

export default function CampusAdminPage() {
  const { toast } = useToast();
  const [trackFilter, setTrackFilter] = useState<string>("");
  const { data, isLoading } = useAdminDrives(trackFilter || undefined);
  const createMut = useCreateDrive();
  const updateMut = useUpdateDrive();

  const drives = data?.drives ?? [];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminDrive | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [regsDrive, setRegsDrive] = useState<AdminDrive | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (d: AdminDrive) => {
    setEditing(d);
    setForm({
      name: d.name,
      companyName: d.companyName,
      careerTrack: d.careerTrack,
      eligibleColleges: d.eligibleColleges.join(", "),
      eligibleYears: d.eligibleYears.join(", "),
      eligibilityCriteria: d.eligibilityCriteria ?? "",
      packageDetails: d.packageDetails ?? "",
      mode: d.mode || "onsite",
      deadline: toDateInput(d.deadline),
      status: d.status || "open",
    });
    setDialogOpen(true);
  };

  const buildBody = (): CreateDriveBody => ({
    name: form.name.trim(),
    companyName: form.companyName.trim(),
    careerTrack: form.careerTrack,
    eligibleColleges: splitList(form.eligibleColleges),
    eligibleYears: splitList(form.eligibleYears),
    eligibilityCriteria: form.eligibilityCriteria.trim() || null,
    packageDetails: form.packageDetails.trim() || null,
    mode: form.mode,
    deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
    status: form.status,
  });

  const save = () => {
    if (form.name.trim().length < 2) {
      toast({ title: "Drive name is required", variant: "destructive" });
      return;
    }
    if (form.companyName.trim().length < 1) {
      toast({ title: "Company name is required", variant: "destructive" });
      return;
    }
    const body = buildBody();
    if (editing) {
      updateMut.mutate(
        { id: editing.id, body },
        {
          onSuccess: () => { toast({ title: "Drive updated" }); setDialogOpen(false); },
          onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
        },
      );
    } else {
      createMut.mutate(body, {
        onSuccess: () => { toast({ title: "Drive created" }); setDialogOpen(false); },
        onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
      });
    }
  };

  const saving = createMut.isPending || updateMut.isPending;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader
        icon={Building}
        title="Campus Drives"
        subtitle="Create & manage campus placement drives"
        actions={
          <div className="flex items-center gap-2">
            <Select value={trackFilter || "__all__"} onValueChange={(v) => setTrackFilter(v === "__all__" ? "" : v)}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="All tracks" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All tracks</SelectItem>
                {TRACKS.map((t) => <SelectItem key={t} value={t}>{TRACK_LABELS[t]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1.5" /> Create Drive
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <GridSkeleton cols={2} rows={2} />
      ) : drives.length === 0 ? (
        <EmptyState
          icon={Building}
          title="No drives yet"
          description="Create your first campus placement drive."
          action={<Button onClick={openCreate}><Plus className="h-4 w-4 mr-1.5" /> Create Drive</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {drives.map((d) => (
            <Card key={d.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h3 className="font-semibold text-foreground">{d.name}</h3>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5" /> {d.companyName}
                    </div>
                  </div>
                  <Badge variant={STATUS_VARIANTS[d.status] ?? "outline"} className="capitalize shrink-0">
                    {d.status}
                  </Badge>
                </div>

                <div className="space-y-1.5 text-xs text-muted-foreground mt-3">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" /> Deadline: {fmtDate(d.deadline)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" /> {d.registrations} registered
                  </div>
                  {d.packageDetails && (
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5" /> {d.packageDetails}
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <Badge variant="outline">{TRACK_LABELS[d.careerTrack] ?? d.careerTrack}</Badge>
                    <Badge variant="outline" className="capitalize">{d.mode}</Badge>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/60">
                  <Button size="sm" variant="outline" onClick={() => openEdit(d)}>
                    <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setRegsDrive(d)}>
                    <Users className="h-3.5 w-3.5 mr-1.5" /> Registrations
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Drive" : "Create Drive"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update the details of this drive." : "Set up a new campus placement drive."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="d-name">Drive Name</Label>
                <Input id="d-name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Summer 2025 Drive" />
              </div>
              <div>
                <Label htmlFor="d-company">Company</Label>
                <Input id="d-company" value={form.companyName} onChange={(e) => set("companyName", e.target.value)} placeholder="Acme Corp" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Career Track</Label>
                <Select value={form.careerTrack} onValueChange={(v) => set("careerTrack", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRACKS.map((t) => <SelectItem key={t} value={t}>{TRACK_LABELS[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Mode</Label>
                <Select value={form.mode} onValueChange={(v) => set("mode", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MODES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="d-colleges">Eligible Colleges (comma-separated)</Label>
              <Input id="d-colleges" value={form.eligibleColleges} onChange={(e) => set("eligibleColleges", e.target.value)} placeholder="Leave blank for all" />
            </div>
            <div>
              <Label htmlFor="d-years">Eligible Graduation Years (comma-separated)</Label>
              <Input id="d-years" value={form.eligibleYears} onChange={(e) => set("eligibleYears", e.target.value)} placeholder="e.g. 2025, 2026" />
            </div>
            <div>
              <Label htmlFor="d-package">Package Details</Label>
              <Input id="d-package" value={form.packageDetails} onChange={(e) => set("packageDetails", e.target.value)} placeholder="₹8–12 LPA" />
            </div>
            <div>
              <Label htmlFor="d-criteria">Eligibility Criteria</Label>
              <Textarea id="d-criteria" value={form.eligibilityCriteria} onChange={(e) => set("eligibilityCriteria", e.target.value)} rows={2} placeholder="Minimum 60% throughout, no active backlogs…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="d-deadline">Deadline</Label>
                <Input id="d-deadline" type="date" value={form.deadline} onChange={(e) => set("deadline", e.target.value)} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DRIVE_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save Changes" : "Create Drive"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RegistrationsDialog drive={regsDrive} onClose={() => setRegsDrive(null)} />
    </div>
  );
}

const RESULT_STATUSES = [
  { value: "registered", label: "Registered" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "selected", label: "Selected" },
  { value: "rejected", label: "Rejected" },
];

function RegistrationsDialog({
  drive,
  onClose,
}: {
  drive: AdminDrive | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const driveId = drive?.id ?? 0;
  const { data, isLoading } = useAdminDriveRegistrations(driveId, !!drive);
  const resultMut = useSetRegistrationResult();

  const regs = data?.all ?? [];

  const setResult = (
    reg: EnrichedRegistration,
    patch: { status?: string; attended?: boolean },
  ) => {
    resultMut.mutate(
      { driveId, registrationId: reg.id, body: patch },
      {
        onSuccess: () => toast({ title: "Registration updated" }),
        onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
      },
    );
  };

  return (
    <Dialog open={!!drive} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrations — {drive?.name}</DialogTitle>
          <DialogDescription>
            Mark attendance and set selection results for registered students.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <GridSkeleton cols={1} rows={3} />
        ) : regs.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No registrations"
            description="No students have registered for this drive yet."
          />
        ) : (
          <div className="space-y-3 py-1">
            {regs.map((r) => (
              <div
                key={r.id}
                className="rounded-lg border border-border/60 p-3 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-foreground text-sm">
                      {r.student?.fullName ?? `Student #${r.studentId}`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {r.student?.email ?? "—"}
                    </div>
                  </div>
                  <Badge variant="outline" className="capitalize shrink-0">{r.status}</Badge>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={r.status}
                    onValueChange={(v) => setResult(r, { status: v })}
                  >
                    <SelectTrigger className="w-[150px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RESULT_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    size="sm"
                    variant={r.attended ? "secondary" : "outline"}
                    className="h-8"
                    disabled={resultMut.isPending}
                    onClick={() => setResult(r, { attended: !r.attended })}
                  >
                    {r.attended ? (
                      <><CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Attended</>
                    ) : (
                      <><XCircle className="h-3.5 w-3.5 mr-1.5" /> Not attended</>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
