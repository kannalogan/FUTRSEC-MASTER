import { useMentorBatches, TRACK_LABELS, TRACK_COLORS } from "@/lib/mentor-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader, GridSkeleton, EmptyState } from "@/components/page-shell";
import { Layers, Users } from "lucide-react";

const STATUS_STYLE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  upcoming: "bg-blue-100 text-blue-700",
  completed: "bg-muted text-foreground",
  archived: "bg-muted text-muted-foreground",
};

export default function MentorBatchesPage() {
  const { data, isLoading } = useMentorBatches();
  const batches = data?.batches ?? [];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader icon={Layers} title="Assigned Batches" subtitle="Cohorts you lead. Batch membership is managed by admins." />

      {isLoading ? (
        <GridSkeleton cols={3} rows={2} />
      ) : batches.length === 0 ? (
        <EmptyState icon={Layers} title="No batches assigned" description="An admin assigns you to batches." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {batches.map((b) => (
            <Card key={b.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-foreground">{b.name}</h3>
                    {b.code && <p className="text-xs text-muted-foreground mt-0.5">{b.code}</p>}
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[b.status] ?? STATUS_STYLE.upcoming}`}>
                    {b.status}
                  </span>
                </div>
                {b.description && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{b.description}</p>}
                <div className="flex items-center justify-between">
                  <Badge style={{ backgroundColor: `${TRACK_COLORS[b.careerTrack]}20`, color: TRACK_COLORS[b.careerTrack] }} className="border-0">
                    {TRACK_LABELS[b.careerTrack] ?? b.careerTrack}
                  </Badge>
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Users className="h-3.5 w-3.5" /> {b.studentCount}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
