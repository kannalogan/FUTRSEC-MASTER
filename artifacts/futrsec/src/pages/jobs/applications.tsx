import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Send, Building, MapPin, Clock, Briefcase } from "lucide-react";
import { PageHeader, GridSkeleton, EmptyState } from "@/components/page-shell";

const STATUS_META: Record<string, { label: string; color: string }> = {
  applied: { label: "Applied", color: "#2563EB" },
  reviewing: { label: "Under Review", color: "#F97316" },
  shortlisted: { label: "Shortlisted", color: "#8B5CF6" },
  interview: { label: "Interview", color: "#06B6D4" },
  offered: { label: "Offered", color: "#10B981" },
  rejected: { label: "Not Selected", color: "#EF4444" },
  withdrawn: { label: "Withdrawn", color: "#94a3b8" },
};

interface Job {
  id: number;
  title: string;
  location: string | null;
  isRemote: boolean;
  type: string;
}
interface Application {
  id: number;
  jobId: number;
  status: string;
  appliedAt: string;
  job: Job | null;
}

export default function ApplicationsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/jobs/applications/mine"],
    queryFn: () => apiFetch<{ applications: Application[] }>("/api/jobs/applications/mine"),
  });
  const apps = data?.applications ?? [];

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <PageHeader
        icon={Send}
        title="Applications"
        subtitle="Track the status of every job you've applied to"
        actions={apps.length > 0 ? <Badge className="bg-primary/10 text-primary border-primary/20">{apps.length} total</Badge> : undefined}
      />

      {isLoading ? (
        <GridSkeleton cols={1} rows={4} />
      ) : apps.length === 0 ? (
        <EmptyState
          icon={Send}
          title="No applications yet"
          description="Browse jobs and apply to start tracking your applications here."
          action={<Link href="/jobs"><Button size="sm">Browse Jobs</Button></Link>}
        />
      ) : (
        <div className="space-y-3">
          {apps.map((a, idx) => {
            const meta = STATUS_META[a.status] ?? STATUS_META.applied;
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.04 }}
              >
                <Card className="bg-white border-border/60">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Briefcase className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-foreground truncate">
                        {a.job?.title ?? `Job #${a.jobId}`}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        {a.job?.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {a.job.isRemote ? "Remote" : a.job.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(a.appliedAt).toLocaleDateString()}
                        </span>
                      </div>
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
      )}
    </div>
  );
}
