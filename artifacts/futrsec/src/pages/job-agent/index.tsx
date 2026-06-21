import { Link } from "wouter";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader, EmptyState } from "@/components/page-shell";
import { useToast } from "@/hooks/use-toast";
import {
  Bot, Sparkles, Bookmark, BookmarkCheck, Send, CheckCircle2, Building,
  MapPin, Wifi, DollarSign, Calendar, Gift, Briefcase, TrendingUp, Settings,
} from "lucide-react";
import {
  useJobAgentOverview,
  useRecommendedJobs,
  useSavedJobs,
  useSaveJob,
  useUnsaveJob,
  type RecommendedJob,
} from "@/lib/job-agent-api";
import { apiFetch } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { jobAgentKeys } from "@/lib/job-agent-api";

function salaryRange(min: number | null, max: number | null): string | null {
  if (min && max) return `₹${(min / 100000).toFixed(1)}L – ₹${(max / 100000).toFixed(1)}L`;
  if (max) return `up to ₹${(max / 100000).toFixed(1)}L`;
  if (min) return `from ₹${(min / 100000).toFixed(1)}L`;
  return null;
}

function matchColor(score: number): string {
  if (score >= 80) return "#10B981";
  if (score >= 60) return "#2563EB";
  if (score >= 40) return "#F97316";
  return "#94A3B8";
}

const OVERVIEW_CARDS = [
  { key: "recommended", label: "Recommended", icon: Sparkles, color: "#2563EB" },
  { key: "new", label: "New", icon: Gift, color: "#7C3AED" },
  { key: "saved", label: "Saved", icon: Bookmark, color: "#F97316" },
  { key: "applied", label: "Applied", icon: Send, color: "#0EA5E9" },
  { key: "interviews", label: "Interviews", icon: Calendar, color: "#F59E0B" },
  { key: "offers", label: "Offers", icon: Gift, color: "#10B981" },
] as const;

function RecommendedCard({ job }: { job: RecommendedJob }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const saveMut = useSaveJob();
  const unsaveMut = useUnsaveJob();

  const applyMut = useMutation({
    mutationFn: (jobId: number) =>
      apiFetch(`/api/jobs/${jobId}/apply`, { method: "POST", body: JSON.stringify({}) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: jobAgentKeys.all });
      toast({ title: "Application submitted! 🎉", description: "Track its progress in Placement." });
    },
    onError: (e: Error) => toast({ title: "Could not apply", description: e.message, variant: "destructive" }),
  });

  const sal = salaryRange(job.minSalary, job.maxSalary);
  const color = matchColor(job.matchScore);

  return (
    <motion.div whileHover={{ y: -1 }} transition={{ duration: 0.15 }}>
      <Card className="bg-white border-border/60 hover:shadow-md transition-all h-full">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center shrink-0 border border-border/50">
                <Building className="h-5 w-5 text-muted-foreground/60" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-foreground leading-tight truncate">{job.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {job.employer?.companyName ?? "Company"}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end shrink-0">
              <span className="text-lg font-bold leading-none" style={{ color }}>{job.matchScore}%</span>
              <span className="text-[10px] text-muted-foreground">match</span>
            </div>
          </div>

          <div className="mt-2">
            <Progress value={job.matchScore} className="h-1.5" />
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-xs text-muted-foreground">
            {job.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>}
            {job.isRemote && <span className="flex items-center gap-1 text-green-600"><Wifi className="h-3 w-3" />Remote</span>}
            {sal && <span className="flex items-center gap-1 font-medium text-foreground/80"><DollarSign className="h-3 w-3" />{sal}</span>}
          </div>

          {job.matchReasons?.length > 0 && (
            <ul className="mt-3 space-y-1">
              {job.matchReasons.slice(0, 2).map((r, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />{r}
                </li>
              ))}
            </ul>
          )}

          {job.skills?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {job.skills.slice(0, 4).map((s) => (
                <span key={s} className="text-[10px] bg-primary/8 text-primary/80 px-2 py-0.5 rounded-full border border-primary/15">{s}</span>
              ))}
              {job.skills.length > 4 && <span className="text-[10px] text-muted-foreground px-1">+{job.skills.length - 4}</span>}
            </div>
          )}

          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/40">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 flex-1"
              disabled={saveMut.isPending || unsaveMut.isPending}
              onClick={() => (job.saved ? unsaveMut.mutate(job.id) : saveMut.mutate(job.id))}
            >
              {job.saved ? <><BookmarkCheck className="h-3 w-3" />Saved</> : <><Bookmark className="h-3 w-3" />Save</>}
            </Button>
            {job.applied ? (
              <span className="text-xs text-green-600 font-medium flex items-center gap-1 flex-1 justify-center">
                <CheckCircle2 className="h-3.5 w-3.5" />Applied
              </span>
            ) : (
              <Button
                size="sm"
                className="h-7 text-xs gap-1 flex-1"
                disabled={applyMut.isPending}
                onClick={() => applyMut.mutate(job.id)}
              >
                <Send className="h-3 w-3" />Apply
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function JobAgentPage() {
  const { data: overview, isLoading: ovLoading } = useJobAgentOverview();
  const { data: recData, isLoading: recLoading } = useRecommendedJobs();
  const { data: savedData } = useSavedJobs();

  const jobs = recData?.jobs ?? [];
  const savedJobs = savedData?.jobs ?? [];

  return (
    <div className="p-5 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        icon={Bot}
        title="AI Job Agent"
        subtitle="Track-matched roles, save & apply, and placement readiness"
        actions={
          <Link href="/job-agent/auto-apply">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Settings className="h-4 w-4" />Auto-Apply
            </Button>
          </Link>
        }
      />

      {/* Overview counts */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {OVERVIEW_CARDS.map((c) => {
          const Icon = c.icon;
          const value = overview ? (overview as unknown as Record<string, number>)[c.key] ?? 0 : 0;
          return (
            <Card key={c.key} className="bg-white border-border/60">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${c.color}18` }}>
                    <Icon className="h-4 w-4" style={{ color: c.color }} />
                  </div>
                  <div>
                    {ovLoading ? (
                      <Skeleton className="h-6 w-8" />
                    ) : (
                      <div className="text-xl font-bold font-heading text-foreground leading-none">{value}</div>
                    )}
                    <div className="text-[11px] text-muted-foreground mt-0.5">{c.label}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Placement readiness */}
      <Card className="bg-white border-border/60 mb-6">
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Placement Readiness</h3>
            </div>
            {ovLoading ? (
              <Skeleton className="h-6 w-12" />
            ) : (
              <span className="text-lg font-bold text-primary">{overview?.placementReadiness ?? 0}%</span>
            )}
          </div>
          <Progress value={overview?.placementReadiness ?? 0} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">
            Based on your assessments, checkpoints, resume and lab progress.
          </p>
        </CardContent>
      </Card>

      {/* Recommended jobs */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-primary" />Recommended for you
        </h2>
        {savedJobs.length > 0 && (
          <Badge variant="secondary" className="text-[10px]">{savedJobs.length} saved</Badge>
        )}
      </div>

      {recLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No recommendations yet"
          description="As new roles matching your track are posted, they'll show up here with a match score."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map((job) => <RecommendedCard key={job.id} job={job} />)}
        </div>
      )}
    </div>
  );
}
