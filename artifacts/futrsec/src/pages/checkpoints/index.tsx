import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, CheckCircle2, Circle, Lock, Trophy } from "lucide-react";
import { PageHeader, GridSkeleton, EmptyState } from "@/components/page-shell";

interface Checkpoint {
  id: number;
  title: string;
  description: string | null;
  order: number;
  requiredScore: number;
  progress: { status: string; score: number | null; completedAt: string | null } | null;
}

export default function CheckpointsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/checkpoints"],
    queryFn: () => apiFetch<Checkpoint[]>("/api/checkpoints"),
  });

  const completed = data?.filter((c) => c.progress?.status === "completed").length ?? 0;
  const total = data?.length ?? 0;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <PageHeader
        icon={CheckSquare}
        title="Checkpoints"
        subtitle="Validate your progress at each stage of your track"
        actions={
          total > 0 ? (
            <Badge className="bg-primary/10 text-primary border-primary/20">
              {completed} / {total} cleared
            </Badge>
          ) : undefined
        }
      />

      {isLoading ? (
        <GridSkeleton cols={1} rows={4} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No checkpoints yet"
          description="Select a learning track to unlock progress checkpoints."
        />
      ) : (
        <div className="space-y-3">
          {data.map((cp, idx) => {
            const status = cp.progress?.status ?? "pending";
            const isDone = status === "completed";
            const prevDone = idx === 0 || data[idx - 1]?.progress?.status === "completed";
            const isLocked = !isDone && !prevDone;
            return (
              <motion.div
                key={cp.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.04 }}
              >
                <Card className={`bg-white border-border/60 ${isLocked ? "opacity-60" : ""}`}>
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="shrink-0">
                      {isDone ? (
                        <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                      ) : isLocked ? (
                        <Lock className="h-7 w-7 text-muted-foreground/40" />
                      ) : (
                        <Circle className="h-7 w-7 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          Checkpoint {cp.order}
                        </span>
                        {isDone && cp.progress?.score != null && (
                          <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[10px]">
                            <Trophy className="h-3 w-3 mr-1" />
                            {cp.progress.score}%
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-semibold text-sm text-foreground mt-0.5">{cp.title}</h3>
                      {cp.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{cp.description}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">Required</p>
                      <p className="text-sm font-semibold text-foreground">{cp.requiredScore}%</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
