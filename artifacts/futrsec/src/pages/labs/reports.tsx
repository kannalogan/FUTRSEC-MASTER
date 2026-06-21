import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, CheckCircle2, Clock, Award } from "lucide-react";
import { PageHeader, GridSkeleton, EmptyState } from "@/components/page-shell";

interface LabReport {
  id: number;
  labId: number;
  reportContent: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  grade: string | null;
  feedback: string | null;
  createdAt: string;
  labTitle: string | null;
}

export default function LabReportsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/lab-reports"],
    queryFn: () => apiFetch<LabReport[]>("/api/lab-reports"),
  });

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <PageHeader icon={FileText} title="Lab Reports" subtitle="Your submitted lab write-ups and instructor feedback" />

      {isLoading ? (
        <GridSkeleton cols={1} rows={4} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No reports yet"
          description="Complete a lab and submit a report to see it here."
        />
      ) : (
        <div className="space-y-3">
          {data.map((r, idx) => {
            const reviewed = !!r.reviewedAt;
            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.04 }}
              >
                <Card className="bg-white border-border/60">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <FileText className="h-[18px] w-[18px] text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm text-foreground">{r.labTitle ?? `Lab #${r.labId}`}</h3>
                          <p className="text-xs text-muted-foreground">
                            {r.submittedAt
                              ? `Submitted ${new Date(r.submittedAt).toLocaleDateString()}`
                              : "Draft"}
                          </p>
                        </div>
                      </div>
                      {reviewed ? (
                        <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[10px] shrink-0">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Reviewed
                        </Badge>
                      ) : (
                        <Badge className="bg-orange-50 text-orange-600 border-orange-200 text-[10px] shrink-0">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending Review
                        </Badge>
                      )}
                    </div>
                    {r.reportContent && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{r.reportContent}</p>
                    )}
                    {reviewed && (
                      <div className="mt-3 rounded-lg bg-muted/50 p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Award className="h-3.5 w-3.5 text-amber-500" />
                          <span className="text-xs font-semibold text-foreground">
                            Grade: {r.grade ?? "—"}
                          </span>
                        </div>
                        {r.feedback && <p className="text-xs text-muted-foreground">{r.feedback}</p>}
                      </div>
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
