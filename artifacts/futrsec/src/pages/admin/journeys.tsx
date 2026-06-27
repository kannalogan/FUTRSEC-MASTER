import { useState } from "react";
import {
  useJourneys, useJourney, useCreateJourney, useUpdateJourney, useDeleteJourney,
  usePublishJourney, useArchiveJourney,
  useCreateDay, useUpdateDay, useDeleteDay,
  useCreateItem, useUpdateItem, useDeleteItem, useReorderItems,
  JOURNEY_TRACKS, JOURNEY_TRACK_LABELS, JOURNEY_ITEM_TYPES, JOURNEY_ITEM_LABELS,
  ITEM_REQUIRES_REF, ITEM_REF_HINT,
  type Journey, type JourneyDay, type JourneyDayItem, type JourneyItemType,
} from "@/lib/journey-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { PageHeader, CardSkeleton, EmptyState } from "@/components/page-shell";
import { useToast } from "@/hooks/use-toast";
import {
  Map, Plus, Send, Archive, Trash2, CalendarDays, ChevronUp, ChevronDown,
  Layers, Sparkles, Zap,
} from "lucide-react";
import { motion } from "framer-motion";

const STATUS_VARIANT: Record<string, "secondary" | "default" | "outline"> = {
  draft: "secondary",
  published: "default",
  archived: "outline",
};

export default function JourneysBuilderPage() {
  const { toast } = useToast();
  const { data, isLoading } = useJourneys();
  const journeys = data?.journeys ?? [];
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // Fall back to the first journey when nothing is selected OR the selected id
  // no longer exists (e.g. after deleting the selected journey), so the editor
  // never gets stuck on a stale id with no data.
  const selected =
    selectedId != null && journeys.some((j) => j.id === selectedId)
      ? selectedId
      : journeys.length > 0
        ? journeys[0].id
        : null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <PageHeader
        title="Day-Based Journeys"
        subtitle="Build offset-unlocked learning journeys per track. Day 1 unlocks on enrollment."
        icon={Map}
        actions={
          <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> New Journey
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <CardSkeleton rows={4} />
          <div className="lg:col-span-2"><CardSkeleton rows={6} /></div>
        </div>
      ) : journeys.length === 0 ? (
        <EmptyState
          icon={Map}
          title="No journeys yet"
          description="Create your first day-based journey to guide students from beginner to job-ready."
          action={
            <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> New Journey
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-3">
            {journeys.map((j) => (
              <JourneyListCard
                key={j.id}
                journey={j}
                active={j.id === selected}
                onSelect={() => setSelectedId(j.id)}
              />
            ))}
          </div>
          <div className="lg:col-span-2">
            {selected != null ? (
              <JourneyEditor journeyId={selected} />
            ) : (
              <Card><CardContent className="py-16 text-center text-muted-foreground">Select a journey to edit.</CardContent></Card>
            )}
          </div>
        </div>
      )}

      <CreateJourneyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => setSelectedId(id)}
        onError={(m) => toast({ title: m, variant: "destructive" })}
      />
    </div>
  );
}

