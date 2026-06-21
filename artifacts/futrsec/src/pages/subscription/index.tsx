import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, Check, Sparkles } from "lucide-react";
import { PageHeader, CardSkeleton } from "@/components/page-shell";

interface Subscription {
  plan: string;
  status: string;
}

const PLANS = [
  {
    id: "free", name: "Free", price: "₹0", period: "forever",
    features: ["Access to 2 tracks", "Basic labs", "Community access", "Pre-assessment"],
  },
  {
    id: "pro", name: "Pro", price: "₹999", period: "per month", highlight: true,
    features: ["All 6 tracks", "Unlimited labs & CTF", "AI Career Coach", "Job placement support", "Certificates"],
  },
  {
    id: "elite", name: "Elite", price: "₹2,499", period: "per month",
    features: ["Everything in Pro", "1-on-1 mentorship", "Mock interviews", "Priority placement", "Resume reviews"],
  },
];

export default function SubscriptionPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/subscription"],
    queryFn: () => apiFetch<Subscription>("/api/subscription"),
  });

  const currentPlan = data?.plan ?? "free";

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <PageHeader
        icon={CreditCard}
        title="Subscription"
        subtitle="Choose the plan that fits your career goals"
        actions={!isLoading ? <Badge className="bg-primary/10 text-primary border-primary/20 capitalize">Current: {currentPlan}</Badge> : undefined}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <CardSkeleton key={i} rows={4} />)}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PLANS.map((plan, idx) => {
            const isCurrent = plan.id === currentPlan;
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.06 }}
              >
                <Card className={`relative border-border/60 h-full ${plan.highlight ? "border-primary/40 shadow-md" : "bg-white"}`}>
                  {plan.highlight && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-white border-primary gap-1 text-[10px]"><Sparkles className="h-3 w-3" />Popular</Badge>
                    </div>
                  )}
                  <CardContent className="p-5">
                    <h3 className="font-heading font-bold text-lg text-foreground">{plan.name}</h3>
                    <div className="flex items-baseline gap-1 mt-1 mb-4">
                      <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                      <span className="text-xs text-muted-foreground">{plan.period}</span>
                    </div>
                    <ul className="space-y-2 mb-5">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />{f}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full"
                      variant={plan.highlight ? "default" : "outline"}
                      disabled={isCurrent}
                    >
                      {isCurrent ? "Current Plan" : `Upgrade to ${plan.name}`}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground mt-6">
        View your billing history in <Link href="/payments" className="text-primary hover:underline">Payments</Link>
      </p>
    </div>
  );
}
