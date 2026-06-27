import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { PageHeader, CardSkeleton, EmptyState } from "@/components/page-shell";
import { useToast } from "@/hooks/use-toast";
import {
  FlaskConical, Plus, Pencil, Layers, Trash2, Archive, Send,
} from "lucide-react";

const TRACK_LABELS: Record<string, string> = {
  soc: "SOC Analyst",
  vapt: "VAPT Professional",
  grc: "GRC Specialist",
};
const TRACK_COLORS: Record<string, string> = {
  soc: "#2563EB",
  vapt: "#F97316",
  grc: "#10B981",
};

const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;
const LAB_TYPES = ["ctf", "guided", "simulation"] as const;

interface AdminTrack {
  id: number;
  name: string;
  slug: string;
  domain: string;
}
interface TracksResp {
  tracks: AdminTrack[];
}

interface Lab {
  id: number;
  trackId: number;
  title: string;
  slug: string;
  description: string;
  difficulty: string;
  type: string;
  tags: string[];
  totalPoints: number;
  estimatedMinutes: number;
  isActive: boolean;
  trackName: string | null;
  trackSlug: string | null;
  moduleCount: number;
}
interface LabsResp {
  labs: Lab[];
}

interface CommandSpec {
  tool: string;
  toolAliases?: string[];
  requiredFlags?: string[][];
  forbiddenFlags?: string[];
  requiredArgs?: { pattern: string; isRegex?: boolean; label?: string }[];
  intentKeywords?: string[];
  caseSensitive?: boolean;
}
type ValidationType = "flag" | "command";

interface LabModule {
  id: number;
  labId: number;
  title: string;
  order: number;
  taskDescription: string;
  hint: string | null;
  flag: string | null;
  flagFormat: string | null;
  validationType: ValidationType;
  commandSpec: CommandSpec | null;
  solutionExplanation: string | null;
  points: number;
}
interface LabDetailResp {
  lab: Lab;
  modules: LabModule[];
}

const ALL = "__all__";

function trackDomainBadge(slug: string | null, name: string | null) {
  const domain = slug ? slug.split("-")[0] : "";
  const color = TRACK_COLORS[domain];
  if (!color) {
    return <span className="text-muted-foreground text-sm">{name ?? "—"}</span>;
  }
  return (
    <Badge style={{ backgroundColor: `${color}20`, color }} className="border-0">
      {TRACK_LABELS[domain] ?? name ?? domain}
    </Badge>
  );
}

interface LabFormState {
  trackId: string;
  title: string;
  slug: string;
  description: string;
  difficulty: string;
  type: string;
  tags: string;
  totalPoints: string;
  estimatedMinutes: string;
}
const EMPTY_LAB_FORM: LabFormState = {
  trackId: "",
  title: "",
  slug: "",
  description: "",
  difficulty: "beginner",
  type: "ctf",
  tags: "",
  totalPoints: "",
  estimatedMinutes: "",
};

interface ModuleFormState {
  title: string;
  order: string;
  taskDescription: string;
  hint: string;
  flag: string;
  flagFormat: string;
  solutionExplanation: string;
  points: string;
  validationType: ValidationType;
  csTool: string;
  csToolAliases: string;
  csRequiredFlags: string;
  csForbiddenFlags: string;
  csRequiredArgs: string;
  csIntentKeywords: string;
  csCaseSensitive: boolean;
}
const EMPTY_MODULE_FORM: ModuleFormState = {
  title: "",
  order: "",
  taskDescription: "",
  hint: "",
  flag: "",
  flagFormat: "",
  solutionExplanation: "",
  points: "",
  validationType: "flag",
  csTool: "",
  csToolAliases: "",
  csRequiredFlags: "",
  csForbiddenFlags: "",
  csRequiredArgs: "",
  csIntentKeywords: "",
  csCaseSensitive: false,
};

const moduleLinesOf = (s: string): string[] =>
  s.split("\n").map((l) => l.trim()).filter(Boolean);
const moduleTokensOf = (s: string): string[] =>
  s.split(/[,\s]+/).map((t) => t.trim()).filter(Boolean);

