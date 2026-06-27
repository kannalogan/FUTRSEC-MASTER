import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  BookOpen, Play, CheckCircle2, ChevronRight, Clock, Award, Search,
  Layers, Video, FileText, ClipboardList, FlaskConical, GraduationCap,
  FileSearch, Loader2, Bookmark, Share2, Signal, TrendingUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TYPE_ICONS: Record<string, React.ComponentType<any>> = {
  video: Video, article: FileText, quiz: ClipboardList, lab: FlaskConical, assignment: GraduationCap, pdf: FileSearch,
};

const DIFFICULTY: Record<string, { label: string; grad: string; text: string; dot: string }> = {
  beginner: { label: "Beginner", grad: "from-emerald-500 to-teal-600", text: "text-emerald-600", dot: "bg-emerald-500" },
  intermediate: { label: "Intermediate", grad: "from-blue-500 to-indigo-600", text: "text-blue-600", dot: "bg-blue-500" },
  advanced: { label: "Advanced", grad: "from-orange-500 to-rose-600", text: "text-orange-600", dot: "bg-orange-500" },
};
function diff(d?: string) { return DIFFICULTY[d ?? "beginner"] ?? DIFFICULTY.beginner; }

function ModuleHero({ module, onContinue, continuing }: { module: any; onContinue: () => void; continuing: boolean }) {
  const { toast } = useToast();
  const d = diff(module.difficulty);
  const pct = module.enrollment?.progressPercent ?? 0;
  const share = async () => {
    const url = `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, "")}/learning`;
    try { await navigator.clipboard.writeText(url); toast({ title: "Module link copied" }); } catch { /* noop */ }
  };
  return (
    <div className="rounded-xl overflow-hidden border border-border/60 bg-card">
      <div className={`bg-gradient-to-br ${d.grad} p-5 text-white relative`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <Badge className="bg-white/20 text-white border-white/30 backdrop-blur text-[10px] mb-2">{module.category ?? "Module"}</Badge>
            <h2 className="font-heading text-xl font-bold leading-tight">{module.title}</h2>
            <p className="text-sm text-white/85 mt-1 max-w-lg">{module.description}</p>
          </div>
          <Layers className="h-10 w-10 text-white/30 shrink-0" />
        </div>
        <div className="flex items-center gap-4 mt-4 text-xs text-white/90">
          <span className="flex items-center gap-1"><Signal className="h-3.5 w-3.5" />{d.label}</span>
          {module.estimatedMinutes ? <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{module.estimatedMinutes} min</span> : null}
          {module.xpReward ? <span className="flex items-center gap-1"><Award className="h-3.5 w-3.5" />{module.xpReward} XP</span> : null}
          <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" />{module.lessonCount} lessons</span>
        </div>
      </div>
      <div className="p-4 flex items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">{module.isEnrolled ? `${pct}% complete` : "Not started"}</span>
          </div>
          <Progress value={pct} className="h-1.5" />
        </div>
        <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={share}><Share2 className="h-4 w-4" /></Button>
        <Button size="sm" onClick={onContinue} disabled={continuing}>
          {continuing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Play className="h-3.5 w-3.5 mr-1.5" />}
          {pct > 0 && pct < 100 ? "Continue" : pct === 100 ? "Review" : "Start"}
        </Button>
      </div>
    </div>
  );
}

export default function LearningPage() {
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [diffFilter, setDiffFilter] = useState<string | null>(null);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: modulesData, isLoading } = useQuery({
    queryKey: ["learning/modules"],
    queryFn: () => apiFetch<{ track: any; modules: any[] }>("/api/learning/modules"),
  });

  const modules: any[] = (modulesData as any)?.modules ?? [];
  const track = (modulesData as any)?.track ?? null;

  useEffect(() => {
    if (selectedModuleId === null && modules.length > 0) setSelectedModuleId(modules[0].id);
  }, [selectedModuleId, modules]);

  const { data: lessonData, isLoading: lessonsLoading } = useQuery({
    queryKey: ["learning/module", selectedModuleId],
    queryFn: () => apiFetch<{ module: any; lessons: any[]; progressPercent: number; completedCount: number; enrollment: any }>(`/api/learning/modules/${selectedModuleId}`),
    enabled: !!selectedModuleId,
  });

  const continueMutation = useMutation({
    mutationFn: async (moduleId: number) => {
      const detail = await apiFetch<{ lessons: any[] }>(`/api/learning/modules/${moduleId}`);
      const next = detail.lessons.find((l) => !l.completed) ?? detail.lessons[0];
      if (!next) throw new Error("This module has no lessons yet.");
      return { moduleId, lessonId: next.id };
    },
    onSuccess: ({ moduleId, lessonId }) => navigate(`/learning/${moduleId}/${lessonId}`),
    onError: (e: any) => toast({ title: "Couldn't open module", description: e?.message, variant: "destructive" }),
  });

  // Group + filter modules by category.
  const grouped = useMemo(() => {
    const filtered = modules.filter((m) => {
      if (diffFilter && m.difficulty !== diffFilter) return false;
      if (search && !`${m.title} ${m.category ?? ""} ${m.description ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    const map = new Map<string, any[]>();
    for (const m of filtered) {
      const cat = m.category ?? "General";
      const arr = map.get(cat) ?? [];
      arr.push(m);
      map.set(cat, arr);
    }
    return Array.from(map.entries());
  }, [modules, diffFilter, search]);

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">
          <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  if (modules.length === 0) {
    return (
      <div className="p-6 lg:p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
        <BookOpen className="h-14 w-14 text-muted-foreground/20 mb-4" />
        <h2 className="text-lg font-semibold text-foreground">No modules yet</h2>
        <p className="text-sm text-muted-foreground mt-1">Complete track selection to unlock your learning path</p>
        <Link href="/onboarding/tracks"><Button className="mt-4">Select a Track</Button></Link>
      </div>
    );
  }

  const totalLessons = modules.reduce((s, m) => s + m.lessonCount, 0);
  const enrolledCount = modules.filter((m) => m.isEnrolled).length;

  return (
    <div className="p-5 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Learning</h1>
          {track && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {track.name} · {modules.length} modules · {totalLessons} lessons · {enrolledCount} enrolled
            </p>
          )}
        </div>
        <Link href="/my-courses"><Button variant="outline" size="sm"><TrendingUp className="h-4 w-4 mr-1.5" />My Courses</Button></Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search modules..." className="pl-9 h-9" />
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant={diffFilter === null ? "default" : "outline"} className="h-9 text-xs" onClick={() => setDiffFilter(null)}>All</Button>
          {Object.keys(DIFFICULTY).map((k) => (
            <Button key={k} size="sm" variant={diffFilter === k ? "default" : "outline"} className="h-9 text-xs" onClick={() => setDiffFilter(k)}>{DIFFICULTY[k].label}</Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">
        {/* Module list grouped by category */}
        <div className="space-y-5">
          {grouped.length === 0 && <p className="text-sm text-muted-foreground px-1">No modules match your filters.</p>}
          {grouped.map(([category, mods]) => (
            <div key={category}>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-1 mb-2">{category}</p>
              <div className="space-y-2">
                {mods.map((m) => {
                  const d = diff(m.difficulty);
                  const pct = m.enrollment?.progressPercent ?? 0;
                  const isSel = m.id === selectedModuleId;
                  return (
                    <button key={m.id} onClick={() => setSelectedModuleId(m.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${isSel ? "border-primary bg-primary/5 elevation-1" : "border-border/60 bg-card hover:border-border hover:elevation-1"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={`h-1.5 w-1.5 rounded-full ${d.dot}`} />
                            <span className="text-[10px] text-muted-foreground">{d.label}</span>
                            {pct === 100 && <CheckCircle2 className="h-3 w-3 text-success" />}
                          </div>
                          <p className="text-sm font-semibold text-foreground leading-tight truncate">{m.title}</p>
                          <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
                            <span>{m.lessonCount} lessons</span>
                            {m.estimatedMinutes ? <span>· {m.estimatedMinutes}m</span> : null}
                          </div>
                        </div>
                        <ChevronRight className={`h-4 w-4 shrink-0 ${isSel ? "text-primary" : "text-muted-foreground/40"}`} />
                      </div>
                      {m.isEnrolled && <Progress value={pct} className="h-1 mt-2" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Selected module detail */}
        <div>
          {selectedModuleId && lessonData ? (
            <motion.div key={selectedModuleId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <ModuleHero
                module={{ ...lessonData.module, lessonCount: lessonData.lessons?.length ?? 0, enrollment: lessonData.enrollment }}
                onContinue={() => continueMutation.mutate(selectedModuleId)}
                continuing={continueMutation.isPending}
              />
              <div className="rounded-xl border border-border/60 bg-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-heading font-bold text-foreground">Lessons</h3>
                  <span className="text-xs text-muted-foreground">{lessonData.completedCount}/{lessonData.lessons?.length} done</span>
                </div>
                {lessonsLoading ? (
                  <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
                ) : (
                  <div className="space-y-2">
                    {lessonData.lessons?.map((lesson: any, i: number) => {
                      const Icon = TYPE_ICONS[lesson.type] ?? Play;
                      return (
                        <Link key={lesson.id} href={`/learning/${selectedModuleId}/${lesson.id}`}>
                          <div className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer hover-lift hover:border-primary/40 ${lesson.completed ? "bg-success/10 border-success/30" : "bg-card border-border/50"}`}>
                            <span className="text-xs font-bold text-muted-foreground/50 w-5 text-center">{i + 1}</span>
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              {lesson.completed ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Icon className="h-4 w-4 text-primary" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate ${lesson.completed ? "text-muted-foreground" : "text-foreground"}`}>{lesson.title}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 capitalize">{lesson.type}</Badge>
                                {lesson.durationMinutes ? <span className="text-[11px] text-muted-foreground flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{lesson.durationMinutes}m</span> : null}
                                {lesson.bookmarked && <Bookmark className="h-3 w-3 fill-primary text-primary" />}
                                {lesson.isFree && <Badge className="text-[10px] px-1.5 py-0 bg-success/10 text-success border-success/30">Free</Badge>}
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="flex items-center justify-center h-64 border-2 border-dashed border-border rounded-xl text-muted-foreground text-sm">
              Select a module to view lessons
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
