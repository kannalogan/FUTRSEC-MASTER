import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { apiFetch } from "@/lib/api";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Trophy, Flag, CheckCircle2, Clock, Tag, ArrowRight, Medal, Crown, Zap, Target,
} from "lucide-react";
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

interface LeaderRow {
  rank: number;
  userId: number;
  name: string;
  points: number;
  flags: number;
  challenges: number;
  isMe: boolean;
}

interface LeaderboardResp {
  leaderboard: LeaderRow[];
  me: LeaderRow | null;
  totalPlayers: number;
}

const RANK_STYLE: Record<number, { icon: typeof Crown; color: string }> = {
  1: { icon: Crown, color: "#EAB308" },
  2: { icon: Medal, color: "#94A3B8" },
  3: { icon: Medal, color: "#B45309" },
};

function CtfBadges({ me }: { me: LeaderRow | null }) {
  const flags = me?.flags ?? 0;
  const challenges = me?.challenges ?? 0;
  const badges = [
    { id: "first", title: "First Blood", icon: "🩸", desc: "Capture your first flag", earned: flags >= 1 },
    { id: "five", title: "Flag Hunter", icon: "🚩", desc: "Capture 5 flags", earned: flags >= 5 },
    { id: "challenger", title: "Challenger", icon: "⚔️", desc: "Score on 2 challenges", earned: challenges >= 2 },
    { id: "podium", title: "Podium", icon: "🏆", desc: "Reach the top 3", earned: !!me && me.rank <= 3 },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {badges.map((b) => (
        <div
          key={b.id}
          className={`rounded-lg border p-2.5 text-center ${b.earned ? "border-amber-200 bg-amber-50" : "border-border/60 bg-muted/30 opacity-60"}`}
          title={b.desc}
        >
          <div className={`text-xl ${b.earned ? "" : "grayscale"}`}>{b.icon}</div>
          <p className="text-[11px] font-medium text-foreground mt-0.5">{b.title}</p>
          <p className="text-[10px] text-muted-foreground leading-tight">{b.desc}</p>
        </div>
      ))}
    </div>
  );
}