function buildModuleCommandSpec(f: ModuleFormState): CommandSpec {
  const spec: CommandSpec = { tool: f.csTool.trim() };
  const aliases = moduleTokensOf(f.csToolAliases);
  if (aliases.length) spec.toolAliases = aliases;
  const requiredFlags = moduleLinesOf(f.csRequiredFlags).map((line) => moduleTokensOf(line));
  if (requiredFlags.length) spec.requiredFlags = requiredFlags;
  const forbidden = moduleTokensOf(f.csForbiddenFlags);
  if (forbidden.length) spec.forbiddenFlags = forbidden;
  const requiredArgs = moduleLinesOf(f.csRequiredArgs).map((line) =>
    line.toLowerCase().startsWith("regex:")
      ? { pattern: line.slice(6).trim(), isRegex: true }
      : { pattern: line, isRegex: false },
  );
  if (requiredArgs.length) spec.requiredArgs = requiredArgs;
  const intent = moduleLinesOf(f.csIntentKeywords);
  if (intent.length) spec.intentKeywords = intent;
  if (f.csCaseSensitive) spec.caseSensitive = true;
  return spec;
}

function decodeModuleCommandSpec(spec: CommandSpec | null): Partial<ModuleFormState> {
  if (!spec) return {};
  return {
    csTool: spec.tool ?? "",
    csToolAliases: (spec.toolAliases ?? []).join(", "),
    csRequiredFlags: (spec.requiredFlags ?? []).map((g) => g.join(" ")).join("\n"),
    csForbiddenFlags: (spec.forbiddenFlags ?? []).join(", "),
    csRequiredArgs: (spec.requiredArgs ?? [])
      .map((a) => (a.isRegex ? `regex:${a.pattern}` : a.pattern))
      .join("\n"),
    csIntentKeywords: (spec.intentKeywords ?? []).join("\n"),
    csCaseSensitive: spec.caseSensitive ?? false,
  };
}

