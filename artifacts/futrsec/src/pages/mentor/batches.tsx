import { useMentorBatches, TRACK_LABELS, TRACK_COLORS } from "@/lib/mentor-api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader, GridSkeleton, EmptyState } from "@/components/page-shell";
import { Layers, Users, Calendar, MapPin } from "lucide-react";
import { motion } from "framer-motion";

const STATUS_STYLE: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  upcoming: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  completed: "bg-muted text-foreground border-border",
  archived: "bg-muted/50 text-muted-foreground border-border/50",
};

export default function MentorBatchesPage() {
  const { data, isLoading } = useMentorBatches();
  const batches = data?.batches ?? [];

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <PageHeader icon={Layers} title="Assigned Batches" subtitle="Cohorts you lead. Batch membership is managed by admins." />
      </motion.div>

      {isLoading ? (
        <GridSkeleton cols={3} rows={2} />
      ) : batches.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <EmptyState icon={Layers} title="No batches assigned" description="An admin assigns you to batches." />
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {batches.map((b, i) => (
            <motion.div key={b.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.05 }}>
              <Card className="glass-card hover-lift h-full flex flex-col group border-border/60">
                <CardHeader className="p-5 pb-0">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="text-card-title text-foreground line-clamp-1">{b.name}</h3>
                      {b.code && (
                        <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          <span className="font-mono">{b.code}</span>
                        </div>
                      )}
                    </div>
                    <Badge variant="outline" className={`shrink-0 text-xs uppercase tracking-wider py-0.5 px-2 ${STATUS_STYLE[b.status] ?? STATUS_STYLE.upcoming}`}>
                      {b.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-5 pt-3 flex-1 flex flex-col justify-between space-y-5">
                  {b.description ? (
                    <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">{b.description}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground/50 italic">No description provided.</p>
                  )}
                  
                  <div className="space-y-4 pt-2 border-t border-border/50">
                    {b.startDate && (
                      <div className="flex items-center text-sm text-muted-foreground gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Starts {new Date(b.startDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" style={{ borderColor: `${TRACK_COLORS[b.careerTrack]}50`, color: TRACK_COLORS[b.careerTrack], backgroundColor: `${TRACK_COLORS[b.careerTrack]}10` }} className="text-xs py-1 px-2.5">
                        {TRACK_LABELS[b.careerTrack] ?? b.careerTrack}
                      </Badge>
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted/50 text-sm font-medium text-foreground">
                        <Users className="h-4 w-4 text-primary" />
                        <span>{b.studentCount}</span>
                      </div>
                    </div>
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
