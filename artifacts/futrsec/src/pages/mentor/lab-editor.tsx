import { useState, useEffect } from "react";
import { Link, useParams } from "wouter";
import {
  useLabBuilderLab, useLabAssignments, useLabVersions, useLabAnalytics,
  useUpdateLab, usePublishLab, useArchiveLab,
  useCreateModule, useUpdateModule, useDeleteModule,
  useCreateHint, useDeleteHint,
  useCreateAsset, useDeleteAsset,
  useCreateAssignment, useDeleteAssignment, useRestoreVersion,
  useTrackOptions,
  LB_DIFFICULTIES, LB_TYPES, LB_ASSET_KINDS,
  type LabModule, type LabAsset, type LabVersionRef, type LabAssignment, type LabAnalytics,
} from "@/lib/lab-builder-api";
import { useMentorStudents } from "@/lib/mentor-api";
import { exportToCSV } from "@/lib/export-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";
import {
  ArrowLeft, FlaskConical, Save, Rocket, Archive, Plus, Trash2, Pencil,
  Lightbulb, Paperclip, Send, History, BarChart3, Download, ExternalLink,
  RotateCcw, X, Target, Clock, Users, CheckCircle2,
} from "lucide-react";

const STATUS_META: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground border-border" },
  published: { label: "Published", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
  archived: { label: "Archived", className: "bg-muted/50 text-muted-foreground/70 border-border/50" },
};
const PIE_COLORS = ["#2563EB", "#F97316", "#10B981", "#8B5CF6"];

export default function MentorLabEditorPage() {
  const params = useParams();
  const labId = Number(params.id);
  const { toast } = useToast();

  const { data, isLoading } = useLabBuilderLab(Number.isNaN(labId) ? null : labId);

  if (Number.isNaN(labId)) {
    return <div className="p-8 text-muted-foreground">Invalid lab id.</div>;
  }

  return (
    <div className="p-5 lg:p-8 max-w-6xl mx-auto">
      <Link href="/mentor/lab-builder" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
        <ArrowLeft className="h-4 w-4" />Back to Lab Builder
      </Link>

      {isLoading || !data ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-2/3" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <Editor labId={labId} data={data} toast={toast} />
      )}
    </div>
  );
}

type EditorData = NonNullable<ReturnType<typeof useLabBuilderLab>["data"]>;
type ToastFn = ReturnType<typeof useToast>["toast"];

