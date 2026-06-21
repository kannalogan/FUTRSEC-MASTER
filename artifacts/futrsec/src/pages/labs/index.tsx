import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "wouter";
import { apiFetch } from "@/lib/api";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FlaskConical, Clock, Trophy, Play, CheckCircle2, AlertCircle, Zap,
} from "lucide-react";

const DIFF_COLORS: Record<string, string> = {
  beginner: "#10B981",
  intermediate: "#F97316",
  advanced: "#EF4444",
};

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  not_started: { label: "Not Started", color: "#94a3b8" },
  in_progress: { label: "In Progress", color: "#F97316" },
  completed: { label: "Completed", color: "#10B981" },
};

function LabCard({ lab, onOpen }: { lab: any; onOpen: (lab: any) => void }) {
  const diff = lab.difficulty ?? "beginner";
  const status = STATUS_MAP[lab.status] ?? STATUS_MAP.not_started;

  return (
    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
      <Card
        className="bg-white border-border/60 hover:shadow-md transition-all cursor-pointer h-full"
        onClick={() => onOpen(lab)}
      >
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
              <FlaskConical className="h-5 w-5 text-orange-500" />
            </div>
            <Badge
              className="text-[10px] px-2 shrink-0"
              style={{ backgroundColor: `${DIFF_COLORS[diff]}15`, color: DIFF_COLORS[diff], borderColor: `${DIFF_COLORS[diff]}30` }}
            >
              {diff}
            </Badge>
          </div>

          <h3 className="font-semibold text-sm text-foreground leading-tight mb-1">{lab.title}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{lab.description}</p>

          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{lab.estimatedMinutes}m</span>
            <span className="flex items-center gap-1"><Trophy className="h-3 w-3" />{lab.totalPoints} pts</span>
          </div>

          <div className="flex flex-wrap gap-1 mb-3">
            {lab.tags?.slice(0, 3).map((tag: string) => (
              <span key={tag} className="text-[10px] bg-muted/60 text-muted-foreground px-2 py-0.5 rounded-full">{tag}</span>
            ))}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border/40">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: status.color }} />
              <span className="text-xs text-muted-foreground">{status.label}</span>
            </div>
            {lab.status === "not_started" && (
              <Button size="sm" className="h-7 text-xs gap-1">
                <Play className="h-3 w-3" />Start Lab
              </Button>
            )}
            {lab.status === "in_progress" && (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-orange-200 text-orange-600 hover:bg-orange-50">
                <Zap className="h-3 w-3" />Continue
              </Button>
            )}
            {lab.status === "completed" && (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle2 className="h-3.5 w-3.5" />Done
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function LabsPage() {
  const [, navigate] = useLocation();
  const [filter, setFilter] = useState<string>("all");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["labs"],
    queryFn: () => apiFetch<any>("/api/labs"),
  });

  const labs = data?.labs ?? [];
  const track = data?.track;

  const filtered = filter === "all" ? labs : labs.filter((l: any) =>
    filter === "completed" ? l.status === "completed" :
    filter === "in_progress" ? l.status === "in_progress" :
    l.difficulty === filter
  );

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 lg:p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertCircle className="h-10 w-10 text-destructive mb-3" />
        <p className="text-sm text-muted-foreground">Failed to load labs</p>
      </div>
    );
  }

  const completed = labs.filter((l: any) => l.status === "completed").length;
  const inProgress = labs.filter((l: any) => l.status === "in_progress").length;

  return (
    <div className="p-5 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Labs</h1>
          {track && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {track.name} · {labs.length} labs · {completed} completed · {inProgress} in progress
            </p>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap mb-5">
        {["all", "beginner", "intermediate", "advanced", "in_progress", "completed"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f
                ? "bg-foreground text-background"
                : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {f === "all" ? "All Labs" : f.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase())}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FlaskConical className="h-12 w-12 text-muted-foreground/20 mb-3" />
          <p className="text-sm text-muted-foreground">No labs found for this filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((lab: any) => (
            <LabCard key={lab.id} lab={lab} onOpen={(l) => navigate(`/labs/${l.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}
