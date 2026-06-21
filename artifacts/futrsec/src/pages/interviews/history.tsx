import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, Calendar, MessageSquare, Video, CheckCircle2 } from "lucide-react";
import { PageHeader, GridSkeleton, EmptyState } from "@/components/page-shell";

const STATUS_META: Record<string, { label: string; color: string }> = {
  scheduled: { label: "Scheduled", color: "#2563EB" },
  completed: { label: "Completed", color: "#10B981" },
  cancelled: { label: "Cancelled", color: "#EF4444" },
  no_show: { label: "No Show", color: "#94a3b8" },
};

interface Interview {
  id: number;
  type: string;
  scheduledAt: string | null;
  status: string;
  feedback: string | null;
  meetingUrl: string | null;
  jobTitle: string | null;
}

export default function InterviewHistoryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/interviews/history"],
    queryFn: () => apiFetch<Interview[]>("/api/interviews/history"),
  });

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <PageHeader icon={History} title="Interview History" subtitle="Your past and upcoming interviews with feedback" />

      {isLoading ? (
        <GridSkeleton cols={1} rows={4} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={History}
          title="No interviews yet"
          description="Once employers schedule interviews with you, they'll appear here."
        />
      ) : (
        <div className="space-y-3">
          {data.map((iv, idx) => {
            const meta = STATUS_META[iv.status] ?? STATUS_META.scheduled;
            return (
              <motion.div
                key={iv.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.04 }}
              >
                <Card className="bg-card border-border/60">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-9 w-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                          <MessageSquare className="h-[18px] w-[18px] text-violet-500" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm text-foreground">
                            {iv.jobTitle ?? "Interview"}
                          </h3>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                            <span className="capitalize">{iv.type}</span>
                            {iv.scheduledAt && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(iv.scheduledAt).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Badge
                        className="text-[10px] shrink-0"
                        style={{ backgroundColor: `${meta.color}15`, color: meta.color, borderColor: `${meta.color}30` }}
                      >
                        {iv.status === "completed" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                        {meta.label}
                      </Badge>
                    </div>
                    {iv.feedback && (
                      <div className="mt-2 rounded-lg bg-muted/50 p-3">
                        <p className="text-xs text-muted-foreground">{iv.feedback}</p>
                      </div>
                    )}
                    {iv.meetingUrl && iv.status === "scheduled" && (
                      <a href={iv.meetingUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary font-medium mt-2 hover:underline">
                        <Video className="h-3 w-3" />
                        Join Meeting
                      </a>
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
