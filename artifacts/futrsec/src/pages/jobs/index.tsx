import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Briefcase, MapPin, Clock, DollarSign, CheckCircle2, Send,
  AlertCircle, Building, Wifi, Star, ChevronRight, Filter, ExternalLink
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  applied:    { bg: "#EFF6FF", text: "#2563EB" },
  interview:  { bg: "#FFF7ED", text: "#F97316" },
  rejected:   { bg: "#FEF2F2", text: "#EF4444" },
  selected:   { bg: "#F0FDF4", text: "#10B981" },
  offer:      { bg: "#F0FDF4", text: "#10B981" },
};

function JobCard({ job, onSelect }: { job: any; onSelect: (job: any) => void }) {
  const salRange = job.minSalary && job.maxSalary
    ? `₹${(job.minSalary / 100000).toFixed(1)}L – ₹${(job.maxSalary / 100000).toFixed(1)}L`
    : null;

  return (
    <motion.div whileHover={{ y: -1 }} transition={{ duration: 0.15 }}>
      <Card
        className={`bg-card border-border/60 transition-all cursor-pointer ${job.applied ? "border-l-2 border-l-success" : ""}`}
        onClick={() => onSelect(job)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center shrink-0 border border-border/50">
                <Building className="h-5 w-5 text-muted-foreground/60" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-foreground leading-tight">{job.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {job.employer?.name ?? "Company"}
                </p>
              </div>
            </div>
            {job.applied && <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-xs text-muted-foreground">
            {job.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />{job.location}
              </span>
            )}
            {job.isRemote && (
              <span className="flex items-center gap-1 text-green-600">
                <Wifi className="h-3 w-3" />Remote
              </span>
            )}
            {salRange && (
              <span className="flex items-center gap-1 font-medium text-foreground/80">
                <DollarSign className="h-3 w-3" />{salRange}
              </span>
            )}
            {job.experience && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />{job.experience}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-1 mt-3">
            {job.skills?.slice(0, 4).map((s: any) => (
              <span key={s.id} className="text-[10px] bg-primary/8 text-primary/80 px-2 py-0.5 rounded-full border border-primary/15">
                {s.skill}
              </span>
            ))}
            {job.skills?.length > 4 && (
              <span className="text-[10px] text-muted-foreground px-1">+{job.skills.length - 4}</span>
            )}
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40">
            <Badge variant="secondary" className="text-[10px] capitalize">{job.type?.replace("_", " ")}</Badge>
            {!job.applied ? (
              <Button size="sm" className="h-7 text-xs gap-1" onClick={(e) => { e.stopPropagation(); onSelect(job); }}>
                <Send className="h-3 w-3" />Apply
              </Button>
            ) : (
              <span className="text-xs text-success font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />Applied
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function JobDetailDialog({ job, onClose }: { job: any | null; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const applyMutation = useMutation({
    mutationFn: (jobId: number) => apiFetch(`/api/jobs/${jobId}/apply`, { method: "POST", body: JSON.stringify({}) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["jobs/applications"] });
      toast({ title: "Application submitted! 🎉", description: "We'll notify you of any updates." });
      onClose();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (!job) return null;

  const salRange = job.minSalary && job.maxSalary
    ? `₹${(job.minSalary / 100000).toFixed(1)}L – ₹${(job.maxSalary / 100000).toFixed(1)}L`
    : null;

  return (
    <Dialog open={!!job} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-left">
            <Briefcase className="h-5 w-5 text-primary shrink-0" />
            {job.title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="font-medium text-foreground">{job.employer?.name ?? "Company"}</p>
            <div className="flex flex-wrap gap-2 mt-2 text-sm text-muted-foreground">
              {job.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{job.location}</span>}
              {job.isRemote && <span className="flex items-center gap-1 text-success"><Wifi className="h-4 w-4" />Remote OK</span>}
              {salRange && <span className="flex items-center gap-1 font-medium text-foreground"><DollarSign className="h-4 w-4" />{salRange} p.a.</span>}
              {job.experience && <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{job.experience}</span>}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Description</p>
            <p className="text-sm text-foreground/80 leading-relaxed">{job.description}</p>
          </div>
          {job.skills?.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Required Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {job.skills.map((s: any) => (
                  <Badge key={s.id} variant="secondary" className="text-xs">{s.skill}</Badge>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Close</Button>
            {!job.applied ? (
              <Button className="flex-1" onClick={() => applyMutation.mutate(job.id)} disabled={applyMutation.isPending}>
                {applyMutation.isPending ? "Applying..." : "Apply Now"}
              </Button>
            ) : (
              <Button variant="outline" className="flex-1 text-success border-success/30 cursor-default">
                <CheckCircle2 className="h-4 w-4 mr-1" />Applied
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ApplicationsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["jobs/applications"],
    queryFn: () => apiFetch<any>("/api/jobs/applications/mine"),
  });

  const applications = data?.applications ?? [];

  if (isLoading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>;

  if (applications.length === 0) {
    return (
      <div className="text-center py-12">
        <Send className="h-12 w-12 mx-auto text-muted-foreground/20 mb-3" />
        <p className="text-sm text-muted-foreground">No applications yet</p>
        <p className="text-xs text-muted-foreground mt-1">Start applying to jobs to track them here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {applications.map((app: any) => {
        const style = STATUS_COLORS[app.status] ?? STATUS_COLORS.applied;
        return (
          <div key={app.id} className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border/60">
            <div className="h-9 w-9 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
              <Building className="h-4.5 w-4.5 text-muted-foreground/60" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{app.job?.title ?? "Job"}</p>
              <p className="text-xs text-muted-foreground">{new Date(app.appliedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
            </div>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: style.bg, color: style.text }}>
              {app.status.replace("_", " ").replace(/^\w/, (c: string) => c.toUpperCase())}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function JobsPage() {
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => apiFetch<any>("/api/jobs"),
  });

  const jobs = data?.jobs ?? [];

  const filtered = filter === "all" ? jobs :
    filter === "applied" ? jobs.filter((j: any) => j.applied) :
    filter === "remote" ? jobs.filter((j: any) => j.isRemote) :
    jobs.filter((j: any) => j.type === filter);

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 lg:p-8 max-w-7xl mx-auto">
      <Tabs defaultValue="jobs">
        <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">Jobs</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{jobs.length} positions matched to your track</p>
          </div>
          <TabsList className="h-8">
            <TabsTrigger value="jobs" className="text-xs h-7">Browse Jobs</TabsTrigger>
            <TabsTrigger value="applications" className="text-xs h-7">My Applications</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="jobs">
          <div className="flex gap-2 flex-wrap mb-4">
            {["all", "full_time", "contract", "internship", "remote", "applied"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filter === f ? "bg-foreground text-background" : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {f === "all" ? "All Jobs" : f.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase())}
              </button>
            ))}
          </div>
          {isError ? (
            <div className="flex flex-col items-center py-12 text-center">
              <AlertCircle className="h-10 w-10 text-destructive mb-2" />
              <p className="text-sm text-muted-foreground">Failed to load jobs</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <Briefcase className="h-12 w-12 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">No jobs match this filter</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((job: any) => (
                <JobCard key={job.id} job={job} onSelect={setSelectedJob} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="applications">
          <ApplicationsTab />
        </TabsContent>
      </Tabs>

      <JobDetailDialog job={selectedJob} onClose={() => setSelectedJob(null)} />
    </div>
  );
}
