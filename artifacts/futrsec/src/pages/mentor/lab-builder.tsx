import { useState } from "react";
import { Link } from "wouter";
import {
  useLabBuilderLabs,
  useLabOverviewAnalytics,
  useCreateLab,
  useCloneLab,
  usePublishLab,
  useArchiveLab,
  useTrackOptions,
  LB_DIFFICULTIES,
  LB_TYPES,
  type LabListItem,
} from "@/lib/lab-builder-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader, GridSkeleton, EmptyState } from "@/components/page-shell";
import { useToast } from "@/hooks/use-toast";
import {
  FlaskConical, Plus, MoreHorizontal, Pencil, Copy, Rocket, Archive,
  Layers, Send, ClipboardList, Target, Clock,
} from "lucide-react";
import { motion } from "framer-motion";

const STATUS_META: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground border-border" },
  published: { label: "Published", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
  archived: { label: "Archived", className: "bg-muted/50 text-muted-foreground/70 border-border/50" },
};
const DIFF_COLOR: Record<string, string> = {
  beginner: "text-emerald-600", intermediate: "text-blue-600", advanced: "text-amber-600",
};

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100);
}

function KpiCard({ icon: Icon, label, value, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; tone: string }) {
  return (
    <Card className="glass-card overflow-hidden">
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

export default function MentorLabBuilderPage() {
  const { toast } = useToast();
  const { data, isLoading } = useLabBuilderLabs();
  const { data: overview } = useLabOverviewAnalytics();
  const { data: tracks } = useTrackOptions();

  const createMut = useCreateLab();
  const cloneMut = useCloneLab();
  const publishMut = usePublishLab();
  const archiveMut = useArchiveLab();

  const [statusFilter, setStatusFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [archiveFor, setArchiveFor] = useState<LabListItem | null>(null);

  const [form, setForm] = useState({
    title: "", slug: "", description: "", trackId: "none",
    difficulty: "beginner", type: "ctf", estimatedMinutes: "60",
  });
  const [slugTouched, setSlugTouched] = useState(false);

  const labs = (data?.labs ?? []).filter(
    (l) => statusFilter === "all" || l.status === statusFilter
  );

  const resetForm = () => {
    setForm({ title: "", slug: "", description: "", trackId: "none", difficulty: "beginner", type: "ctf", estimatedMinutes: "60" });
    setSlugTouched(false);
  };

  const handleCreate = async () => {
    if (!form.title.trim() || !form.slug.trim() || !form.description.trim()) {
      toast({ title: "Missing fields", description: "Title, slug and description are required.", variant: "destructive" });
      return;
    }
    try {
      const r = await createMut.mutateAsync({
        title: form.title.trim(),
        slug: form.slug.trim(),
        description: form.description.trim(),
        trackId: form.trackId === "none" ? null : Number(form.trackId),
        difficulty: form.difficulty,
        type: form.type,
        estimatedMinutes: Number(form.estimatedMinutes) || 60,
      });
      toast({ title: "Draft created", description: `"${r.lab.title}" is ready to edit.` });
      setCreateOpen(false);
      resetForm();
    } catch (e) {
      toast({ title: "Create failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  const handleClone = async (l: LabListItem) => {
    try {
      await cloneMut.mutateAsync(l.id);
      toast({ title: "Lab cloned", description: `A draft copy of "${l.title}" was created.` });
    } catch (e) {
      toast({ title: "Clone failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  const handlePublish = async (l: LabListItem) => {
    try {
      await publishMut.mutateAsync(l.id);
      toast({ title: "Published", description: `"${l.title}" is now live.` });
    } catch (e) {
      toast({ title: "Publish failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  const handleArchive = async () => {
    if (!archiveFor) return;
    try {
      await archiveMut.mutateAsync(archiveFor.id);
      toast({ title: "Archived", description: `"${archiveFor.title}" was archived.` });
      setArchiveFor(null);
    } catch (e) {
      toast({ title: "Archive failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="p-5 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        icon={FlaskConical}
        title="Lab Builder"
        subtitle="Author hands-on labs, assign them to students, and track completion analytics."
        actions={
          <Button onClick={() => { resetForm(); setCreateOpen(true); }}>
            <Plus className="h-4 w-4 mr-1.5" />New Lab
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        <KpiCard icon={Layers} label="Total Labs" value={overview?.totalLabs ?? 0} tone="bg-primary/15 text-primary" />
        <KpiCard icon={Rocket} label="Published" value={overview?.byStatus?.published ?? 0} tone="bg-emerald-500/15 text-emerald-600" />
        <KpiCard icon={Send} label="Assignments" value={overview?.totalAssignments ?? 0} tone="bg-blue-500/15 text-blue-600" />
        <KpiCard icon={Target} label="Completion Rate" value={`${overview?.aggregateCompletionRate ?? 0}%`} tone="bg-amber-500/15 text-amber-600" />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-5">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <GridSkeleton cols={3} rows={2} />
      ) : labs.length === 0 ? (
        <EmptyState
          icon={FlaskConical}
          title="No labs yet"
          description="Create a draft lab, add modules and hints, then publish and assign it to your students."
          action={<Button onClick={() => { resetForm(); setCreateOpen(true); }}><Plus className="h-4 w-4 mr-1.5" />New Lab</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {labs.map((l, i) => (
            <motion.div key={l.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}>
              <Card className="glass-card h-full flex flex-col">
                <CardContent className="p-5 flex flex-col gap-3 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={`/mentor/lab-builder/${l.id}`} className="font-semibold text-foreground leading-tight hover:text-primary transition-colors line-clamp-2">
                        {l.title}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{l.trackName ?? "No track"} · v{l.version}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/mentor/lab-builder/${l.id}`}><Pencil className="h-4 w-4 mr-2" />Edit</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleClone(l)}><Copy className="h-4 w-4 mr-2" />Clone</DropdownMenuItem>
                        {l.status !== "published" && (
                          <DropdownMenuItem onClick={() => handlePublish(l)}><Rocket className="h-4 w-4 mr-2" />Publish</DropdownMenuItem>
                        )}
                        {l.status !== "archived" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setArchiveFor(l)}>
                              <Archive className="h-4 w-4 mr-2" />Archive
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-2">{l.description}</p>

                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className={STATUS_META[l.status]?.className}>{STATUS_META[l.status]?.label ?? l.status}</Badge>
                    <Badge variant="outline" className="capitalize">{l.type}</Badge>
                    <Badge variant="outline" className={`capitalize ${DIFF_COLOR[l.difficulty] ?? ""}`}>{l.difficulty}</Badge>
                  </div>

                  <div className="mt-auto pt-2 border-t border-border/50 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><ClipboardList className="h-3.5 w-3.5" />{l.moduleCount} modules</span>
                    <span className="flex items-center gap-1"><Send className="h-3.5 w-3.5" />{l.assignmentCount} assigned</span>
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{l.estimatedMinutes}m</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create lab</DialogTitle>
            <DialogDescription>Start a draft. You can add modules, hints and assets after.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="lab-title">Title</Label>
              <Input id="lab-title" value={form.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setForm((f) => ({ ...f, title, slug: slugTouched ? f.slug : slugify(title) }));
                }}
                placeholder="e.g. SOC Triage: Phishing Investigation" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lab-slug">Slug</Label>
              <Input id="lab-slug" value={form.slug}
                onChange={(e) => { setSlugTouched(true); setForm((f) => ({ ...f, slug: slugify(e.target.value) })); }}
                placeholder="soc-triage-phishing" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lab-desc">Description</Label>
              <Textarea id="lab-desc" value={form.description} rows={3}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="What students will learn and do in this lab." />
            </div>
            <div className="grid grid-cols-2 gap-3">
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
                  <SelectContent>
                    {LB_DIFFICULTIES.map((d) => <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LB_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lab-mins">Est. minutes</Label>
                <Input id="lab-mins" type="number" min={0} value={form.estimatedMinutes}
                  onChange={(e) => setForm((f) => ({ ...f, estimatedMinutes: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMut.isPending}>Create draft</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!archiveFor} onOpenChange={(o) => { if (!o) setArchiveFor(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this lab?</AlertDialogTitle>
            <AlertDialogDescription>
              "{archiveFor?.title}" will be hidden from students. Existing assignments and history are preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive} disabled={archiveMut.isPending}>Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