export default function AdminLabsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [trackFilter, setTrackFilter] = useState<string>(ALL);

  const { data: tracksData } = useQuery({
    queryKey: ["/api/admin/tracks"],
    queryFn: () => apiFetch<TracksResp>("/api/admin/tracks"),
  });
  const tracks = tracksData?.tracks ?? [];

  const params = new URLSearchParams();
  if (trackFilter !== ALL) params.set("track", trackFilter);
  const qs = params.toString();
  const listPath = `/api/admin/labs${qs ? `?${qs}` : ""}`;

  const { data, isLoading } = useQuery({
    queryKey: [listPath],
    queryFn: () => apiFetch<LabsResp>(listPath),
  });
  const labs = data?.labs ?? [];

  const invalidateList = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/labs"] });
    queryClient.invalidateQueries({ queryKey: [listPath] });
  };

  // ---- Create / edit lab ----
  const [labDialogOpen, setLabDialogOpen] = useState(false);
  const [editingLab, setEditingLab] = useState<Lab | null>(null);
  const [labForm, setLabForm] = useState<LabFormState>(EMPTY_LAB_FORM);

  const setLF = <K extends keyof LabFormState>(k: K, v: LabFormState[K]) =>
    setLabForm((f) => ({ ...f, [k]: v }));

  const openCreateLab = () => {
    setEditingLab(null);
    setLabForm({ ...EMPTY_LAB_FORM, trackId: tracks[0] ? String(tracks[0].id) : "" });
    setLabDialogOpen(true);
  };
  const openEditLab = (l: Lab) => {
    setEditingLab(l);
    setLabForm({
      trackId: String(l.trackId),
      title: l.title,
      slug: l.slug,
      description: l.description,
      difficulty: l.difficulty,
      type: l.type,
      tags: (l.tags ?? []).join(", "),
      totalPoints: String(l.totalPoints),
      estimatedMinutes: String(l.estimatedMinutes),
    });
    setLabDialogOpen(true);
  };

  const createLab = useMutation({
    mutationFn: (vars: Record<string, unknown>) =>
      apiFetch("/api/admin/labs", { method: "POST", body: JSON.stringify(vars) }),
    onSuccess: () => {
      invalidateList();
      toast({ title: "Lab created" });
      setLabDialogOpen(false);
    },
    onError: (e: Error) =>
      toast({
        title: /slug/i.test(e.message) ? "Slug already exists" : e.message,
        variant: "destructive",
      }),
  });

  const updateLab = useMutation({
    mutationFn: (vars: { id: number; body: Record<string, unknown> }) =>
      apiFetch(`/api/admin/labs/${vars.id}`, { method: "PATCH", body: JSON.stringify(vars.body) }),
    onSuccess: () => {
      invalidateList();
      toast({ title: "Lab updated" });
      setLabDialogOpen(false);
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const parseTags = (raw: string): string[] | undefined => {
    const arr = raw.split(",").map((t) => t.trim()).filter(Boolean);
    return arr.length ? arr : undefined;
  };

  const saveLab = () => {
    if (!labForm.trackId) {
      toast({ title: "Select a track", variant: "destructive" });
      return;
    }
    if (labForm.title.trim().length < 1) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    if (labForm.description.trim().length < 1) {
      toast({ title: "Description is required", variant: "destructive" });
      return;
    }
    if (editingLab) {
      updateLab.mutate({
        id: editingLab.id,
        body: {
          title: labForm.title.trim(),
          description: labForm.description.trim(),
          difficulty: labForm.difficulty,
          type: labForm.type,
          tags: parseTags(labForm.tags) ?? [],
          totalPoints: labForm.totalPoints ? Number(labForm.totalPoints) : undefined,
          estimatedMinutes: labForm.estimatedMinutes ? Number(labForm.estimatedMinutes) : undefined,
        },
      });
    } else {
      if (!/^[a-z0-9-]+$/.test(labForm.slug.trim())) {
        toast({ title: "Slug must be lowercase alphanumeric with hyphens", variant: "destructive" });
        return;
      }
      createLab.mutate({
        trackId: Number(labForm.trackId),
        title: labForm.title.trim(),
        slug: labForm.slug.trim(),
        description: labForm.description.trim(),
        difficulty: labForm.difficulty,
        type: labForm.type,
        tags: parseTags(labForm.tags),
        totalPoints: labForm.totalPoints ? Number(labForm.totalPoints) : undefined,
        estimatedMinutes: labForm.estimatedMinutes ? Number(labForm.estimatedMinutes) : undefined,
      });
    }
  };

  // ---- Publish / archive ----
  const togglePublish = useMutation({
    mutationFn: (vars: { id: number; publish: boolean }) =>
      apiFetch(`/api/admin/labs/${vars.id}/${vars.publish ? "publish" : "archive"}`, { method: "POST" }),
    onSuccess: (_d, vars) => {
      invalidateList();
      toast({ title: vars.publish ? "Lab published" : "Lab archived" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  // ---- Manage modules ----
  const [modulesLab, setModulesLab] = useState<Lab | null>(null);
  const detailPath = modulesLab ? `/api/admin/labs/${modulesLab.id}` : null;
  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: [detailPath ?? "lab-detail-none"],
    queryFn: () => apiFetch<LabDetailResp>(detailPath as string),
    enabled: !!detailPath,
  });
  const modules = detail?.modules ?? [];

  const invalidateDetail = () => {
    if (detailPath) queryClient.invalidateQueries({ queryKey: [detailPath] });
    invalidateList();
  };

  const [editingModule, setEditingModule] = useState<LabModule | null>(null);
  const [moduleForm, setModuleForm] = useState<ModuleFormState>(EMPTY_MODULE_FORM);
  const [moduleFormOpen, setModuleFormOpen] = useState(false);

  const setMF = <K extends keyof ModuleFormState>(k: K, v: ModuleFormState[K]) =>
    setModuleForm((f) => ({ ...f, [k]: v }));

  const openAddModule = () => {
    setEditingModule(null);
    setModuleForm({ ...EMPTY_MODULE_FORM, order: String(modules.length) });
    setModuleFormOpen(true);
  };
  const openEditModule = (m: LabModule) => {
    setEditingModule(m);
    setModuleForm({
      ...EMPTY_MODULE_FORM,
      title: m.title,
      order: String(m.order),
      taskDescription: m.taskDescription,
      hint: m.hint ?? "",
      flag: m.flag ?? "",
      flagFormat: m.flagFormat ?? "",
      solutionExplanation: m.solutionExplanation ?? "",
      points: String(m.points),
      validationType: m.validationType ?? "flag",
      ...decodeModuleCommandSpec(m.commandSpec),
    });
    setModuleFormOpen(true);
  };

  const createModule = useMutation({
    mutationFn: (vars: { labId: number; body: Record<string, unknown> }) =>
      apiFetch(`/api/admin/labs/${vars.labId}/modules`, { method: "POST", body: JSON.stringify(vars.body) }),
    onSuccess: () => {
      invalidateDetail();
      toast({ title: "Module added" });
      setModuleFormOpen(false);
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });
  const updateModule = useMutation({
    mutationFn: (vars: { moduleId: number; body: Record<string, unknown> }) =>
      apiFetch(`/api/admin/lab-modules/${vars.moduleId}`, { method: "PATCH", body: JSON.stringify(vars.body) }),
    onSuccess: () => {
      invalidateDetail();
      toast({ title: "Module updated" });
      setModuleFormOpen(false);
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });
  const deleteModule = useMutation({
    mutationFn: (moduleId: number) =>
      apiFetch(`/api/admin/lab-modules/${moduleId}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidateDetail();
      toast({ title: "Module deleted" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const saveModule = () => {
    if (moduleForm.title.trim().length < 1) {
      toast({ title: "Module title is required", variant: "destructive" });
      return;
    }
    if (moduleForm.taskDescription.trim().length < 1) {
      toast({ title: "Task description is required", variant: "destructive" });
      return;
    }
    let commandSpec: CommandSpec | null = null;
    if (moduleForm.validationType === "command") {
      if (!moduleForm.csTool.trim()) {
        toast({ title: "Command modules need a base tool (e.g. nmap)", variant: "destructive" });
        return;
      }
      commandSpec = buildModuleCommandSpec(moduleForm);
    }
    const body = {
      title: moduleForm.title.trim(),
      order: moduleForm.order ? Number(moduleForm.order) : 0,
      taskDescription: moduleForm.taskDescription.trim(),
      hint: moduleForm.hint.trim() || undefined,
      flag: moduleForm.validationType === "flag" ? (moduleForm.flag.trim() || undefined) : undefined,
      flagFormat: moduleForm.validationType === "flag" ? (moduleForm.flagFormat.trim() || undefined) : undefined,
      validationType: moduleForm.validationType,
      commandSpec,
      solutionExplanation: moduleForm.solutionExplanation.trim() || undefined,
      points: moduleForm.points ? Number(moduleForm.points) : undefined,
    };
    if (editingModule) {
      updateModule.mutate({ moduleId: editingModule.id, body });
    } else if (modulesLab) {
      createModule.mutate({ labId: modulesLab.id, body });
    }
  };

  return (
    <div>
      <PageHeader
        icon={FlaskConical}
        title="Lab CMS"
        subtitle="Create and manage hands-on labs, their modules, flags and scoring."
        actions={
          <Button onClick={openCreateLab}>
            <Plus className="h-4 w-4 mr-1.5" /> New Lab
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="w-56">
          <Select value={trackFilter} onValueChange={setTrackFilter}>
            <SelectTrigger><SelectValue placeholder="All tracks" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All tracks</SelectItem>
              {tracks.map((t) => (
                <SelectItem key={t.id} value={t.slug}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <CardSkeleton rows={6} />
      ) : labs.length === 0 ? (
        <EmptyState
          icon={FlaskConical}
          title="No labs yet"
          description="Create your first lab to give students hands-on practice."
          action={<Button onClick={openCreateLab}><Plus className="h-4 w-4 mr-1.5" /> New Lab</Button>}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Track</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Modules</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {labs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.title}</TableCell>
                    <TableCell>{trackDomainBadge(l.trackSlug, l.trackName)}</TableCell>
                    <TableCell className="text-muted-foreground capitalize">{l.type}</TableCell>
                    <TableCell className="text-muted-foreground">{l.totalPoints}</TableCell>
                    <TableCell className="text-muted-foreground">{l.moduleCount}</TableCell>
                    <TableCell>
                      <Badge variant={l.isActive ? "secondary" : "outline"}>
                        {l.isActive ? "Active" : "Archived"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => openEditLab(l)}>
                          <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => togglePublish.mutate({ id: l.id, publish: !l.isActive })}
                          disabled={togglePublish.isPending}
                        >
                          {l.isActive ? (
                            <><Archive className="h-3.5 w-3.5 mr-1" /> Archive</>
                          ) : (
                            <><Send className="h-3.5 w-3.5 mr-1" /> Publish</>
                          )}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setModulesLab(l)}>
                          <Layers className="h-3.5 w-3.5 mr-1" /> Modules
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create / edit lab dialog */}
      <Dialog open={labDialogOpen} onOpenChange={setLabDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLab ? "Edit Lab" : "New Lab"}</DialogTitle>
            <DialogDescription>
              {editingLab ? "Update this lab's details." : "Create a new hands-on lab within a track."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label>Track</Label>
              <Select
                value={labForm.trackId}
                onValueChange={(v) => setLF("trackId", v)}
                disabled={!!editingLab}
              >
                <SelectTrigger><SelectValue placeholder="Select a track" /></SelectTrigger>
                <SelectContent>
                  {tracks.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="lab-title">Title</Label>
              <Input
                id="lab-title"
                value={labForm.title}
                onChange={(e) => setLF("title", e.target.value)}
                placeholder="Web Exploitation 101"
              />
            </div>
            <div>
              <Label htmlFor="lab-slug">Slug</Label>
              <Input
                id="lab-slug"
                value={labForm.slug}
                onChange={(e) => setLF("slug", e.target.value)}
                placeholder="web-exploitation-101"
                disabled={!!editingLab}
                className="font-mono"
              />
            </div>
            <div>
              <Label htmlFor="lab-desc">Description</Label>
              <Textarea
                id="lab-desc"
                value={labForm.description}
                onChange={(e) => setLF("description", e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Difficulty</Label>
                <Select value={labForm.difficulty} onValueChange={(v) => setLF("difficulty", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIFFICULTIES.map((d) => (
                      <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type</Label>
                <Select value={labForm.type} onValueChange={(v) => setLF("type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LAB_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="lab-tags">Tags (comma separated)</Label>
              <Input
                id="lab-tags"
                value={labForm.tags}
                onChange={(e) => setLF("tags", e.target.value)}
                placeholder="xss, sqli, web"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="lab-points">Total Points</Label>
                <Input
                  id="lab-points"
                  type="number"
                  min={0}
                  value={labForm.totalPoints}
                  onChange={(e) => setLF("totalPoints", e.target.value)}
                  placeholder="100"
                />
              </div>
              <div>
                <Label htmlFor="lab-mins">Estimated Minutes</Label>
                <Input
                  id="lab-mins"
                  type="number"
                  min={0}
                  value={labForm.estimatedMinutes}
                  onChange={(e) => setLF("estimatedMinutes", e.target.value)}
                  placeholder="60"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setLabDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveLab} disabled={createLab.isPending || updateLab.isPending}>
              {createLab.isPending || updateLab.isPending
                ? "Saving…"
                : editingLab ? "Save Changes" : "Create Lab"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage modules dialog */}
      <Dialog open={!!modulesLab} onOpenChange={(open) => { if (!open) { setModulesLab(null); setModuleFormOpen(false); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Modules</DialogTitle>
            <DialogDescription>{modulesLab?.title}</DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <div className="flex justify-end mb-3">
              <Button size="sm" onClick={openAddModule}>
                <Plus className="h-4 w-4 mr-1.5" /> Add Module
              </Button>
            </div>

            {detailLoading ? (
              <CardSkeleton rows={4} />
            ) : modules.length === 0 ? (
              <EmptyState
                icon={Layers}
                title="No modules yet"
                description="Add modules with flags and scoring to build out this lab."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Flag</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modules.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-muted-foreground">{m.order}</TableCell>
                      <TableCell className="font-medium">{m.title}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {m.flag ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{m.points}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" variant="outline" onClick={() => openEditModule(m)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteModule.mutate(m.id)}
                            disabled={deleteModule.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {moduleFormOpen && (
              <div className="mt-5 border rounded-lg p-4 space-y-4">
                <h4 className="text-sm font-semibold">
                  {editingModule ? "Edit Module" : "New Module"}
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label htmlFor="mod-title">Title</Label>
                    <Input
                      id="mod-title"
                      value={moduleForm.title}
                      onChange={(e) => setMF("title", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="mod-order">Order</Label>
                    <Input
                      id="mod-order"
                      type="number"
                      min={0}
                      value={moduleForm.order}
                      onChange={(e) => setMF("order", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="mod-points">Points</Label>
                    <Input
                      id="mod-points"
                      type="number"
                      min={0}
                      value={moduleForm.points}
                      onChange={(e) => setMF("points", e.target.value)}
                      placeholder="10"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="mod-task">Task Description</Label>
                    <Textarea
                      id="mod-task"
                      value={moduleForm.taskDescription}
                      onChange={(e) => setMF("taskDescription", e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="mod-hint">Hint</Label>
                    <Textarea
                      id="mod-hint"
                      value={moduleForm.hint}
                      onChange={(e) => setMF("hint", e.target.value)}
                      rows={2}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="mod-valtype">Validation Type</Label>
                    <Select
                      value={moduleForm.validationType}
                      onValueChange={(v) => setMF("validationType", v as ValidationType)}
                    >
                      <SelectTrigger id="mod-valtype"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="flag">Flag submission (exact match)</SelectItem>
                        <SelectItem value="command">Command objective (parser-based)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {moduleForm.validationType === "flag"
                        ? "Student submits a flag string that must match exactly."
                        : "Student submits a command; it is validated by tool, flags, args and intent — not exact text."}
                    </p>
                  </div>
                  {moduleForm.validationType === "flag" ? (
                    <>
                      <div>
                        <Label htmlFor="mod-flag">Flag</Label>
                        <Input
                          id="mod-flag"
                          value={moduleForm.flag}
                          onChange={(e) => setMF("flag", e.target.value)}
                          placeholder="FLAG{...}"
                          className="font-mono"
                        />
                      </div>
                      <div>
                        <Label htmlFor="mod-flagfmt">Flag Format</Label>
                        <Input
                          id="mod-flagfmt"
                          value={moduleForm.flagFormat}
                          onChange={(e) => setMF("flagFormat", e.target.value)}
                          placeholder="FLAG{...}"
                          className="font-mono"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="col-span-2 space-y-3 rounded-md border bg-muted/30 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Command Spec
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="cs-tool">Base Tool</Label>
                          <Input
                            id="cs-tool"
                            value={moduleForm.csTool}
                            onChange={(e) => setMF("csTool", e.target.value)}
                            placeholder="nmap"
                            className="font-mono"
                          />
                        </div>
                        <div>
                          <Label htmlFor="cs-aliases">Tool Aliases</Label>
                          <Input
                            id="cs-aliases"
                            value={moduleForm.csToolAliases}
                            onChange={(e) => setMF("csToolAliases", e.target.value)}
                            placeholder="nmap.exe, /usr/bin/nmap"
                            className="font-mono"
                          />
                          <p className="text-muted-foreground mt-1 text-xs">Comma or space separated.</p>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="cs-reqflags">Required Flags</Label>
                        <Textarea
                          id="cs-reqflags"
                          value={moduleForm.csRequiredFlags}
                          onChange={(e) => setMF("csRequiredFlags", e.target.value)}
                          rows={2}
                          placeholder={"-sV\n-p 80,443"}
                          className="font-mono"
                        />
                        <p className="text-muted-foreground mt-1 text-xs">
                          One requirement per line. Within a line, list alternatives (any one satisfies it), e.g. <code>-sV -A</code>.
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="cs-forbidflags">Forbidden Flags</Label>
                        <Input
                          id="cs-forbidflags"
                          value={moduleForm.csForbiddenFlags}
                          onChange={(e) => setMF("csForbiddenFlags", e.target.value)}
                          placeholder="-T5, --aggressive"
                          className="font-mono"
                        />
                        <p className="text-muted-foreground mt-1 text-xs">Comma or space separated.</p>
                      </div>
                      <div>
                        <Label htmlFor="cs-reqargs">Required Args / Targets</Label>
                        <Textarea
                          id="cs-reqargs"
                          value={moduleForm.csRequiredArgs}
                          onChange={(e) => setMF("csRequiredArgs", e.target.value)}
                          rows={2}
                          placeholder={"10.0.0.5\nregex:^10\\.0\\.0\\.\\d+$"}
                          className="font-mono"
                        />
                        <p className="text-muted-foreground mt-1 text-xs">
                          One per line. Prefix with <code>regex:</code> for a pattern; otherwise an exact token match.
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="cs-intent">Intent Keywords</Label>
                        <Textarea
                          id="cs-intent"
                          value={moduleForm.csIntentKeywords}
                          onChange={(e) => setMF("csIntentKeywords", e.target.value)}
                          rows={2}
                          placeholder={"scan\nversion"}
                          className="font-mono"
                        />
                        <p className="text-muted-foreground mt-1 text-xs">
                          One per line. Each must appear somewhere in the submitted command.
                        </p>
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={moduleForm.csCaseSensitive}
                          onChange={(e) => setMF("csCaseSensitive", e.target.checked)}
                          className="h-4 w-4"
                        />
                        Case sensitive matching
                      </label>
                    </div>
                  )}
                  <div className="col-span-2">
                    <Label htmlFor="mod-sol">Solution Explanation</Label>
                    <Textarea
                      id="mod-sol"
                      value={moduleForm.solutionExplanation}
                      onChange={(e) => setMF("solutionExplanation", e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setModuleFormOpen(false)}>Cancel</Button>
                  <Button
                    size="sm"
                    onClick={saveModule}
                    disabled={createModule.isPending || updateModule.isPending}
                  >
                    {createModule.isPending || updateModule.isPending
                      ? "Saving…"
                      : editingModule ? "Save Module" : "Add Module"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
