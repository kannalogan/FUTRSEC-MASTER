import { useState } from "react";
import { Link } from "wouter";
import {
  useDrives, useCreateDrive,
  DRIVE_MODES, TRACKS, TRACK_LABELS,
  type DriveBody,
} from "@/lib/placement-drives-api";
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
  Briefcase, Plus, MapPin, Video, Users, CalendarDays, ArrowRight, Building2,
} from "lucide-react";

const NO_TRACK = "__none__";

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  published: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  in_progress: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  completed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
};

const MODE_LABELS: Record<string, string> = {
  onsite: "Onsite", remote: "Remote", hybrid: "Hybrid",
};

interface FormState {
  companyName: string;
  role: string;
  careerTrack: string;
  packageDetails: string;
  mode: string;
  venue: string;
  meetingUrl: string;
  eligibilityCriteria: string;
  minFtsScore: string;
  driveDate: string;
}

const EMPTY_FORM: FormState = {
  companyName: "",
  role: "",
  careerTrack: NO_TRACK,
  packageDetails: "",
  mode: "onsite",
  venue: "",
  meetingUrl: "",
  eligibilityCriteria: "",
  minFtsScore: "",
  driveDate: "",
};

function fmtDate(value: string | null): string {
  if (!value) return "No date set";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "No date set" : format(d, "dd MMM yyyy, h:mm a");
}

export default function TpoDrives() {
  const { toast } = useToast();
  const { data, isLoading } = useDrives();
  const createMut = useCreateDrive();

  const drives = data?.drives ?? [];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const save = () => {
    if (form.companyName.trim().length < 2) {
      toast({ title: "Company name is required", variant: "destructive" });
      return;
    }
    if (form.role.trim().length < 2) {
      toast({ title: "Role is required", variant: "destructive" });
      return;
    }
    const body: DriveBody = {
      companyName: form.companyName.trim(),
      role: form.role.trim(),
      careerTrack: form.careerTrack === NO_TRACK ? null : form.careerTrack,
      packageDetails: form.packageDetails.trim() || null,
      mode: form.mode,
      venue: form.venue.trim() || null,
      meetingUrl: form.meetingUrl.trim() || null,
      eligibilityCriteria: form.eligibilityCriteria.trim() || null,
      minFtsScore: form.minFtsScore ? Number(form.minFtsScore) : null,
      driveDate: form.driveDate ? new Date(form.driveDate).toISOString() : null,
    };
    createMut.mutate(body, {
      onSuccess: () => {
        toast({ title: "Drive created", description: "Saved as draft." });
        setDialogOpen(false);
      },
      onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
    });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader
        icon={Briefcase}
        title="Placement Drives"
        subtitle="Create and coordinate company drives, rounds and interviews."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" /> New Drive
          </Button>
        }
      />

      {isLoading ? (
        <GridSkeleton cols={2} rows={2} />
      ) : drives.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No placement drives yet"
          description="Create your first drive to start inviting students and scheduling interviews."
          action={<Button onClick={openCreate}><Plus className="h-4 w-4 mr-1.5" /> New Drive</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {drives.map((d) => (
            <Card key={d.id} className="flex flex-col">
              <CardContent className="p-5 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate">{d.companyName}</span>
                    </h3>
                    <div className="text-sm text-muted-foreground mt-0.5 truncate">{d.role}</div>
                  </div>
                  <Badge variant="outline" className={`capitalize shrink-0 ${STATUS_BADGE[d.status] ?? ""}`}>
                    {d.status.replace(/_/g, " ")}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  <Badge variant="outline">{MODE_LABELS[d.mode] ?? d.mode}</Badge>
                  {d.careerTrack && <Badge variant="outline">{TRACK_LABELS[d.careerTrack] ?? d.careerTrack}</Badge>}
                  {d.packageDetails && <Badge variant="outline">{d.packageDetails}</Badge>}
                </div>

                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" /> {fmtDate(d.driveDate)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {d.mode === "remote" ? <Video className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
                    {d.mode === "remote" ? (d.meetingUrl ? "Online" : "Online") : d.venue || "Venue TBD"}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {d.invites} invited</span>
                    <span className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" /> {d.rounds} rounds</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/60">
                  <Link href={`/tpo/drives/${d.id}`}>
                    <Button size="sm" variant="outline">
                      Manage <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                    </Button>
                  </Link>
                  <Link href={`/tpo/drives/${d.id}/calendar`}>
                    <Button size="sm" variant="ghost">
                      <CalendarDays className="h-3.5 w-3.5 mr-1.5" /> Calendar
                    </Button>
                  </Link>
                  <Link href={`/tpo/drives/${d.id}/analytics`}>
                    <Button size="sm" variant="ghost">Analytics</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Placement Drive</DialogTitle>
            <DialogDescription>Create a drive draft. You can add rounds and invite students next.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="d-company">Company Name</Label>
                <Input id="d-company" value={form.companyName} onChange={(e) => set("companyName", e.target.value)} placeholder="Acme Corp" />
              </div>
              <div>
                <Label htmlFor="d-role">Role</Label>
                <Input id="d-role" value={form.role} onChange={(e) => set("role", e.target.value)} placeholder="Security Analyst" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Career Track</Label>
                <Select value={form.careerTrack} onValueChange={(v) => set("careerTrack", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_TRACK}>None</SelectItem>
                    {TRACKS.map((t) => <SelectItem key={t} value={t}>{TRACK_LABELS[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Mode</Label>
                <Select value={form.mode} onValueChange={(v) => set("mode", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DRIVE_MODES.map((m) => <SelectItem key={m} value={m}>{MODE_LABELS[m]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="d-package">Package Details</Label>
                <Input id="d-package" value={form.packageDetails} onChange={(e) => set("packageDetails", e.target.value)} placeholder="₹8-12 LPA" />
              </div>
              <div>
                <Label htmlFor="d-fts">Min FTS Score</Label>
                <Input id="d-fts" type="number" min={0} max={100} value={form.minFtsScore} onChange={(e) => set("minFtsScore", e.target.value)} placeholder="e.g. 60" />
              </div>
            </div>
            {form.mode === "remote" ? (
              <div>
                <Label htmlFor="d-url">Meeting URL</Label>
                <Input id="d-url" value={form.meetingUrl} onChange={(e) => set("meetingUrl", e.target.value)} placeholder="https://meet.google.com/…" />
              </div>
            ) : (
              <div>
                <Label htmlFor="d-venue">Venue</Label>
                <Input id="d-venue" value={form.venue} onChange={(e) => set("venue", e.target.value)} placeholder="Auditorium, Block A" />
              </div>
            )}
            <div>
              <Label htmlFor="d-elig">Eligibility Criteria</Label>
              <Textarea id="d-elig" value={form.eligibilityCriteria} onChange={(e) => set("eligibilityCriteria", e.target.value)} rows={2} placeholder="CGPA 7+, no active backlogs…" />
            </div>
            <div>
              <Label htmlFor="d-date">Drive Date</Label>
              <Input id="d-date" type="datetime-local" value={form.driveDate} onChange={(e) => set("driveDate", e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={createMut.isPending}>
              {createMut.isPending ? "Creating…" : "Create Drive"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