export default function CTFPage() {
  const [, navigate] = useLocation();
  const [diff, setDiff] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["/api/ctf"],
    queryFn: () => apiFetch<Challenge[]>("/api/ctf"),
  });
  const { data: lb } = useQuery({
    queryKey: ["/api/ctf/leaderboard"],
    queryFn: () => apiFetch<LeaderboardResp>("/api/ctf/leaderboard"),
  });

  const solved = data?.filter((c) => c.attempt?.status === "completed").length ?? 0;
  const earned = data?.reduce((s, c) => s + (c.attempt?.totalScore ?? 0), 0) ?? 0;

  const difficulties = useMemo(() => {
    const set = new Set((data ?? []).map((c) => c.difficulty ?? "beginner"));
    return ["all", ...["beginner", "intermediate", "advanced"].filter((d) => set.has(d))];
  }, [data]);

  const filtered = diff === "all" ? (data ?? []) : (data ?? []).filter((c) => (c.difficulty ?? "beginner") === diff);

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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Challenges */}
          <div className="lg:col-span-2">
            <div className="flex gap-2 flex-wrap mb-4">
              {difficulties.map((d) => (
                <button
                  key={d}
                  onClick={() => setDiff(d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                    diff === d ? "bg-foreground text-background" : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {d === "all" ? "All" : d}
                </button>
              ))}
            </div>

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              {filtered.map((c, idx) => {
                const cd = c.difficulty ?? "beginner";
                const solvedCard = c.attempt?.status === "completed";
                const inProgress = c.attempt && c.attempt.status !== "completed";
                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.04 }}
                    whileHover={{ y: -2 }}
                  >
                    <Card className="bg-card border-border/60 hover:shadow-md transition-all h-full flex flex-col">
                      <CardContent className="p-5 flex flex-col flex-1">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                            <Flag className="h-5 w-5 text-amber-500" />
                          </div>
                          <Badge
                            className="text-[10px] px-2 shrink-0"
                            style={{ backgroundColor: `${DIFF_COLORS[cd]}15`, color: DIFF_COLORS[cd], borderColor: `${DIFF_COLORS[cd]}30` }}
                          >
                            {cd}
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
                          <Button
                            size="sm" variant="outline"
                            className="w-full text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                            onClick={() => navigate(`/labs/${c.id}`)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                            Solved — view writeup
                          </Button>
                        ) : (
                          <Button size="sm" className="w-full" onClick={() => navigate(`/labs/${c.id}`)}>
                            {inProgress ? "Continue" : "Start Challenge"}
                            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Leaderboard + badges */}
          <div className="space-y-5">
            <Card className="bg-card border-border/60">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  <h3 className="font-semibold text-sm text-foreground">Leaderboard</h3>
                  {lb && <span className="text-[11px] text-muted-foreground ml-auto">{lb.totalPlayers} players</span>}
                </div>
                {!lb || lb.leaderboard.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">
                    No flags captured yet. Be the first on the board!
                  </p>
                ) : (
                  <div className="space-y-1">
                    {lb.leaderboard.slice(0, 10).map((r) => {
                      const rs = RANK_STYLE[r.rank];
                      const Icon = rs?.icon;
                      return (
                        <div
                          key={r.userId}
                          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg ${r.isMe ? "bg-primary/10 ring-1 ring-primary/20" : "hover:bg-muted/40"}`}
                        >
                          <div className="w-6 flex justify-center shrink-0">
                            {Icon ? <Icon className="h-4 w-4" style={{ color: rs.color }} /> : <span className="text-xs font-semibold text-muted-foreground">{r.rank}</span>}
                          </div>
                          <span className={`text-xs flex-1 truncate ${r.isMe ? "font-semibold text-foreground" : "text-foreground/80"}`}>
                            {r.name}{r.isMe && " (you)"}
                          </span>
                          <span className="text-[11px] text-muted-foreground flex items-center gap-0.5 shrink-0">
                            <Flag className="h-3 w-3" />{r.flags}
                          </span>
                          <span className="text-xs font-semibold text-amber-600 tabular-nums shrink-0 w-12 text-right">{r.points}</span>
                        </div>
                      );
                    })}
                    {lb.me && lb.me.rank > 10 && (
                      <>
                        <div className="text-center text-muted-foreground text-xs py-1">···</div>
                        <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-primary/10 ring-1 ring-primary/20">
                          <div className="w-6 flex justify-center shrink-0"><span className="text-xs font-semibold text-foreground">{lb.me.rank}</span></div>
                          <span className="text-xs flex-1 truncate font-semibold text-foreground">{lb.me.name} (you)</span>
                          <span className="text-[11px] text-muted-foreground flex items-center gap-0.5 shrink-0"><Flag className="h-3 w-3" />{lb.me.flags}</span>
                          <span className="text-xs font-semibold text-amber-600 tabular-nums shrink-0 w-12 text-right">{lb.me.points}</span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card border-border/60">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <h3 className="font-semibold text-sm text-foreground">Your Badges</h3>
                </div>
                <CtfBadges me={lb?.me ?? null} />
                {lb?.me && (
                  <div className="flex items-center justify-around mt-4 pt-3 border-t border-border/40 text-center">
                    <div><p className="text-lg font-bold text-foreground">{lb.me.points}</p><p className="text-[10px] text-muted-foreground flex items-center gap-1 justify-center"><Target className="h-3 w-3" />points</p></div>
                    <div><p className="text-lg font-bold text-foreground">{lb.me.flags}</p><p className="text-[10px] text-muted-foreground flex items-center gap-1 justify-center"><Flag className="h-3 w-3" />flags</p></div>
                    <div><p className="text-lg font-bold text-foreground">#{lb.me.rank}</p><p className="text-[10px] text-muted-foreground flex items-center gap-1 justify-center"><Trophy className="h-3 w-3" />rank</p></div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
