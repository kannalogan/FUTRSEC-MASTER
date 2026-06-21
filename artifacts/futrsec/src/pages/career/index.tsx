import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, BookOpen, CheckCircle2, Circle, Lock, ArrowRight, Layers } from "lucide-react";
import { PageHeader, CardSkeleton, EmptyState } from "@/components/page-shell";

interface Phase {
  id: number;
  title: string;
  order: number;
  lessonCount: number;
  status: "in_progress" | "available" | "locked";
}
interface Track {
  id: number;
  name: string;
  description: string;
  difficulty: string;
  durationWeeks: number;
  totalModules: number;
  accentColor: string;
}
interface RoadmapData {
  track: Track | null;
  phases: Phase[];
}

export default function CareerTrackPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/career/roadmap"],
    queryFn: () => apiFetch<RoadmapData>("/api/career/roadmap"),
  });

  const accent = data?.track?.accentColor ?? "#2563EB";
  const inProgress = data?.phases.filter((p) => p.status === "in_progress").length ?? 0;
  const totalPhases = data?.phases.length ?? 0;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <PageHeader icon={Target} title="Career Track" subtitle="Your chosen path to job-readiness" />

      {isLoading ? (
        <div className="space-y-4">
          <CardSkeleton rows={3} />
          <CardSkeleton rows={4} />
        </div>
      ) : !data?.track ? (
        <EmptyState
          icon={Target}
          title="No track selected"
          description="Choose a cybersecurity track to see your personalized career path."
          action={
            <Link href="/onboarding/tracks">
              <Button size="sm">Choose a Track</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <Card className="border-border/60 overflow-hidden">
              <div className="h-1.5" style={{ backgroundColor: accent }} />
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="text-lg font-heading font-bold text-foreground">{data.track.name}</h2>
                    <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{data.track.description}</p>
                  </div>
                  <Badge className="capitalize" style={{ backgroundColor: `${accent}15`, color: accent, borderColor: `${accent}30` }}>
                    {data.track.difficulty}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-5">
                  <Stat icon={Layers} label="Modules" value={String(data.track.totalModules)} />
                  <Stat icon={BookOpen} label="Duration" value={`${data.track.durationWeeks}w`} />
                  <Stat icon={CheckCircle2} label="In Progress" value={`${inProgress}/${totalPhases}`} />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Learning Phases</h3>
            <div className="space-y-2.5">
              {data.phases.length === 0 ? (
                <p className="text-sm text-muted-foreground">Modules for this track are being prepared.</p>
              ) : (
                data.phases.map((phase, idx) => (
                  <motion.div
                    key={phase.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.04 }}
                  >
                    <Card className={`border-border/60 ${phase.status === "locked" ? "opacity-60" : ""}`}>
                      <CardContent className="p-4 flex items-center gap-3">
                        {phase.status === "in_progress" ? (
                          <Circle className="h-5 w-5 shrink-0" style={{ color: accent }} />
                        ) : phase.status === "available" ? (
                          <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                        ) : (
                          <Lock className="h-5 w-5 text-muted-foreground/40 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">Phase {phase.order}</p>
                          <h4 className="font-medium text-sm text-foreground">{phase.title}</h4>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">{phase.lessonCount} lessons</span>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          <Link href="/learning">
            <Button className="w-full sm:w-auto">
              Continue Learning
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="bg-muted/50 rounded-xl p-3">
      <Icon className="h-4 w-4 text-muted-foreground mb-1.5" />
      <p className="text-lg font-bold text-foreground leading-none">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
