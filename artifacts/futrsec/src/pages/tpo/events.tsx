import { useState } from "react";
import {
  useTpoEvents, useCreateEvent, useUpdateEvent, useDeleteEvent,
  TRACK_LABELS, TRACKS, type TpoEvent, type CreateEventBody,
} from "@/lib/tpo-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  CalendarDays, Plus, Pencil, Trash2, Users, MapPin, Video,
} from "lucide-react";

const EVENT_TYPES = [
  { value: "placement_drive", label: "Placement Drive" },
  { value: "workshop", label: "Workshop" },
  { value: "webinar", label: "Webinar" },
  { value: "info_session", label: "Info Session" },
  { value: "interview", label: "Interview" },
];
const STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "cancelled", label: "Cancelled" },
];
const NO_TRACK = "__none__";

const STATUS_VARIANTS: Record<string, "secondary" | "outline" | "destructive"> = {
  published: "secondary",
  draft: "outline",
  cancelled: "destructive",
};

interface FormState {
  title: string;
  description: string;
  type: string;
  location: string;
  isOnline: boolean;
  meetingUrl: string;
  careerTrack: string;
  startsAt: string;
  endsAt: string;
  maxAttendees: string;
  status: string;
}

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  type: "placement_drive",
  location: "",
  isOnline: false,
  meetingUrl: "",
  careerTrack: NO_TRACK,
  startsAt: "",
  endsAt: "",
  maxAttendees: "",
  status: "draft",
};

function toDatetimeLocal(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}

function fmtDate(value: string | null): string {
  if (!value) return "No date set";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "No date set" : format(d, "dd MMM yyyy, h:mm a");
}

export default function TpoEvents() {
  const { toast } = useToast();
  const { data, isLoading } = useTpoEvents();
  const createMut = useCreateEvent();
  const updateMut = useUpdateEvent();
  const deleteMut = useDeleteEvent();

  const events = data?.events ?? [];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TpoEvent | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<TpoEvent | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (ev: TpoEvent) => {
    setEditing(ev);
    setForm({
      title: ev.title,
      description: ev.description ?? "",
      type: ev.type || "placement_drive",
      location: ev.location ?? "",
      isOnline: ev.isOnline,
      meetingUrl: ev.meetingUrl ?? "",
      careerTrack: ev.careerTrack ?? NO_TRACK,
      startsAt: toDatetimeLocal(ev.startsAt),
      endsAt: toDatetimeLocal(ev.endsAt),
      maxAttendees: ev.maxAttendees != null ? String(ev.maxAttendees) : "",
      status: ev.status || "draft",
    });
    setDialogOpen(true);
  };

  const buildBody = (): CreateEventBody => ({
    title: form.title.trim(),
    description: form.description.trim() || undefined,
    type: form.type,
    location: form.location.trim() || undefined,
    isOnline: form.isOnline,
    meetingUrl: form.meetingUrl.trim() || undefined,
    careerTrack: form.careerTrack === NO_TRACK ? null : form.careerTrack,
    startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
    endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
    maxAttendees: form.maxAttendees ? Number(form.maxAttendees) : null,
    status: form.status,
  });

  const save = () => {
    if (form.title.trim().length < 2) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    const body = buildBody();
    if (editing) {
      updateMut.mutate(
        { id: editing.id, body },
        {
          onSuccess: () => {
            toast({ title: "Event updated" });
            setDialogOpen(false);
          },
          onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
        },
      );
    } else {
      createMut.mutate(body, {
        onSuccess: () => {
          toast({ title: "Event created" });
          setDialogOpen(false);
        },
        onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
      });
    }
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteMut.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast({ title: "Event deleted" });
        setDeleteTarget(null);
      },
      onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
    });
  };

  const saving = createMut.isPending || updateMut.isPending;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader
        icon={CalendarDays}
        title="Events"
        subtitle="Manage placement drives, workshops and webinars."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" /> Create Event
          </Button>
        }
      />

      {isLoading ? (
        <GridSkeleton cols={2} rows={2} />
      ) : events.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No events yet"
          description="Create your first event to engage students."
          action={<Button onClick={openCreate}><Plus className="h-4 w-4 mr-1.5" /> Create Event</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {events.map((ev) => (
            <Card key={ev.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h3 className="font-semibold text-foreground">{ev.title}</h3>
                    <div className="text-xs text-muted-foreground mt-0.5 capitalize">{ev.type.replace(/_/g, " ")}</div>
                  </div>
                  <Badge variant={STATUS_VARIANTS[ev.status] ?? "outline"} className="capitalize shrink-0">
                    {ev.status}
                  </Badge>
                </div>

                {ev.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{ev.description}</p>
                )}

                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" /> {fmtDate(ev.startsAt)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {ev.isOnline ? <Video className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
                    {ev.isOnline ? "Online" : ev.location || "—"}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" /> {ev.registrations} registered
                    {ev.maxAttendees != null && ` / ${ev.maxAttendees}`}
                  </div>
                  {ev.careerTrack && (
                    <Badge variant="outline" className="mt-1">{TRACK_LABELS[ev.careerTrack] ?? ev.careerTrack}</Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/60">
                  <Button size="sm" variant="outline" onClick={() => openEdit(ev)}>
                    <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(ev)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
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
            <DialogTitle>{editing ? "Edit Event" : "Create Event"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update the details of this event." : "Set up a new event for your students."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="ev-title">Title</Label>
              <Input id="ev-title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Campus placement drive" />
            </div>
            <div>
              <Label htmlFor="ev-desc">Description</Label>
              <Textarea id="ev-desc" value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => set("type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
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
            <div className="flex items-center gap-3">
              <Switch id="ev-online" checked={form.isOnline} onCheckedChange={(v) => set("isOnline", v)} />
              <Label htmlFor="ev-online">Online event</Label>
            </div>
            {form.isOnline ? (
              <div>
                <Label htmlFor="ev-url">Meeting URL</Label>
                <Input id="ev-url" value={form.meetingUrl} onChange={(e) => set("meetingUrl", e.target.value)} placeholder="https://meet.google.com/…" />
              </div>
            ) : (
              <div>
                <Label htmlFor="ev-loc">Location</Label>
                <Input id="ev-loc" value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Auditorium, Block A" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ev-start">Starts At</Label>
                <Input id="ev-start" type="datetime-local" value={form.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="ev-end">Ends At</Label>
                <Input id="ev-end" type="datetime-local" value={form.endsAt} onChange={(e) => set("endsAt", e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="ev-max">Max Attendees</Label>
              <Input id="ev-max" type="number" min={0} value={form.maxAttendees} onChange={(e) => set("maxAttendees", e.target.value)} placeholder="Unlimited" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save Changes" : "Create Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Event</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.title}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteMut.isPending}>
              {deleteMut.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
