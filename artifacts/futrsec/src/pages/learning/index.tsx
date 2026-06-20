import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen, Play, FileText, ClipboardList, Bookmark, CheckCircle2,
  Lock, ChevronRight, Clock, Video, FileSearch, FlaskConical, GraduationCap,
  AlertCircle, Layers
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TYPE_ICONS: Record<string, React.ComponentType<any>> = {
  video: Video,
  article: FileText,
  quiz: ClipboardList,
  lab: FlaskConical,
  assignment: GraduationCap,
  pdf: FileSearch,
};

const TYPE_COLORS: Record<string, string> = {
  video: "#2563EB",
  article: "#10B981",
  quiz: "#F97316",
  lab: "#EF4444",
  assignment: "#8B5CF6",
  pdf: "#06B6D4",
};

function LessonRow({ lesson, onComplete }: { lesson: any; onComplete: (id: number) => void }) {
  const Icon = TYPE_ICONS[lesson.type] ?? Play;
  const color = TYPE_COLORS[lesson.type] ?? "#2563EB";

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border transition-all hover:shadow-sm ${lesson.completed ? "bg-green-50/50 border-green-100" : "bg-white border-border/50 hover:border-border"}`}>
      <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15` }}>
        {lesson.completed
          ? <CheckCircle2 className="h-4 w-4 text-green-500" />
          : <Icon className="h-4 w-4" style={{ color }} />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${lesson.completed ? "text-muted-foreground line-through" : "text-foreground"}`}>
          {lesson.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{lesson.type}</Badge>
          {lesson.durationMinutes && (
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />{lesson.durationMinutes}m
            </span>
          )}
          {lesson.isFree && <Badge className="text-[10px] px-1.5 py-0 bg-green-100 text-green-700 border-green-200">Free</Badge>}
        </div>
      </div>
      {!lesson.completed && (
        <Button
          size="sm"
          variant="ghost"
          className="text-xs h-7 px-2 text-primary hover:text-primary hover:bg-primary/10"
          onClick={() => onComplete(lesson.id)}
        >
          Mark done
        </Button>
      )}
    </div>
  );
}

function ModuleCard({ module, onSelect, selectedModuleId }: {
  module: any; onSelect: (id: number) => void; selectedModuleId: number | null;
}) {
  const pct = module.enrollment?.progressPercent ?? 0;
  const isSelected = module.id === selectedModuleId;

  return (
    <button
      onClick={() => onSelect(module.id)}
      className={`w-full text-left p-4 rounded-xl border transition-all ${
        isSelected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border/60 bg-white hover:border-border hover:shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-muted-foreground/60">M{module.order}</span>
            {module.isEnrolled && pct === 100 && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
          </div>
          <p className="text-sm font-semibold text-foreground leading-tight">{module.title}</p>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{module.description}</p>
        </div>
        <ChevronRight className={`h-4 w-4 shrink-0 mt-0.5 transition-colors ${isSelected ? "text-primary" : "text-muted-foreground/40"}`} />
      </div>
      {module.isEnrolled ? (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-muted-foreground">{pct}% complete</span>
            <span className="text-[11px] text-muted-foreground">{module.lessonCount} lessons</span>
          </div>
          <Progress value={pct} className="h-1.5" />
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-2">
          <Layers className="h-3.5 w-3.5 text-muted-foreground/50" />
          <span className="text-[11px] text-muted-foreground">{module.lessonCount} lessons</span>
        </div>
      )}
    </button>
  );
}

export default function LearningPage() {
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: modulesData, isLoading } = useQuery({
    queryKey: ["learning/modules"],
    queryFn: () => apiFetch<{ track: any; modules: any[] }>("/api/learning/modules"),
  });

  // auto-select first module
  if (!selectedModuleId && modulesData?.modules && modulesData.modules.length > 0) {
    setSelectedModuleId(modulesData.modules[0].id);
  }

  const { data: lessonData, isLoading: lessonsLoading } = useQuery({
    queryKey: ["learning/module", selectedModuleId],
    queryFn: () => apiFetch<{ module: any; lessons: any[]; progressPercent: number; completedCount: number; enrollment: any }>(`/api/learning/modules/${selectedModuleId}`),
    enabled: !!selectedModuleId,
  });

  const enrollMutation = useMutation({
    mutationFn: (moduleId: number) => apiFetch(`/api/learning/modules/${moduleId}/enroll`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["learning/modules"] });
      qc.invalidateQueries({ queryKey: ["learning/module", selectedModuleId] });
      toast({ title: "Enrolled!", description: "You can now track your progress in this module." });
    },
  });

  const completeMutation = useMutation({
    mutationFn: (lessonId: number) => apiFetch(`/api/learning/lessons/${lessonId}/complete`, { method: "POST", body: JSON.stringify({}) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["learning/module", selectedModuleId] });
      qc.invalidateQueries({ queryKey: ["learning/modules"] });
      toast({ title: "Lesson completed! 🎉", description: "Keep going, you're making great progress." });
    },
  });

  const track = (modulesData as any)?.track ?? null;
  const modules = (modulesData as any)?.modules ?? [];

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
          <div className="lg:col-span-2 space-y-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
          </div>
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
        <Link href="/onboarding/tracks">
          <Button className="mt-4">Select a Track</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-5 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-5">
        <h1 className="font-heading text-2xl font-bold text-foreground">Learning</h1>
        {track && (
          <p className="text-sm text-muted-foreground mt-0.5">
            {track.name} · {modules.length} modules · {modules.reduce((s: number, m: any) => s + m.lessonCount, 0)} lessons
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
        {/* Module list */}
        <div className="space-y-2.5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-1">Modules</p>
          {modules.map((m: any) => (
            <ModuleCard
              key={m.id}
              module={m}
              onSelect={setSelectedModuleId}
              selectedModuleId={selectedModuleId}
            />
          ))}
        </div>

        {/* Lesson detail */}
        <div>
          {selectedModuleId && lessonData ? (
            <motion.div key={selectedModuleId} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
              <Card className="bg-white border-border/60">
                <CardHeader className="p-5 pb-3 border-b border-border/40">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-heading text-lg font-bold text-foreground">{lessonData.module?.title}</h2>
                      <p className="text-sm text-muted-foreground mt-0.5">{lessonData.module?.description}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className="text-2xl font-bold font-heading text-foreground">{lessonData.progressPercent}%</p>
                        <p className="text-xs text-muted-foreground">{lessonData.completedCount}/{lessonData.lessons?.length} done</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <Progress value={lessonData.progressPercent} className="flex-1 h-2" />
                    {!lessonData.enrollment && (
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => enrollMutation.mutate(selectedModuleId)}
                        disabled={enrollMutation.isPending}
                      >
                        {enrollMutation.isPending ? "Enrolling..." : "Enroll"}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-5">
                  {lessonsLoading ? (
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {lessonData.lessons?.map((lesson: any) => (
                        <LessonRow
                          key={lesson.id}
                          lesson={lesson}
                          onComplete={(id) => completeMutation.mutate(id)}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
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
