import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { PageHeader, GridSkeleton, EmptyState } from "@/components/page-shell";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GraduationCap, BookOpen, Play, CheckCircle2, Sparkles, Bookmark, Clock, Award, Loader2, ChevronRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

interface MyCourses { ongoing: any[]; completed: any[]; recommended: any[]; saved: any[]; }

const DIFF_DOT: Record<string, string> = { beginner: "bg-emerald-500", intermediate: "bg-blue-500", advanced: "bg-orange-500" };

function ModuleCard({ m, badge, accent }: { m: any; badge: React.ReactNode; accent: string }) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const pct = m.progressPercent ?? m.enrollment?.progressPercent ?? 0;

  const open = useMutation({
    mutationFn: async () => {
      const detail = await apiFetch<{ lessons: any[] }>(`/api/learning/modules/${m.id}`);
      const next = detail.lessons.find((l) => !l.completed) ?? detail.lessons[0];
      if (!next) throw new Error("No lessons yet.");
      return next.id;
    },
    onSuccess: (lessonId) => navigate(`/learning/${m.id}/${lessonId}`),
    onError: (e: any) => toast({ title: "Couldn't open", description: e?.message, variant: "destructive" }),
  });

  return (
    <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div className={`h-10 w-10 rounded-xl ${accent} flex items-center justify-center`}><BookOpen className="h-5 w-5" /></div>
        {badge}
      </div>
      <div className="flex items-center gap-1.5 mb-1">
        <span className={`h-1.5 w-1.5 rounded-full ${DIFF_DOT[m.difficulty] ?? "bg-muted-foreground"}`} />
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{m.category ?? "Module"}</span>
      </div>
      <p className="font-semibold text-sm text-foreground mb-1 leading-tight">{m.title}</p>
      <p className="text-xs text-muted-foreground mb-3 line-clamp-2 flex-1">{m.description}</p>
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-3">
        <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{m.lessonCount}</span>
        {m.estimatedMinutes ? <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{m.estimatedMinutes}m</span> : null}
        {m.xpReward ? <span className="flex items-center gap-1"><Award className="h-3 w-3" />{m.xpReward} XP</span> : null}
      </div>
      {m.isEnrolled && (
        <div className="mb-3">
          <Progress value={pct} className="h-1.5" />
        </div>
      )}
      <Button size="sm" className="w-full h-8 text-xs" disabled={open.isPending} onClick={() => open.mutate()}>
        {open.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Play className="h-3 w-3 mr-1.5" />}
        {pct === 100 ? "Review" : pct > 0 ? "Continue" : "Start"}
      </Button>
    </div>
  );
}

export default function MyCoursesPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("ongoing");

  const { data, isLoading } = useQuery({
    queryKey: ["my-courses"],
    queryFn: () => apiFetch<MyCourses>("/api/learning/my-courses"),
  });

  if (isLoading) return <div className="p-6"><GridSkeleton cols={3} rows={2} /></div>;

  const d = data ?? { ongoing: [], completed: [], recommended: [], saved: [] };
  const totalEnrolled = d.ongoing.length + d.completed.length;

  if (totalEnrolled === 0 && d.recommended.length === 0 && d.saved.length === 0) {
    return (
      <div className="p-6">
        <PageHeader title="My Courses" icon={GraduationCap} />
        <EmptyState icon={BookOpen} title="No courses yet" description="Select a learning track to unlock your personalized curriculum."
          action={<Link href="/onboarding/tracks"><Button>Select a Track</Button></Link>} />
      </div>
    );
  }

  const tabs = [
    { v: "ongoing", label: "Ongoing", icon: Play, count: d.ongoing.length },
    { v: "completed", label: "Completed", icon: CheckCircle2, count: d.completed.length },
    { v: "recommended", label: "Recommended", icon: Sparkles, count: d.recommended.length },
    { v: "saved", label: "Saved", icon: Bookmark, count: d.saved.length },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader title="My Courses" subtitle={`${totalEnrolled} enrolled · ${d.completed.length} completed`} icon={GraduationCap}
        actions={<Link href="/learning"><Button variant="outline" size="sm"><BookOpen className="h-4 w-4 mr-1.5" />Browse All</Button></Link>} />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-muted/50">
          {tabs.map((t) => (
            <TabsTrigger key={t.v} value={t.v} className="data-[state=active]:bg-card gap-1.5">
              <t.icon className="h-3.5 w-3.5" />{t.label}
              <span className="text-[10px] text-muted-foreground">{t.count}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-5">
          <TabsContent value="ongoing">
            {d.ongoing.length === 0 ? <EmptyState icon={Play} title="Nothing in progress" description="Start a module to see it here." action={<Link href="/learning"><Button>Browse Modules</Button></Link>} /> : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {d.ongoing.map((m, i) => (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <ModuleCard m={m} accent="bg-primary/10 text-primary" badge={<Badge variant="outline" className="text-[10px]">{m.progressPercent}%</Badge>} />
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed">
            {d.completed.length === 0 ? <EmptyState icon={CheckCircle2} title="No completed modules yet" description="Finish all lessons in a module to earn its XP." /> : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {d.completed.map((m, i) => (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <ModuleCard m={m} accent="bg-green-100 text-green-600" badge={<Badge className="text-[10px] bg-green-50 text-green-600 border-green-200"><CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />Done</Badge>} />
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="recommended">
            {d.recommended.length === 0 ? <EmptyState icon={Sparkles} title="All caught up" description="You're enrolled in every module on your track." /> : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {d.recommended.map((m, i) => (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <ModuleCard m={m} accent="bg-muted/60 text-muted-foreground" badge={<Badge variant="outline" className="text-[10px]">{m.lessonCount} lessons</Badge>} />
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="saved">
            {d.saved.length === 0 ? <EmptyState icon={Bookmark} title="No saved lessons" description="Bookmark lessons to revisit them quickly." /> : (
              <div className="space-y-2">
                {d.saved.map((b, i) => (
                  <motion.div key={b.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                    <Link href={`/learning/${b.moduleId}/${b.lessonId}`}>
                      <div className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-card hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Bookmark className="h-4 w-4 fill-primary text-primary" /></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{b.lessonTitle}</p>
                          <p className="text-xs text-muted-foreground truncate">{b.moduleTitle} · <span className="capitalize">{b.lessonType}</span></p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
