import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Navigation, CheckCircle2, PlayCircle, Lock, BookOpen } from "lucide-react";
import { PageHeader, GridSkeleton, EmptyState } from "@/components/page-shell";

interface Phase {
  id: number;
  title: string;
  order: number;
  lessonCount: number;
  status: "in_progress" | "available" | "locked";
}
interface Track {
  name: string;
  accentColor: string;
}
interface RoadmapData {
  track: Track | null;
  phases: Phase[];
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  in_progress: { label: "In Progress", color: "#F97316" },
  available: { label: "Available", color: "#2563EB" },
  locked: { label: "Locked", color: "#94a3b8" },
};

export default function CareerRoadmapPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/career/roadmap"],
    queryFn: () => apiFetch<RoadmapData>("/api/career/roadmap"),
  });

  const accent = data?.track?.accentColor ?? "#2563EB";

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <PageHeader
        icon={Navigation}
        title="Career Roadmap"
        subtitle={data?.track ? `Your module-by-module path through ${data.track.name}` : "Your module-by-module learning path"}
      />

      {isLoading ? (
        <GridSkeleton cols={1} rows={5} />
      ) : !data?.track || data.phases.length === 0 ? (
        <EmptyState
          icon={Navigation}
          title="No roadmap yet"
          description="Select a track to generate your step-by-step module roadmap."
          action={
            <Link href="/onboarding/tracks">
              <Button size="sm">Choose a Track</Button>
            </Link>
          }
        />
      ) : (
        <div className="relative">
          <div
            className="absolute left-[19px] top-4 bottom-4 w-0.5"
            style={{ backgroundColor: `${accent}25` }}
          />
          <div className="space-y-3">
            {data.phases.map((phase, idx) => {
              const meta = STATUS_META[phase.status] ?? STATUS_META.locked;
              const Icon =
                phase.status === "in_progress" ? PlayCircle : phase.status === "available" ? BookOpen : Lock;
              const isDone = false;
              return (
                <motion.div
                  key={phase.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.05 }}
                  className="relative flex gap-4"
                >
                  <div
                    className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 z-10 bg-card border-2"
                    style={{ borderColor: meta.color }}
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-5 w-5" style={{ color: meta.color }} />
                    ) : (
                      <Icon className="h-5 w-5" style={{ color: meta.color }} />
                    )}
                  </div>
                  <Card className={`border-border/60 flex-1 mb-1 ${phase.status === "locked" ? "opacity-60" : ""}`}>
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Phase {phase.order}</p>
                        <h3 className="font-semibold text-sm text-foreground">{phase.title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{phase.lessonCount} lessons</p>
                      </div>
                      <Badge
                        className="text-[10px] shrink-0"
                        style={{ backgroundColor: `${meta.color}15`, color: meta.color, borderColor: `${meta.color}30` }}
                      >
                        {meta.label}
                      </Badge>
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