function JourneyListCard({
  journey, active, onSelect,
}: {
  journey: Journey;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button onClick={onSelect} className="w-full text-left">
      <Card className={`transition-colors ${active ? "border-primary ring-1 ring-primary/30" : "hover:border-border"}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-sm leading-tight">{journey.title}</h3>
            <Badge variant={STATUS_VARIANT[journey.status]} className="shrink-0 capitalize">{journey.status}</Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Layers className="h-3 w-3" /> {JOURNEY_TRACK_LABELS[journey.careerTrack] ?? journey.careerTrack}</span>
            <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {journey.totalDays} day{journey.totalDays === 1 ? "" : "s"}</span>
          </div>
        </CardContent>
      </Card>
    </button>
  );
}

function JourneyEditor({ journeyId }: { journeyId: number }) {
  const { toast } = useToast();
  const { data, isLoading } = useJourney(journeyId);
  const publish = usePublishJourney();
  const archive = useArchiveJourney();
  const del = useDeleteJourney();
  const updateJourney = useUpdateJourney();
  const createDay = useCreateDay(journeyId);
  const [dayOpen, setDayOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (isLoading || !data) return <CardSkeleton rows={6} />;
  const journey = data.journey;
  const days = [...journey.days].sort((a, b) => a.offset - b.offset);
  const editable = journey.status === "draft";

  const fire = (p: Promise<unknown>, ok: string) =>
    p.then(() => toast({ title: ok })).catch((e: Error) => toast({ title: e.message, variant: "destructive" }));

  return (
    <Card>
      <CardContent className="p-5 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-heading font-bold">{journey.title}</h2>
              <Badge variant={STATUS_VARIANT[journey.status]} className="capitalize">{journey.status}</Badge>
            </div>
            {journey.description && <p className="text-sm text-muted-foreground max-w-xl">{journey.description}</p>}
            <p className="text-xs text-muted-foreground mt-1">{JOURNEY_TRACK_LABELS[journey.careerTrack] ?? journey.careerTrack} · {journey.totalDays} days</p>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            {journey.status === "draft" && (
              <Button size="sm" className="gap-1.5" disabled={publish.isPending || days.length === 0}
                onClick={() => fire(publish.mutateAsync(journeyId), "Journey published")}>
                <Send className="h-3.5 w-3.5" /> Publish
              </Button>
            )}
            {journey.status === "published" && (
              <Button size="sm" variant="outline" className="gap-1.5" disabled={archive.isPending}
                onClick={() => fire(archive.mutateAsync(journeyId), "Journey archived")}>
                <Archive className="h-3.5 w-3.5" /> Archive
              </Button>
            )}
            {journey.status === "draft" && (
              <Button size="sm" variant="ghost" className="gap-1.5 text-destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            )}
          </div>
        </div>

        {!editable && (
          <div className="text-xs rounded-lg bg-muted/60 px-3 py-2 text-muted-foreground">
            {journey.status === "published"
              ? "Published journeys are read-only. Archive to stop new enrollments."
              : "Archived journey — read-only."}
          </div>
        )}

        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Days</h3>
          {editable && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setDayOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Add Day
            </Button>
          )}
        </div>

        {days.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No days yet. Add a day to start building the timeline.</p>
        ) : (
          <div className="space-y-3">
            {days.map((day) => (
              <DayCard key={day.id} journeyId={journeyId} day={day} editable={editable} />
            ))}
          </div>
        )}
      </CardContent>

      <DayDialog
        open={dayOpen}
        onOpenChange={setDayOpen}
        nextOffset={days.length === 0 ? 0 : Math.max(...days.map((d) => d.offset)) + 1}
        onSubmit={(body) => fire(createDay.mutateAsync(body), "Day added")}
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this journey?</AlertDialogTitle>
            <AlertDialogDescription>This removes the journey and all its days and items. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => fire(del.mutateAsync(journeyId), "Journey deleted")}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function DayCard({
  journeyId, day, editable,
}: {
  journeyId: number;
  day: JourneyDay;
  editable: boolean;
}) {
  const { toast } = useToast();
  const deleteDay = useDeleteDay(journeyId);
  const reorder = useReorderItems(journeyId);
  const createItem = useCreateItem(journeyId);
  const [itemOpen, setItemOpen] = useState(false);
  const items = [...day.items].sort((a, b) => a.order - b.order);

  const fire = (p: Promise<unknown>, ok: string) =>
    p.then(() => toast({ title: ok })).catch((e: Error) => toast({ title: e.message, variant: "destructive" }));

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...items];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    fire(reorder.mutateAsync({ dayId: day.id, orderedItemIds: next.map((i) => i.id) }), "Reordered");
  };

  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
      <div className="rounded-xl border border-border/60 bg-card/50 p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center h-7 min-w-7 px-2 rounded-lg bg-primary/15 text-primary text-xs font-semibold ring-1 ring-primary/20">
              Day {day.offset + 1}
            </span>
            <span className="font-medium text-sm">{day.title}</span>
          </div>
          {editable && (
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => setItemOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> Item
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                onClick={() => fire(deleteDay.mutateAsync(day.id), "Day removed")}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
        {day.description && <p className="text-xs text-muted-foreground mb-3">{day.description}</p>}

        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">No items. Add courses, labs, assessments, and more.</p>
        ) : (
          <div className="space-y-2">
            {items.map((item, idx) => (
              <ItemRow
                key={item.id}
                journeyId={journeyId}
                item={item}
                editable={editable}
                canUp={idx > 0}
                canDown={idx < items.length - 1}
                onUp={() => move(idx, -1)}
                onDown={() => move(idx, 1)}
              />
            ))}
          </div>
        )}
      </div>

      <ItemDialog
        open={itemOpen}
        onOpenChange={setItemOpen}
        onSubmit={(body) => fire(createItem.mutateAsync({ dayId: day.id, ...body }), "Item added")}
      />
    </motion.div>
  );
}

function ItemRow({
  journeyId, item, editable, canUp, canDown, onUp, onDown,
}: {
  journeyId: number;
  item: JourneyDayItem;
  editable: boolean;
  canUp: boolean;
  canDown: boolean;
  onUp: () => void;
  onDown: () => void;
}) {
  const { toast } = useToast();
  const del = useDeleteItem(journeyId);
  const fire = (p: Promise<unknown>, ok: string) =>
    p.then(() => toast({ title: ok })).catch((e: Error) => toast({ title: e.message, variant: "destructive" }));

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-background px-3 py-2">
      <Badge variant="outline" className="text-[10px] capitalize shrink-0">{JOURNEY_ITEM_LABELS[item.type]}</Badge>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{item.title}</p>
        {item.description && <p className="text-xs text-muted-foreground truncate">{item.description}</p>}
      </div>
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground shrink-0"><Zap className="h-3 w-3" /> {item.xpReward}</span>
      {item.isRequired && <Badge variant="secondary" className="text-[10px] shrink-0">Required</Badge>}
      {editable && (
        <div className="flex items-center gap-0.5 shrink-0">
          <Button size="icon" variant="ghost" className="h-6 w-6" disabled={!canUp} onClick={onUp}><ChevronUp className="h-3.5 w-3.5" /></Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" disabled={!canDown} onClick={onDown}><ChevronDown className="h-3.5 w-3.5" /></Button>
          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => fire(del.mutateAsync(item.id), "Item removed")}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      )}
    </div>
  );
}

// ─── Dialogs ──────────────────────────────────────────────────────────────────
function CreateJourneyDialog({
  open, onOpenChange, onCreated, onError,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (id: number) => void;
  onError: (msg: string) => void;
}) {
  const create = useCreateJourney();
  const [track, setTrack] = useState<string>("soc");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const submit = () => {
    if (!title.trim()) { onError("Title is required"); return; }
    create.mutate(
      { careerTrack: track, title: title.trim(), description: description.trim() || undefined },
      {
        onSuccess: (r) => {
          onOpenChange(false);
          setTitle(""); setDescription("");
          onCreated(r.journey.id);
        },
        onError: (e: Error) => onError(e.message),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Journey</DialogTitle>
          <DialogDescription>Journeys are created as drafts. Add days and items, then publish.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Track</Label>
            <Select value={track} onValueChange={setTrack}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {JOURNEY_TRACKS.map((t) => (
                  <SelectItem key={t} value={t}>{JOURNEY_TRACK_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="SOC Analyst — 90 Day Journey" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this journey covers and who it's for." rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={create.isPending} className="gap-1.5"><Sparkles className="h-4 w-4" /> Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DayDialog({
  open, onOpenChange, nextOffset, onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  nextOffset: number;
  onSubmit: (body: { offset: number; title: string; description?: string }) => Promise<unknown> | void;
}) {
  const [offset, setOffset] = useState(nextOffset);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // keep offset in sync when dialog reopens
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) { setOffset(nextOffset); setTitle(""); setDescription(""); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Day</DialogTitle>
          <DialogDescription>Offset 0 unlocks on enrollment (Day 1). Offset N unlocks N days after a student joins.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Offset (Day {offset + 1})</Label>
            <Input type="number" min={0} value={offset} onChange={(e) => setOffset(Math.max(0, parseInt(e.target.value || "0", 10)))} />
          </div>
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Foundations of SOC operations" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={async () => {
            if (!title.trim()) return;
            await onSubmit({ offset, title: title.trim(), description: description.trim() || undefined });
            onOpenChange(false);
          }}>Add Day</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export interface ItemFormValue {
  type: JourneyItemType;
  refId?: number | null;
  title?: string;
  description?: string;
  isRequired?: boolean;
  xpReward?: number;
}

function ItemDialog({
  open, onOpenChange, onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (body: ItemFormValue) => Promise<unknown> | void;
}) {
  const [type, setType] = useState<JourneyItemType>("course");
  const [refId, setRefId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isRequired, setIsRequired] = useState(true);
  const [xpReward, setXpReward] = useState("50");

  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setType("course"); setRefId(""); setTitle(""); setDescription(""); setIsRequired(true); setXpReward("50");
    }
  }

  const needsRef = ITEM_REQUIRES_REF[type];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Item</DialogTitle>
          <DialogDescription>Items belong to a day. Reference IDs are validated against existing content.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as JourneyItemType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {JOURNEY_ITEM_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{JOURNEY_ITEM_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {needsRef && (
            <div className="space-y-1.5">
              <Label>Reference ID</Label>
              <Input type="number" min={1} value={refId} onChange={(e) => setRefId(e.target.value)} placeholder="e.g. 12" />
              <p className="text-xs text-muted-foreground">{ITEM_REF_HINT[type]}</p>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Title {needsRef && <span className="text-muted-foreground font-normal">(optional — defaults to content title)</span>}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={type === "mentor_review" ? "1:1 Mentor Review" : "Override title"} />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>XP Reward</Label>
              <Input type="number" min={0} value={xpReward} onChange={(e) => setXpReward(e.target.value)} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 px-3">
              <Label className="cursor-pointer">Required</Label>
              <Switch checked={isRequired} onCheckedChange={setIsRequired} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={async () => {
            const refNum = refId.trim() ? parseInt(refId.trim(), 10) : null;
            if (needsRef && (refNum == null || Number.isNaN(refNum))) return;
            if (!needsRef && !title.trim()) return;
            await onSubmit({
              type,
              refId: needsRef ? refNum : undefined,
              title: title.trim() || undefined,
              description: description.trim() || undefined,
              isRequired,
              xpReward: parseInt(xpReward || "0", 10),
            });
            onOpenChange(false);
          }}>Add Item</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
