import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building, MapPin, IndianRupee, CheckCircle2, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageHeader, GridSkeleton, EmptyState } from "@/components/page-shell";

interface Internship {
  id: number;
  title: string;
  description: string;
  location: string | null;
  isRemote: boolean;
  minSalary: number | null;
  maxSalary: number | null;
  experience: string | null;
  applied: boolean;
}

export default function InternshipsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useQuery({
    queryKey: ["/api/internships"],
    queryFn: () => apiFetch<Internship[]>("/api/internships"),
  });

  const apply = useMutation({
    mutationFn: (jobId: number) => apiFetch(`/api/jobs/${jobId}/apply`, { method: "POST", body: JSON.stringify({}) }),
    onSuccess: () => {
      toast({ title: "Applied!", description: "Your application has been submitted." });
      qc.invalidateQueries({ queryKey: ["/api/internships"] });
    },
    onError: () => toast({ title: "Error", description: "Could not apply.", variant: "destructive" }),
  });

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <PageHeader icon={Building} title="Internships" subtitle="Entry-level opportunities to launch your security career" />

      {isLoading ? (
        <GridSkeleton cols={2} rows={2} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={Building}
          title="No internships yet"
          description="New internship openings will appear here as employers post them."
        />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          {data.map((job, idx) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.04 }}
            >
              <Card className="bg-card border-border/60 h-full flex flex-col">
                <CardContent className="p-5 flex flex-col flex-1">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-sm text-foreground leading-tight">{job.title}</h3>
                    <Badge variant="outline" className="text-[10px] shrink-0">Internship</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3 flex-1">{job.description}</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-3">
                    {job.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {job.isRemote ? "Remote" : job.location}
                      </span>
                    )}
                    {(job.minSalary || job.maxSalary) && (
                      <span className="flex items-center gap-1">
                        <IndianRupee className="h-3 w-3" />
                        {job.minSalary ? `${(job.minSalary / 1000).toFixed(0)}k` : ""}
                        {job.maxSalary ? `–${(job.maxSalary / 1000).toFixed(0)}k` : ""}/mo
                      </span>
                    )}
                  </div>
                  {job.applied ? (
                    <Badge className="bg-success/10 text-success border border-success/30 w-full justify-center py-1">
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      Applied
                    </Badge>
                  ) : (
                    <Button size="sm" className="w-full" onClick={() => apply.mutate(job.id)} disabled={apply.isPending}>
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                      Apply Now
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