function Editor({ labId, data, toast }: { labId: number; data: EditorData; toast: ToastFn }) {
  const { lab, modules, assets, versions } = data;
  const publishMut = usePublishLab();
  const archiveMut = useArchiveLab();

  const handlePublish = async () => {
    try {
      await publishMut.mutateAsync(labId);
      toast({ title: "Published", description: "This lab is now live." });
    } catch (e) {
      toast({ title: "Publish failed", description: (e as Error).message, variant: "destructive" });
    }
  };
  const handleArchive = async () => {
    try {
      await archiveMut.mutateAsync(labId);
      toast({ title: "Archived", description: "This lab was archived." });
    } catch (e) {
      toast({ title: "Archive failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <>
      <PageHeader
        icon={FlaskConical}
        title={lab.title}
        subtitle={`${lab.slug} · version ${lab.version}`}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={STATUS_META[lab.status]?.className}>{STATUS_META[lab.status]?.label ?? lab.status}</Badge>
            {lab.status !== "published" && (
              <Button size="sm" onClick={handlePublish} disabled={publishMut.isPending}>
                <Rocket className="h-4 w-4 mr-1.5" />Publish
              </Button>
            )}
            {lab.status !== "archived" && (
              <Button size="sm" variant="outline" onClick={handleArchive} disabled={archiveMut.isPending}>
                <Archive className="h-4 w-4 mr-1.5" />Archive
              </Button>
            )}
          </div>
        }
      />

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="mb-6 flex-wrap h-auto">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="modules">Modules ({modules.length})</TabsTrigger>
          <TabsTrigger value="assets">Assets ({assets.length})</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="versions">Versions ({versions.length})</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="details"><DetailsTab labId={labId} data={data} toast={toast} /></TabsContent>
        <TabsContent value="modules"><ModulesTab labId={labId} modules={modules} toast={toast} /></TabsContent>
        <TabsContent value="assets"><AssetsTab labId={labId} assets={assets} toast={toast} /></TabsContent>
        <TabsContent value="assignments"><AssignmentsTab labId={labId} toast={toast} /></TabsContent>
        <TabsContent value="versions"><VersionsTab labId={labId} versions={versions} currentVersion={lab.version} toast={toast} /></TabsContent>
        <TabsContent value="analytics"><AnalyticsTab labId={labId} title={lab.title} /></TabsContent>
      </Tabs>
    </>
  );
}

// ─── Details ──────────────────────────────────────────────────────────────────
function DetailsTab({ labId, data, toast }: { labId: number; data: EditorData; toast: ToastFn }) {
  const { lab } = data;
  const { data: tracks } = useTrackOptions();
  const updateMut = useUpdateLab(labId);

  const [form, setForm] = useState({
    title: lab.title, description: lab.description,
    trackId: lab.trackId ? String(lab.trackId) : "none",
    difficulty: lab.difficulty, type: lab.type,
    tags: lab.tags.join(", "),
    estimatedMinutes: String(lab.estimatedMinutes),
    totalPoints: String(lab.totalPoints),
    objectives: lab.learningObjectives.join("\n"),
    walkthrough: lab.walkthrough ?? "",
  });

  useEffect(() => {
    setForm({
      title: lab.title, description: lab.description,
      trackId: lab.trackId ? String(lab.trackId) : "none",
      difficulty: lab.difficulty, type: lab.type,
      tags: lab.tags.join(", "),
      estimatedMinutes: String(lab.estimatedMinutes),
      totalPoints: String(lab.totalPoints),
      objectives: lab.learningObjectives.join("\n"),
      walkthrough: lab.walkthrough ?? "",
    });
  }, [lab]);

  const handleSave = async () => {
    try {
      await updateMut.mutateAsync({
        title: form.title.trim(),
        description: form.description.trim(),
        trackId: form.trackId === "none" ? null : Number(form.trackId),
        difficulty: form.difficulty,
        type: form.type,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        estimatedMinutes: Number(form.estimatedMinutes) || 0,
        totalPoints: Number(form.totalPoints) || 0,
        learningObjectives: form.objectives.split("\n").map((s) => s.trim()).filter(Boolean),
        walkthrough: form.walkthrough.trim() || null,
      });
      toast({ title: "Saved", description: "Lab details updated." });
    } catch (e) {
      toast({ title: "Save failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <Card className="glass-card">
      <CardContent className="p-6 space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="d-title">Title</Label>
          <Input id="d-title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Slug</Label>
          <Input value={lab.slug} disabled className="text-muted-foreground" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="d-desc">Description</Label>
          <Textarea id="d-desc" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Track</Label>
            <Select value={form.trackId} onValueChange={(v) => setForm((f) => ({ ...f, trackId: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No track</SelectItem>
                {(tracks ?? []).map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Difficulty</Label>
            <Select value={form.difficulty} onValueChange={(v) => setForm((f) => ({ ...f, difficulty: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LB_DIFFICULTIES.map((d) => <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LB_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="d-mins">Est. minutes</Label>
            <Input id="d-mins" type="number" min={0} value={form.estimatedMinutes} onChange={(e) => setForm((f) => ({ ...f, estimatedMinutes: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="d-points">Total points</Label>
            <Input id="d-points" type="number" min={0} value={form.totalPoints} onChange={(e) => setForm((f) => ({ ...f, totalPoints: e.target.value }))} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="d-tags">Tags (comma separated)</Label>
          <Input id="d-tags" value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} placeholder="phishing, soc, triage" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="d-obj">Learning objectives (one per line)</Label>
          <Textarea id="d-obj" rows={4} value={form.objectives} onChange={(e) => setForm((f) => ({ ...f, objectives: e.target.value }))} placeholder={"Identify phishing indicators\nExtract IOCs from headers"} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="d-walk">Walkthrough (mentor solution)</Label>
          <Textarea id="d-walk" rows={5} value={form.walkthrough} onChange={(e) => setForm((f) => ({ ...f, walkthrough: e.target.value }))} />
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={updateMut.isPending}><Save className="h-4 w-4 mr-1.5" />Save details</Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Modules ──────────────────────────────────────────────────────────────────
const emptyModule = { title: "", order: 0, taskDescription: "", hint: "", flag: "", flagFormat: "", solutionExplanation: "", walkthrough: "", points: "10" };

function ModulesTab({ labId, modules, toast }: { labId: number; modules: LabModule[]; toast: ToastFn }) {
  const createMut = useCreateModule(labId);
  const updateMut = useUpdateModule(labId);
  const deleteMut = useDeleteModule(labId);
  const createHint = useCreateHint(labId);
  const deleteHint = useDeleteHint(labId);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<LabModule | null>(null);
  const [deleteFor, setDeleteFor] = useState<LabModule | null>(null);
  const [form, setForm] = useState({ ...emptyModule });
  const [hintInputs, setHintInputs] = useState<Record<number, { content: string; penalty: string }>>({});

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyModule, order: modules.length });
    setEditorOpen(true);
  };
  const openEdit = (m: LabModule) => {
    setEditing(m);
    setForm({
      title: m.title, order: m.order, taskDescription: m.taskDescription,
      hint: m.hint ?? "", flag: m.flag ?? "", flagFormat: m.flagFormat ?? "",
      solutionExplanation: m.solutionExplanation ?? "", walkthrough: m.walkthrough ?? "",
      points: String(m.points),
    });
    setEditorOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.taskDescription.trim()) {
      toast({ title: "Missing fields", description: "Title and task description are required.", variant: "destructive" });
      return;
    }
    const body = {
      title: form.title.trim(),
      order: Number(form.order) || 0,
      taskDescription: form.taskDescription.trim(),
      hint: form.hint.trim() || undefined,
      flag: form.flag.trim() || undefined,
      flagFormat: form.flagFormat.trim() || undefined,
      solutionExplanation: form.solutionExplanation.trim() || undefined,
      walkthrough: form.walkthrough.trim() || undefined,
      points: Number(form.points) || 0,
    };
    try {
      if (editing) await updateMut.mutateAsync({ moduleId: editing.id, body });
      else await createMut.mutateAsync(body);
      toast({ title: editing ? "Module updated" : "Module added" });
      setEditorOpen(false);
    } catch (e) {
      toast({ title: "Save failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteFor) return;
    try {
      await deleteMut.mutateAsync(deleteFor.id);
      toast({ title: "Module deleted" });
      setDeleteFor(null);
    } catch (e) {
      toast({ title: "Delete failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  const addHint = async (moduleId: number) => {
    const input = hintInputs[moduleId];
    if (!input?.content.trim()) return;
    try {
      await createHint.mutateAsync({ moduleId, body: { content: input.content.trim(), penaltyPoints: Number(input.penalty) || 0 } });
      setHintInputs((s) => ({ ...s, [moduleId]: { content: "", penalty: "" } }));
    } catch (e) {
      toast({ title: "Add hint failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1.5" />Add module</Button>
      </div>

      {modules.length === 0 ? (
        <Card className="glass-card"><CardContent className="p-10 text-center text-muted-foreground">No modules yet. Add your first module to build out the lab.</CardContent></Card>
      ) : (
        modules.map((m) => (
          <Card key={m.id} className="glass-card">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="shrink-0">#{m.order}</Badge>
                    <h3 className="font-semibold text-foreground truncate">{m.title}</h3>
                    <Badge variant="outline" className="shrink-0">{m.points} pts</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{m.taskDescription}</p>
                  {m.flag && <p className="text-xs text-muted-foreground mt-1.5">Flag: <code className="text-foreground bg-muted px-1.5 py-0.5 rounded">{m.flag}</code></p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(m)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteFor(m)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>

              <Separator />

              <div>
                <div className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />Hints
                </div>
                <div className="space-y-2">
                  {m.hints.length === 0 && <p className="text-xs text-muted-foreground">No hints yet.</p>}
                  {m.hints.map((h) => (
                    <div key={h.id} className="flex items-center gap-2 text-sm bg-muted/50 rounded-md px-3 py-2">
                      <Badge variant="outline" className="shrink-0">#{h.order}</Badge>
                      <span className="flex-1 text-foreground">{h.content}</span>
                      {h.penaltyPoints > 0 && <span className="text-xs text-muted-foreground shrink-0">-{h.penaltyPoints} pts</span>}
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => deleteHint.mutate(h.id)}><X className="h-3.5 w-3.5" /></Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-2.5">
                  <Input
                    placeholder="New hint content"
                    value={hintInputs[m.id]?.content ?? ""}
                    onChange={(e) => setHintInputs((s) => ({ ...s, [m.id]: { content: e.target.value, penalty: s[m.id]?.penalty ?? "" } }))}
                  />
                  <Input
                    type="number" min={0} placeholder="Penalty" className="w-28"
                    value={hintInputs[m.id]?.penalty ?? ""}
                    onChange={(e) => setHintInputs((s) => ({ ...s, [m.id]: { content: s[m.id]?.content ?? "", penalty: e.target.value } }))}
                  />
                  <Button variant="outline" onClick={() => addHint(m.id)} disabled={createHint.isPending}><Plus className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit module" : "Add module"}</DialogTitle>
            <DialogDescription>Define the task, flag and solution for this module.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="m-title">Title</Label>
                <Input id="m-title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="m-order">Order</Label>
                <Input id="m-order" type="number" min={0} value={form.order} onChange={(e) => setForm((f) => ({ ...f, order: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-task">Task description</Label>
              <Textarea id="m-task" rows={3} value={form.taskDescription} onChange={(e) => setForm((f) => ({ ...f, taskDescription: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="m-flag">Flag</Label>
                <Input id="m-flag" value={form.flag} onChange={(e) => setForm((f) => ({ ...f, flag: e.target.value }))} placeholder="FLAG{...}" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="m-format">Flag format</Label>
                <Input id="m-format" value={form.flagFormat} onChange={(e) => setForm((f) => ({ ...f, flagFormat: e.target.value }))} placeholder="FLAG{...}" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-points">Points</Label>
              <Input id="m-points" type="number" min={0} value={form.points} onChange={(e) => setForm((f) => ({ ...f, points: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-sol">Solution explanation</Label>
              <Textarea id="m-sol" rows={3} value={form.solutionExplanation} onChange={(e) => setForm((f) => ({ ...f, solutionExplanation: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-walk">Walkthrough</Label>
              <Textarea id="m-walk" rows={3} value={form.walkthrough} onChange={(e) => setForm((f) => ({ ...f, walkthrough: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>{editing ? "Save" : "Add module"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteFor} onOpenChange={(o) => { if (!o) setDeleteFor(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this module?</AlertDialogTitle>
            <AlertDialogDescription>"{deleteFor?.title}" and its hints will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteMut.isPending}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Assets ───────────────────────────────────────────────────────────────────
function AssetsTab({ labId, assets, toast }: { labId: number; assets: LabAsset[]; toast: ToastFn }) {
  const createMut = useCreateAsset(labId);
  const deleteMut = useDeleteAsset(labId);
  const [form, setForm] = useState({ kind: "pdf", title: "", url: "" });

  const handleAdd = async () => {
    if (!form.title.trim() || !form.url.trim()) {
      toast({ title: "Missing fields", description: "Title and URL are required.", variant: "destructive" });
      return;
    }
    try {
      await createMut.mutateAsync({ kind: form.kind, title: form.title.trim(), url: form.url.trim() });
      toast({ title: "Asset added" });
      setForm({ kind: form.kind, title: "", url: "" });
    } catch (e) {
      toast({ title: "Add failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <Card className="glass-card">
        <CardContent className="p-5 flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="space-y-1.5 sm:w-40">
            <Label>Kind</Label>
            <Select value={form.kind} onValueChange={(v) => setForm((f) => ({ ...f, kind: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LB_ASSET_KINDS.map((k) => <SelectItem key={k} value={k} className="capitalize">{k}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 flex-1">
            <Label htmlFor="a-title">Title</Label>
            <Input id="a-title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="space-y-1.5 flex-1">
            <Label htmlFor="a-url">URL</Label>
            <Input id="a-url" value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://..." />
          </div>
          <Button onClick={handleAdd} disabled={createMut.isPending}><Plus className="h-4 w-4 mr-1.5" />Add</Button>
        </CardContent>
      </Card>

      {assets.length === 0 ? (
        <Card className="glass-card"><CardContent className="p-10 text-center text-muted-foreground">No assets yet. Add reference materials by URL.</CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {assets.map((a) => (
            <Card key={a.id} className="glass-card">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <Paperclip className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground truncate">{a.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="capitalize text-[10px]">{a.kind}</Badge>
                    <a href={a.url} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1 truncate hover:underline">
                      Open <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => deleteMut.mutate(a.id)}><Trash2 className="h-4 w-4" /></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Assignments ──────────────────────────────────────────────────────────────
function AssignmentsTab({ labId, toast }: { labId: number; toast: ToastFn }) {
  const { data, isLoading } = useLabAssignments(labId);
  const { data: tracks } = useTrackOptions();
  const { data: studentsData } = useMentorStudents();
  const createMut = useCreateAssignment(labId);
  const deleteMut = useDeleteAssignment(labId);

  const [form, setForm] = useState({ audienceType: "student", studentId: "", trackId: "", dueAt: "", note: "" });

  const students = studentsData?.students ?? [];
  const assignments = data?.assignments ?? [];

  const handleAssign = async () => {
    const body: { audienceType: string; studentId?: number; trackId?: number; dueAt?: string; note?: string } = {
      audienceType: form.audienceType,
    };
    if (form.audienceType === "student") {
      if (!form.studentId) { toast({ title: "Select a student", variant: "destructive" }); return; }
      body.studentId = Number(form.studentId);
    }
    if (form.audienceType === "track") {
      if (!form.trackId) { toast({ title: "Select a track", variant: "destructive" }); return; }
      body.trackId = Number(form.trackId);
    }
    if (form.dueAt) body.dueAt = new Date(form.dueAt).toISOString();
    if (form.note.trim()) body.note = form.note.trim();
    try {
      const r = await createMut.mutateAsync(body);
      toast({ title: "Assigned", description: `${r.notified} student(s) notified.` });
      setForm({ audienceType: form.audienceType, studentId: "", trackId: "", dueAt: "", note: "" });
    } catch (e) {
      toast({ title: "Assign failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  const audienceLabel = (a: LabAssignment) => {
    if (a.audienceType === "student") return a.studentName ?? a.studentEmail ?? `Student #${a.studentId}`;
    if (a.audienceType === "track") return `Track: ${a.trackName ?? a.trackId}`;
    if (a.audienceType === "cohort") return "Entire cohort";
    return a.audienceType;
  };

  return (
    <div className="space-y-4">
      <Card className="glass-card">
        <CardHeader><CardTitle className="text-card-title flex items-center gap-2"><Send className="h-5 w-5 text-primary" />Assign lab</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Audience</Label>
              <Select value={form.audienceType} onValueChange={(v) => setForm((f) => ({ ...f, audienceType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Single student</SelectItem>
                  <SelectItem value="track">Career track</SelectItem>
                  <SelectItem value="cohort">Entire cohort</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.audienceType === "student" && (
              <div className="space-y-1.5">
                <Label>Student</Label>
                <Select value={form.studentId} onValueChange={(v) => setForm((f) => ({ ...f, studentId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                  <SelectContent>
                    {students.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.fullName ?? s.email ?? `#${s.id}`}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {form.audienceType === "track" && (
              <div className="space-y-1.5">
                <Label>Track</Label>
                <Select value={form.trackId} onValueChange={(v) => setForm((f) => ({ ...f, trackId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select track" /></SelectTrigger>
                  <SelectContent>
                    {(tracks ?? []).map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="as-due">Due date (optional)</Label>
              <Input id="as-due" type="datetime-local" value={form.dueAt} onChange={(e) => setForm((f) => ({ ...f, dueAt: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="as-note">Note (optional)</Label>
              <Input id="as-note" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleAssign} disabled={createMut.isPending}><Send className="h-4 w-4 mr-1.5" />Assign</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader><CardTitle className="text-card-title">Current assignments</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No assignments yet.</p>
          ) : (
            <div className="space-y-2">
              {assignments.map((a) => (
                <div key={a.id} className="flex items-center gap-3 bg-muted/40 rounded-lg px-4 py-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0"><Users className="h-4 w-4" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate">{audienceLabel(a)}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.dueAt ? `Due ${new Date(a.dueAt).toLocaleDateString()}` : "No due date"}
                      {a.note ? ` · ${a.note}` : ""}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => deleteMut.mutate(a.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Versions ─────────────────────────────────────────────────────────────────
function VersionsTab({ labId, versions, currentVersion, toast }: { labId: number; versions: LabVersionRef[]; currentVersion: number; toast: ToastFn }) {
  const { data } = useLabVersions(labId);
  const restoreMut = useRestoreVersion(labId);
  const [restoreFor, setRestoreFor] = useState<LabVersionRef | null>(null);
  const list = data?.versions ?? versions;

  const handleRestore = async () => {
    if (!restoreFor) return;
    try {
      await restoreMut.mutateAsync(restoreFor.version);
      toast({ title: "Restored", description: `Lab restored from v${restoreFor.version}.` });
      setRestoreFor(null);
    } catch (e) {
      toast({ title: "Restore failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader><CardTitle className="text-card-title flex items-center gap-2"><History className="h-5 w-5 text-primary" />Version history</CardTitle></CardHeader>
      <CardContent>
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No snapshots yet. Publishing a lab creates a version snapshot.</p>
        ) : (
          <div className="space-y-2">
            {list.map((v) => (
              <div key={v.id} className="flex items-center gap-3 bg-muted/40 rounded-lg px-4 py-3">
                <Badge variant="outline" className="shrink-0">v{v.version}</Badge>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground truncate">{v.note ?? "Snapshot"}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(v.createdAt).toLocaleString()}{v.createdByName ? ` · ${v.createdByName}` : ""}
                  </p>
                </div>
                {v.version !== currentVersion && (
                  <Button variant="outline" size="sm" className="shrink-0" onClick={() => setRestoreFor(v)}>
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />Restore
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!restoreFor} onOpenChange={(o) => { if (!o) setRestoreFor(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore v{restoreFor?.version}?</AlertDialogTitle>
            <AlertDialogDescription>
              This replaces the current lab content (modules and hints) with the snapshot from v{restoreFor?.version} and creates a new version.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} disabled={restoreMut.isPending}>Restore</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// ─── Analytics ────────────────────────────────────────────────────────────────
function AnStat({ icon: Icon, label, value, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; tone: string }) {
  return (
    <Card className="glass-card">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${tone}`}><Icon className="h-5 w-5" /></div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
          <p className="text-sm text-muted-foreground mt-1 truncate">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function AnalyticsTab({ labId, title }: { labId: number; title: string }) {
  const { data, isLoading } = useLabAnalytics(labId);

  if (isLoading || !data) {
    return <div className="grid sm:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;
  }

  const a: LabAnalytics = data;
  const moduleChart = a.moduleStats.map((m) => ({ name: m.title.length > 16 ? `${m.title.slice(0, 16)}…` : m.title, solved: m.solvedBy }));
  const pieData = a.difficultyDistribution.filter((d) => d.count > 0).map((d) => ({ name: d.label, value: d.count }));

  const exportTop = () => {
    exportToCSV(
      `lab-${labId}-top-students`,
      [
        { key: "studentId", label: "Student ID" },
        { key: "fullName", label: "Name" },
        { key: "email", label: "Email" },
        { key: "score", label: "Best Score" },
        { key: "completed", label: "Completed", format: (r) => (r.completed ? "Yes" : "No") },
      ],
      a.topStudents
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <AnStat icon={Users} label="Assigned" value={a.assigned} tone="bg-primary/15 text-primary" />
        <AnStat icon={Rocket} label="Started" value={a.started} tone="bg-blue-500/15 text-blue-600" />
        <AnStat icon={CheckCircle2} label="Completed" value={a.completed} tone="bg-emerald-500/15 text-emerald-600" />
        <AnStat icon={Target} label="Completion Rate" value={`${a.completionRate}%`} tone="bg-amber-500/15 text-amber-600" />
        <AnStat icon={Clock} label="Avg Time (min)" value={a.avgTimeMinutes} tone="bg-violet-500/15 text-violet-600" />
        <AnStat icon={RotateCcw} label="Retries / Failures" value={`${a.retryCount} / ${a.failureCount}`} tone="bg-rose-500/15 text-rose-600" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader><CardTitle className="text-card-title flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" />Module completions</CardTitle></CardHeader>
          <CardContent>
            {moduleChart.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No modules to chart.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={moduleChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--foreground)" }} />
                  <Bar dataKey="solved" fill="#2563EB" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader><CardTitle className="text-card-title flex items-center gap-2"><Target className="h-5 w-5 text-primary" />Score distribution</CardTitle></CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No attempts yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--foreground)" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-card-title flex items-center gap-2"><Users className="h-5 w-5 text-primary" />Top students</CardTitle>
          <Button variant="outline" size="sm" onClick={exportTop} disabled={a.topStudents.length === 0}>
            <Download className="h-4 w-4 mr-1.5" />Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          {a.topStudents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No attempts recorded for "{title}" yet.</p>
          ) : (
            <div className="space-y-2">
              {a.topStudents.map((s, i) => (
                <div key={s.studentId} className="flex items-center gap-3 bg-muted/40 rounded-lg px-4 py-2.5">
                  <span className="text-sm font-bold text-muted-foreground w-6 shrink-0">#{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate">{s.fullName ?? s.email ?? `Student #${s.studentId}`}</p>
                  </div>
                  {s.completed && <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 shrink-0">Completed</Badge>}
                  <span className="font-bold text-foreground shrink-0">{s.score} pts</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
