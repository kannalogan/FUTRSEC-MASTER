import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { PageHeader, GridSkeleton, EmptyState } from "@/components/page-shell";
import { GraduationCap, BookOpen, Play } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function MyCoursesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["learning/modules"],
    queryFn: () => apiFetch<{ track: any; modules: any[] }>("/api/learning/modules"),
  });

  const enroll = useMutation({
    mutationFn: (moduleId: number) =>
      apiFetch(`/api/learning/modules/${moduleId}/enroll`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["learning/modules"] });
      toast({ title: "Enrolled successfully!" });
    },
  });

  const modules = data?.modules ?? [];
  const track = data?.track ?? null;
  const enrolled = modules.filter((m: any) => m.isEnrolled);
  const available = modules.filter((m: any) => !m.isEnrolled);
  const totalProgress = enrolled.length > 0
    ? Math.round(enrolled.reduce((s: number, m: any) => s + (m.enrollment?.progressPercent ?? 0), 0) / enrolled.length)
    : 0;

  if (isLoading) return <div className="p-6"><GridSkeleton cols={3} rows={2} /></div>;

  if (modules.length === 0) {
    return (
      <div className="p-6">
        <PageHeader title="My Courses" icon={GraduationCap} />
        <EmptyState
          icon={BookOpen}
          title="No courses yet"
          description="Select a learning track to unlock your personalized curriculum."
          action={<Link href="/onboarding/tracks"><Button>Select a Track</Button></Link>}
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader
        title="My Courses"
        subtitle={track ? `${track.name} · ${modules.length} modules` : undefined}
        icon={GraduationCap}
      />

      {enrolled.length > 0 && (
        <div className="bg-white border border-border/60 rounded-xl p-5 shadow-sm mb-6 flex items-center gap-6">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-foreground">Overall Progress</span>
              <span className="text-sm font-bold text-primary">{totalProgress}%</span>
            </div>
            <Progress value={totalProgress} className="h-2" />
          </div>
          <div className="flex gap-4 text-center shrink-0">
            <div>
              <p className="text-xl font-bold font-heading text-foreground">{enrolled.length}</p>
              <p className="text-xs text-muted-foreground">Enrolled</p>
            </div>
            <div>
              <p className="text-xl font-bold font-heading text-green-500">
                {enrolled.filter((m: any) => m.enrollment?.progressPercent === 100).length}
              </p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </div>
        </div>
      )}

      {enrolled.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">In Progress</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {enrolled.map((m: any, i: number) => {
              const pct = m.enrollment?.progressPercent ?? 0;
              return (
                <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Link href="/learning">
                    <div className="bg-white border border-border/60 rounded-xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                      <div className="flex items-start justify-between mb-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <BookOpen className="h-5 w-5 text-primary" />
                        </div>
                        {pct === 100
                          ? <Badge className="text-[10px] bg-green-50 text-green-600 border-green-200">Completed</Badge>
                          : <Badge variant="outline" className="text-[10px]">{pct}%</Badge>}
                      </div>
                      <p className="font-semibold text-sm text-foreground mb-1 group-hover:text-primary transition-colors">Module {m.order}: {m.title}</p>
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{m.description}</p>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{m.lessonCount} lessons</span><span>{pct}%</span>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {available.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">Available to Enroll</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {available.map((m: any, i: number) => (
              <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <div className="bg-white border border-border/60 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-10 w-10 rounded-xl bg-muted/60 flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-muted-foreground/60" />
                    </div>
                    <Badge variant="outline" className="text-[10px]">{m.lessonCount} lessons</Badge>
                  </div>
                  <p className="font-semibold text-sm text-foreground mb-1">Module {m.order}: {m.title}</p>
                  <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{m.description}</p>
                  <Button size="sm" className="w-full h-7 text-xs" onClick={() => enroll.mutate(m.id)} disabled={enroll.isPending}>
                    <Play className="h-3 w-3 mr-1.5" />Enroll
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
