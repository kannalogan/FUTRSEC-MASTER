import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader, EmptyState } from "@/components/page-shell";
import {
  Award, Building, Briefcase, Gift, Clock, CheckCircle2, History, PartyPopper,
} from "lucide-react";
import {
  usePlacementMe,
  usePlacementTimeline,
  STATUS_LABELS,
  STATUS_COLORS,
  type PlacementStage,
} from "@/lib/placement-api";

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_COLORS[status] ?? STATUS_COLORS.applied;
  return (
    <span
      className="text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function TimelineDialog({ stage, onClose }: { stage: PlacementStage | null; onClose: () => void }) {
  const { data, isLoading } = usePlacementTimeline(stage?.applicationId ?? null);

  return (
    <Dialog open={!!stage} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-left">
            <History className="h-5 w-5 text-primary shrink-0" />
            {stage?.job?.title ?? "Application Timeline"}
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
        ) : !data || data.timeline.length === 0 ? (
          <div className="py-8 text-center">
            <Clock className="h-10 w-10 mx-auto text-muted-foreground/20 mb-2" />
            <p className="text-sm text-muted-foreground">No status changes recorded yet.</p>
            <div className="mt-3 flex justify-center"><StatusBadge status={stage?.status ?? "applied"} /></div>
          </div>
        ) : (
          <div className="relative pl-5 space-y-4">
            <div className="absolute left-[6px] top-1 bottom-1 w-px bg-border" />
            {data.timeline.map((t) => (
              <div key={t.id} className="relative">
                <span
                  className="absolute -left-[14px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white"
                  style={{ backgroundColor: (STATUS_COLORS[t.toStatus] ?? STATUS_COLORS.applied).text }}
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge status={t.toStatus} />
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(t.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
                {t.note && <p className="text-xs text-muted-foreground mt-1">{t.note}</p>}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function PlacementPage() {
  const { data, isLoading } = usePlacementMe();
  const [selected, setSelected] = useState<PlacementStage | null>(null);

  if (isLoading) {
    return (
      <div className="p-5 lg:p-8 max-w-5xl mx-auto">
        <PageHeader icon={Award} title="Placement" subtitle="Your placement status & application timelines" />
        <Skeleton className="h-24 rounded-xl mb-6" />
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      </div>
    );
  }

  const placements = data?.placements ?? [];
  const offers = data?.offers ?? [];
  const stages = data?.stages ?? [];
  const isPlaced = data?.isPlaced ?? false;

  return (
    <div className="p-5 lg:p-8 max-w-5xl mx-auto">
      <PageHeader
        icon={Award}
        title="Placement"
        subtitle="Your placement status & application timelines"
        actions={
          isPlaced ? (
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1">
              <PartyPopper className="h-3.5 w-3.5" />Placed
            </Badge>
          ) : undefined
        }
      />

      {/* Placement banner */}
      {placements.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {placements.map((p) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-emerald-200 bg-emerald-50/50">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="h-11 w-11 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                      <PartyPopper className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{p.job?.title ?? "Role"}</p>
                      <p className="text-xs text-muted-foreground">{p.companyName ?? "Company"}</p>
                      {p.packageAmount != null && (
                        <p className="text-sm font-bold text-emerald-700 mt-1">
                          ₹{(p.packageAmount / 100000).toFixed(1)}L p.a.
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Placed on {new Date(p.placedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Offers */}
      {offers.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-3">
            <Gift className="h-4 w-4 text-emerald-500" />Offers
          </h2>
          <div className="space-y-2">
            {offers.map((o) => (
              <Card key={o.id} className="bg-white border-border/60">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                    <Gift className="h-4.5 w-4.5 text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{o.job?.title ?? "Job"}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.salary != null ? `₹${(o.salary / 100000).toFixed(1)}L p.a.` : "Salary undisclosed"}
                      {o.joiningDate && ` · Joins ${new Date(o.joiningDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`}
                    </p>
                  </div>
                  <StatusBadge status={o.status} />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Application stages */}
      <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-3">
        <Briefcase className="h-4 w-4 text-primary" />My Applications
      </h2>
      {stages.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No applications yet"
          description="Apply to roles from the AI Job Agent or Jobs page to track their progress here."
        />
      ) : (
        <div className="space-y-2">
          {stages.map((s) => (
            <motion.div key={s.applicationId} whileHover={{ y: -1 }} transition={{ duration: 0.15 }}>
              <Card
                className="bg-white border-border/60 hover:shadow-md transition-all cursor-pointer"
                onClick={() => setSelected(s)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                    <Building className="h-4.5 w-4.5 text-muted-foreground/60" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{s.job?.title ?? "Job"}</p>
                    <p className="text-xs text-muted-foreground">
                      Applied {new Date(s.appliedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <StatusBadge status={s.status} />
                  <History className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <TimelineDialog stage={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
