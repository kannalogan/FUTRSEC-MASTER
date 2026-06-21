import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TreePine, CheckCircle2, Lock, PlayCircle, BookOpen } from "lucide-react";
import { PageHeader, CardSkeleton, EmptyState } from "@/components/page-shell";

interface Phase {
  id: number;
  title: string;
  order: number;
  lessonCount: number;
  status: "in_progress" | "available" | "locked";
}
interface RoadmapData {
  track: { name: string } | null;
  phases: Phase[];
}

const STATUS_META = {
  in_progress: { label: "In Progress", color: "#2563EB", icon: PlayCircle },
  available: { label: "Available", color: "#10B981", icon: CheckCircle2 },
  locked: { label: "Locked", color: "#94a3b8", icon: Lock },
};

export default function SkillTreePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/career/roadmap"],
    queryFn: () => apiFetch<RoadmapData>("/api/career/roadmap"),
  });

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <PageHeader
        icon={TreePine}
        title="Skill Tree"
        subtitle="Unlock skills as you progress through your track"
        actions={data?.track ? <Badge className="bg-primary/10 text-primary border-primary/20">{data.track.name}</Badge> : undefined}
      />

      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <CardSkeleton key={i} rows={1} />)}</div>
      ) : !data?.track || data.phases.length === 0 ? (
        <EmptyState
          icon={TreePine}
          title="No skill tree yet"
          description="Select a track and complete your assessment to unlock your personalized skill tree."
          action={<Link href="/onboarding/assessment"><Button size="sm">Start Assessment</Button></Link>}
        />
      ) : (
        <div className="relative">
          <div className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-border" />
          <div className="space-y-3">
            {data.phases.map((phase, idx) => {
              const meta = STATUS_META[phase.status];
              const Icon = meta.icon;
              return (
                <motion.div
                  key={phase.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.05 }}
                  className="relative flex gap-4 items-start"
                >
                  <div
                    className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 z-10 border-2 bg-white"
                    style={{ borderColor: `${meta.color}40` }}
                  >
                    <Icon className="h-6 w-6" style={{ color: meta.color }} />
                  </div>
                  <Card className={`flex-1 border-border/60 ${phase.status === "locked" ? "bg-muted/30" : "bg-white"}`}>
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-bold text-muted-foreground">PHASE {phase.order}</span>
                          <Badge className="text-[9px] h-4 px-1.5" style={{ backgroundColor: `${meta.color}15`, color: meta.color, borderColor: `${meta.color}30` }}>
                            {meta.label}
                          </Badge>
                        </div>
                        <h3 className={`font-semibold text-sm ${phase.status === "locked" ? "text-muted-foreground" : "text-foreground"}`}>
                          {phase.title}
                        </h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <BookOpen className="h-3 w-3" />{phase.lessonCount} lessons
                        </p>
                      </div>
                      {phase.status !== "locked" && (
                        <Link href="/learning">
                          <Button size="sm" variant="outline" className="shrink-0">Open</Button>
                        </Link>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
