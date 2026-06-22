import { useState } from "react";
import { Link } from "wouter";
import {
  useMITemplates, useMIAnalytics, usePublishMITemplate, useDeleteMITemplate,
  MI_TRACK_LABELS, MI_TRACKS, MI_TYPE_LABELS, MI_STATUSES,
  type MITemplate,
} from "@/lib/mock-interview-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader, GridSkeleton, EmptyState } from "@/components/page-shell";
import { useToast } from "@/hooks/use-toast";
import { MockInterviewEditorDialog } from "@/components/mock-interview/editor-dialog";
import { MockInterviewAssignDialog } from "@/components/mock-interview/assign-dialog";
import {
  Mic2, Plus, MoreHorizontal, Pencil, Trash2, Send, Rocket, BarChart3, Users,
  Target, CheckCircle2, ClipboardList, Layers, Eye, Clock, Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";

const STATUS_META: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground border-border" },
  published: { label: "Published", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
  archived: { label: "Archived", className: "bg-muted/50 text-muted-foreground/70 border-border/50" },
};
const DIFF_COLOR: Record<string, string> = {
  beginner: "text-emerald-600", intermediate: "text-blue-600", advanced: "text-amber-600", expert: "text-destructive",
};

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

export default function MentorMockInterviewsPage() {
  const { toast } = useToast();
  const [status, setStatus] = useState<string>("all");
  const [track, setTrack] = useState<string>("all");
  const { data: templates, isLoading } = useMITemplates({
    status: status === "all" ? undefined : status,
    track: track === "all" ? undefined : track,
  });
  const { data: analytics } = useMIAnalytics();
  const publishMut = usePublishMITemplate();
  const deleteMut = useDeleteMITemplate();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<MITemplate | null>(null);
  const [assignFor, setAssignFor] = useState<MITemplate | null>(null);
  const [deleteFor, setDeleteFor] = useState<MITemplate | null>(null);

  const list = templates ?? [];

  const openCreate = () => { setEditing(null); setEditorOpen(true); };
  const openEdit = (t: MITemplate) => { setEditing(t); setEditorOpen(true); };

  const handlePublish = async (t: MITemplate) => {
    try {
      await publishMut.mutateAsync(t.id);
      toast({ title: "Published", description: `"${t.title}" is now assignable.` });
    } catch (e) {
      toast({ title: "Publish failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteFor) return;
    try {
      const r = await deleteMut.mutateAsync(deleteFor.id);
      toast({
        title: r.archived ? "Archived" : "Deleted",
        description: r.archived
          ? "Template had assignments, so it was archived to preserve history."
          : `"${deleteFor.title}" was removed.`,
      });
      setDeleteFor(null);
    } catch (e) {
      toast({ title: "Action failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="p-5 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        icon={Mic2}
        title="Mock Interviews"
        subtitle="Design, publish, and assign track-specific mock interviews — then review scored transcripts."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" />New Template
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        <KpiCard icon={ClipboardList} label="Templates" value={analytics?.totalTemplates ?? 0} tone="bg-primary/15 text-primary" />
        <KpiCard icon={Rocket} label="Published" value={analytics?.publishedTemplates ?? 0} tone="bg-emerald-500/15 text-emerald-600" />
        <KpiCard icon={Users} label="Assignments" value={analytics?.totalAssignments ?? 0} tone="bg-blue-500/15 text-blue-600" />
        <KpiCard
          icon={Target}
          label="Completion Rate"
          value={`${analytics?.completionRate ?? 0}%`}
          tone="bg-amber-500/15 text-amber-600"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-5">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {MI_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={track} onValueChange={setTrack}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Track" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tracks</SelectItem>
            {MI_TRACKS.map((t) => <SelectItem key={t} value={t}>{MI_TRACK_LABELS[t]}</SelectItem>)}
          </SelectContent>
        </Select>
        {analytics?.averageScore != null && (
          <Badge variant="outline" className="ml-auto gap-1.5 py-1.5">
            <BarChart3 className="h-3.5 w-3.5" />Avg score {analytics.averageScore}/100
          </Badge>
        )}
      </div>

      {isLoading ? (
        <GridSkeleton cols={3} rows={2} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={Mic2}
          title="No mock interviews yet"
          description="Create a template, publish it, then assign it to your students for scored practice."
          action={<Button onClick={openCreate}><Plus className="h-4 w-4 mr-1.5" />New Template</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
            >
              <Card className="glass-card h-full flex flex-col">
                <CardContent className="p-5 flex flex-col gap-3 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground leading-tight truncate">{t.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{MI_TRACK_LABELS[t.careerTrack] ?? t.careerTrack}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/mentor/mock-interviews/${t.id}`}><Eye className="h-4 w-4 mr-2" />View results</Link>
                        </DropdownMenuItem>
                        {t.status !== "archived" && (
                          <DropdownMenuItem onClick={() => openEdit(t)}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                        )}
                        {t.status === "draft" && (
                          <DropdownMenuItem onClick={() => handlePublish(t)}><Rocket className="h-4 w-4 mr-2" />Publish</DropdownMenuItem>
                        )}
                        {t.status === "published" && (
                          <DropdownMenuItem onClick={() => setAssignFor(t)}><Send className="h-4 w-4 mr-2" />Assign</DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteFor(t)}>
                          <Trash2 className="h-4 w-4 mr-2" />Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className={STATUS_META[t.status]?.className}>{STATUS_META[t.status]?.label ?? t.status}</Badge>
                    <Badge variant="outline">{MI_TYPE_LABELS[t.interviewType] ?? t.interviewType}</Badge>
                    <Badge variant="outline" className={DIFF_COLOR[t.difficulty]}>{t.difficulty}</Badge>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><ClipboardList className="h-3.5 w-3.5" />{t.totalQuestions} Qs</span>
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{t.durationMin}m</span>
                    <span className="flex items-center gap-1 capitalize"><Sparkles className="h-3.5 w-3.5" />{t.questionSource}</span>
                  </div>

                  {t.stats && t.stats.total > 0 && (
                    <div className="mt-auto pt-2 border-t border-border/50 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        {t.stats.completed}/{t.stats.total} done
                      </span>
                      {t.stats.avgScore != null && (
                        <Badge variant="outline" className="text-[10px]">avg {t.stats.avgScore}/100</Badge>
                      )}
                    </div>
                  )}

                  {t.status === "published" && (!t.stats || t.stats.total === 0) && (
                    <div className="mt-auto pt-2 border-t border-border/50">
                      <Button variant="outline" size="sm" className="w-full" onClick={() => setAssignFor(t)}>
                        <Send className="h-3.5 w-3.5 mr-1.5" />Assign to students
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <MockInterviewEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        template={editing}
      />
      <MockInterviewAssignDialog
        open={!!assignFor}
        onOpenChange={(o) => { if (!o) setAssignFor(null); }}
        template={assignFor}
      />

      <AlertDialog open={!!deleteFor} onOpenChange={(o) => { if (!o) setDeleteFor(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this template?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteFor?.stats && deleteFor.stats.total > 0
                ? "This template already has assignments, so it will be archived to preserve student history."
                : `"${deleteFor?.title}" will be permanently removed. This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteMut.isPending}>
              {deleteFor?.stats && deleteFor.stats.total > 0 ? "Archive" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
