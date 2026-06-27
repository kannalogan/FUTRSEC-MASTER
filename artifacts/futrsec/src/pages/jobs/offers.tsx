import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Gift, IndianRupee, Calendar, FileText, Building } from "lucide-react";
import { PageHeader, GridSkeleton, EmptyState } from "@/components/page-shell";

const STATUS_META: Record<string, { label: string; color: string }> = {
  sent: { label: "Received", color: "#2563EB" },
  accepted: { label: "Accepted", color: "#10B981" },
  declined: { label: "Declined", color: "#EF4444" },
  expired: { label: "Expired", color: "#94a3b8" },
};

interface Offer {
  id: number;
  jobId: number;
  status: string;
  createdAt: string;
  expiresAt: string | null;
  salary: number | null;
  joiningDate: string | null;
  offerLetterUrl: string | null;
  jobTitle: string | null;
}

export default function OffersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/offers"],
    queryFn: () => apiFetch<Offer[]>("/api/offers"),
  });

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <PageHeader
        icon={Gift}
        title="Offer Tracker"
        subtitle="Manage and compare your job offers"
        actions={data && data.length > 0 ? <Badge className="bg-success/10 text-success border border-success/30">{data.length} offers</Badge> : undefined}
      />

      {isLoading ? (
        <GridSkeleton cols={1} rows={3} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={Gift}
          title="No offers yet"
          description="When employers extend offers, you'll be able to track and compare them here."
          action={<Link href="/jobs"><Button size="sm">Browse Jobs</Button></Link>}
        />
      ) : (
        <div className="space-y-3">
          {data.map((offer, idx) => {
            const meta = STATUS_META[offer.status] ?? STATUS_META.sent;
            return (
              <motion.div
                key={offer.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.04 }}
              >
                <Card className="bg-card border-border/60 overflow-hidden">
                  <div className="h-1.5" style={{ backgroundColor: meta.color }} />
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                          <Building className="h-5 w-5 text-success" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm text-foreground">{offer.jobTitle ?? `Job #${offer.jobId}`}</h3>
                          <p className="text-xs text-muted-foreground">
                            Received {new Date(offer.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge
                        className="text-[10px] shrink-0"
                        style={{ backgroundColor: `${meta.color}15`, color: meta.color, borderColor: `${meta.color}30` }}
                      >
                        {meta.label}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      {offer.salary != null && (
                        <div className="rounded-lg bg-muted/50 p-3">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                            <IndianRupee className="h-3 w-3" />
                            Annual CTC
                          </div>
                          <p className="text-sm font-bold text-foreground">
                            ₹{(offer.salary / 100000).toFixed(1)} LPA
                          </p>
                        </div>
                      )}
                      {offer.joiningDate && (
                        <div className="rounded-lg bg-muted/50 p-3">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                            <Calendar className="h-3 w-3" />
                            Joining
                          </div>
                          <p className="text-sm font-bold text-foreground">{offer.joiningDate}</p>
                        </div>
                      )}
                    </div>
                    {offer.offerLetterUrl && (
                      <a href={offer.offerLetterUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                        <FileText className="h-3 w-3" />
                        View Offer Letter
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
