import { useQuery, useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bot, MapPin, Briefcase, IndianRupee, Sparkles, CheckCircle2, Send, AlertCircle, Lightbulb } from "lucide-react";
import { PageHeader, GridSkeleton, EmptyState } from "@/components/page-shell";
import { useToast } from "@/hooks/use-toast";

interface JobMatch {
  id: number;
  title: string;
  company: string | null;
  location: string | null;
  type: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  matchScore: number;
  reasons: string[];
  missingSkills?: string[];
  recommendations?: string[];
}

export default function AIJobAgentPage() {
  const { toast } = useToast();
  const { data, isLoading } = useQuery({
    queryKey: ["/api/ai/job-matches"],
    queryFn: () => apiFetch<JobMatch[]>("/api/ai/job-matches"),
  });

  const apply = useMutation({
    mutationFn: (jobId: number) => apiFetch(`/api/jobs/${jobId}/apply`, { method: "POST", body: JSON.stringify({}) }),
    onSuccess: () => toast({ title: "Applied!", description: "The AI agent submitted your application." }),
    onError: () => toast({ title: "Error", description: "Could not apply.", variant: "destructive" }),
  });

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <PageHeader
        icon={Bot}
        title="AI Job Agent"
        subtitle="AI-matched jobs ranked by fit with your profile"
        actions={<Badge className="bg-purple-50 text-purple-600 border-purple-200 gap-1"><Sparkles className="h-3 w-3" />AI Powered</Badge>}
      />

      {isLoading ? (
        <GridSkeleton cols={1} rows={4} />
      ) : !data || data.length === 0 ? (
        <EmptyState icon={Bot} title="No matches yet" description="As new jobs are posted, the AI agent will rank them by how well they fit your profile." />
      ) : (
        <div className="space-y-3">
          {data.map((job, idx) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.04 }}
            >
              <Card className="bg-card border-border/60 overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                        <Briefcase className="h-5 w-5 text-purple-500" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm text-foreground truncate">{job.title}</h3>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          {job.company && <span>{job.company}</span>}
                          {job.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-center shrink-0">
                      <div className="relative h-12 w-12">
                        <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="15" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                          <circle cx="18" cy="18" r="15" fill="none" stroke="#8B5CF6" strokeWidth="3"
                            strokeDasharray={`${(job.matchScore / 100) * 94.2} 94.2`} strokeLinecap="round" />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-purple-600">{job.matchScore}%</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">match</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {job.reasons.map((r) => (
                      <span key={r} className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                        <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />{r}
                      </span>
                    ))}
                  </div>
                  {job.missingSkills && job.missingSkills.length > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground mb-1">
                        <AlertCircle className="h-3 w-3 text-amber-500" />Skills to build
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {job.missingSkills.slice(0, 6).map((s) => (
                          <span key={s} className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {job.recommendations && job.recommendations.length > 0 && (
                    <div className="mb-3 rounded-lg bg-muted/40 border border-border/40 p-2.5">
                      <div className="flex items-center gap-1 text-[11px] font-medium text-foreground mb-1">
                        <Lightbulb className="h-3 w-3 text-primary" />Recommendations
                      </div>
                      <ul className="space-y-1">
                        {job.recommendations.slice(0, 3).map((r, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                            <span className="text-primary shrink-0 mt-0.5">→</span>{r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3">
                    {(job.salaryMin || job.salaryMax) && (
                      <span className="flex items-center gap-1 text-xs font-medium text-foreground">
                        <IndianRupee className="h-3 w-3" />
                        {job.salaryMin ? (job.salaryMin / 100000).toFixed(1) : "?"}–{job.salaryMax ? (job.salaryMax / 100000).toFixed(1) : "?"} LPA
                      </span>
                    )}
                    <Button size="sm" className="ml-auto" onClick={() => apply.mutate(job.id)} disabled={apply.isPending}>
                      <Send className="h-3.5 w-3.5 mr-1.5" />Quick Apply
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
