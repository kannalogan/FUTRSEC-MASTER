import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Receipt, IndianRupee, Download, CheckCircle2, Clock, XCircle } from "lucide-react";
import { PageHeader, CardSkeleton, EmptyState } from "@/components/page-shell";

interface Payment {
  id: number;
  amount: number;
  currency: string | null;
  status: string;
  description: string | null;
  createdAt: string;
}

const STATUS_META: Record<string, { color: string; icon: typeof CheckCircle2 }> = {
  succeeded: { color: "#10B981", icon: CheckCircle2 },
  completed: { color: "#10B981", icon: CheckCircle2 },
  pending: { color: "#F59E0B", icon: Clock },
  failed: { color: "#EF4444", icon: XCircle },
};

export default function PaymentsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/payments"],
    queryFn: () => apiFetch<Payment[]>("/api/payments"),
  });

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <PageHeader icon={Receipt} title="Payments" subtitle="Your billing history and receipts" />

      {isLoading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <CardSkeleton key={i} rows={1} />)}</div>
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No payments yet"
          description="Your payment history will appear here once you upgrade your plan."
          action={<Link href="/subscription"><Button size="sm">View Plans</Button></Link>}
        />
      ) : (
        <div className="space-y-2">
          {data.map((p, idx) => {
            const meta = STATUS_META[p.status] ?? STATUS_META.pending;
            const Icon = meta.icon;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.03 }}
              >
                <Card className="bg-card border-border/60">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${meta.color}15` }}>
                      <Icon className="h-[18px] w-[18px]" style={{ color: meta.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{p.description ?? "Payment"}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {new Date(p.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-foreground flex items-center gap-0.5 justify-end">
                        <IndianRupee className="h-3 w-3" />{(p.amount / 100).toLocaleString("en-IN")}
                      </p>
                      <Badge className="text-[9px] mt-0.5 capitalize" style={{ backgroundColor: `${meta.color}15`, color: meta.color, borderColor: `${meta.color}30` }}>
                        {p.status}
                      </Badge>
                    </div>
                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" title="Download receipt">
                      <Download className="h-3.5 w-3.5" />
                    </Button>
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
