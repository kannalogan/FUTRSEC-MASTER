import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart2, Crown, Medal } from "lucide-react";
import { PageHeader, CardSkeleton, EmptyState } from "@/components/page-shell";

interface LeaderRow {
  rank: number;
  userId: number;
  score: number;
  name: string | null;
}

const RANK_COLORS: Record<number, string> = { 1: "#F59E0B", 2: "#94a3b8", 3: "#b45309" };

export default function LeaderboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["/api/leaderboard"],
    queryFn: () => apiFetch<LeaderRow[]>("/api/leaderboard"),
  });

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <PageHeader icon={BarChart2} title="Leaderboard" subtitle="Top learners ranked by FTS score" />

      {isLoading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <CardSkeleton key={i} rows={1} />)}</div>
      ) : !data || data.length === 0 ? (
        <EmptyState icon={BarChart2} title="No rankings yet" description="Complete assessments and labs to earn FTS points and climb the leaderboard." />
      ) : (
        <div className="space-y-2">
          {data.map((row, idx) => {
            const isMe = user?.id === row.userId;
            const rankColor = RANK_COLORS[row.rank];
            return (
              <motion.div
                key={row.userId}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.03 }}
              >
                <Card className={`border-border/60 ${isMe ? "bg-primary/5 border-primary/30" : "bg-white"}`}>
                  <CardContent className="p-3.5 flex items-center gap-3">
                    <div className="w-9 flex items-center justify-center shrink-0">
                      {row.rank <= 3 ? (
                        row.rank === 1
                          ? <Crown className="h-5 w-5" style={{ color: rankColor }} />
                          : <Medal className="h-5 w-5" style={{ color: rankColor }} />
                      ) : (
                        <span className="text-sm font-bold text-muted-foreground">#{row.rank}</span>
                      )}
                    </div>
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-foreground">
                        {(row.name ?? "U")[0]?.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {row.name ?? "Anonymous"}{isMe && <span className="text-primary text-xs ml-1">(You)</span>}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-foreground">{Math.round(row.score)}</p>
                      <p className="text-[10px] text-muted-foreground">FTS</p>
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
