import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Briefcase, Clock, Trophy, CheckCircle2, ArrowRight, Tag } from "lucide-react";
import { PageHeader, GridSkeleton, EmptyState } from "@/components/page-shell";

const DIFF_COLORS: Record<string, string> = {
  beginner: "#10B981",
  intermediate: "#F97316",
  advanced: "#EF4444",
};

interface Project {
  id: number;
  title: string;
  description: string;
  difficulty: string;
  tags: string[];
  totalPoints: number;
  estimatedMinutes: number;
  attempt: { status: string; totalScore: number | null } | null;
}

export default function ProjectsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/projects"],
    queryFn: () => apiFetch<Project[]>("/api/projects"),
  });

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <PageHeader
        icon={Briefcase}
        title="Projects"
        subtitle="Hands-on, real-world projects to build your portfolio"
      />

      {isLoading ? (
        <GridSkeleton cols={3} rows={2} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No projects yet"
          description="Practical projects for your track will appear here. Select a track to begin."
        />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((p, idx) => {
            const diff = p.difficulty ?? "beginner";
            const done = p.attempt?.status === "completed";
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.04 }}
                whileHover={{ y: -2 }}
              >
                <Card className="bg-white border-border/60 hover:shadow-md transition-all h-full flex flex-col">
                  <CardContent className="p-5 flex flex-col flex-1">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Briefcase className="h-5 w-5 text-primary" />
                      </div>
                      <Badge
                        className="text-[10px] px-2 shrink-0"
                        style={{
                          backgroundColor: `${DIFF_COLORS[diff]}15`,
                          color: DIFF_COLORS[diff],
                          borderColor: `${DIFF_COLORS[diff]}30`,
                        }}
                      >
                        {diff}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-sm text-foreground leading-tight mb-1">{p.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3 flex-1">{p.description}</p>
                    {p.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {p.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex items-center gap-0.5"
                          >
                            <Tag className="h-2.5 w-2.5" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {p.estimatedMinutes}m
                      </span>
                      <span className="flex items-center gap-1">
                        <Trophy className="h-3 w-3" />
                        {p.totalPoints} pts
                      </span>
                    </div>
                    {done ? (
                      <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 w-full justify-center py-1">
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Completed{p.attempt?.totalScore != null ? ` · ${p.attempt.totalScore} pts` : ""}
                      </Badge>
                    ) : (
                      <Link href="/labs">
                        <Button size="sm" className="w-full">
                          {p.attempt ? "Continue" : "Start Project"}
                          <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                        </Button>
                      </Link>
                    )}
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
