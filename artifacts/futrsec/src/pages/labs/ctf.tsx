import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Flag, CheckCircle2, Clock, Tag, ArrowRight } from "lucide-react";
import { PageHeader, GridSkeleton, EmptyState } from "@/components/page-shell";

const DIFF_COLORS: Record<string, string> = {
  beginner: "#10B981",
  intermediate: "#F97316",
  advanced: "#EF4444",
};

interface Challenge {
  id: number;
  title: string;
  description: string;
  difficulty: string;
  tags: string[];
  totalPoints: number;
  estimatedMinutes: number;
  attempt: { status: string; totalScore: number | null } | null;
}

export default function CTFPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/ctf"],
    queryFn: () => apiFetch<Challenge[]>("/api/ctf"),
  });

  const solved = data?.filter((c) => c.attempt?.status === "completed").length ?? 0;
  const earned = data?.reduce((s, c) => s + (c.attempt?.totalScore ?? 0), 0) ?? 0;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <PageHeader
        icon={Trophy}
        title="CTF Challenges"
        subtitle="Capture-the-flag challenges to sharpen your offensive skills"
        actions={
          data && data.length > 0 ? (
            <div className="flex gap-2">
              <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200">{solved} solved</Badge>
              <Badge className="bg-amber-50 text-amber-600 border-amber-200">{earned} pts</Badge>
            </div>
          ) : undefined
        }
      />

      {isLoading ? (
        <GridSkeleton cols={3} rows={2} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={Flag}
          title="No challenges yet"
          description="CTF challenges for your track will appear here soon."
        />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((c, idx) => {
            const diff = c.difficulty ?? "beginner";
            const solvedCard = c.attempt?.status === "completed";
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.04 }}
                whileHover={{ y: -2 }}
              >
                <Card className="bg-white border-border/60 hover:shadow-md transition-all h-full flex flex-col">
                  <CardContent className="p-5 flex flex-col flex-1">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                        <Flag className="h-5 w-5 text-amber-500" />
                      </div>
                      <Badge
                        className="text-[10px] px-2 shrink-0"
                        style={{ backgroundColor: `${DIFF_COLORS[diff]}15`, color: DIFF_COLORS[diff], borderColor: `${DIFF_COLORS[diff]}30` }}
                      >
                        {diff}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-sm text-foreground leading-tight mb-1">{c.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3 flex-1">{c.description}</p>
                    {c.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {c.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <Tag className="h-2.5 w-2.5" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{c.estimatedMinutes}m</span>
                      <span className="flex items-center gap-1"><Trophy className="h-3 w-3" />{c.totalPoints} pts</span>
                    </div>
                    {solvedCard ? (
                      <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 w-full justify-center py-1">
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Solved
                      </Badge>
                    ) : (
                      <Link href="/labs">
                        <Button size="sm" className="w-full">
                          {c.attempt ? "Continue" : "Start Challenge"}
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
