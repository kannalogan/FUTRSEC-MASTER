import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader, CardSkeleton, EmptyState } from "@/components/page-shell";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  CreditCard, Check, Sparkles, Crown, Receipt, FileText, Tag, CheckCircle2, XCircle,
} from "lucide-react";
import {
  useSubscriptionMe,
  usePlans,
  useSubscriptionPayments,
  useSubscriptionInvoices,
  useStartTrial,
  useChangePlan,
  useValidateCoupon,
  type Plan,
  type CouponValidation,
} from "@/lib/subscription-api";

function rupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function PlanCard({
  plan, isCurrent, eligible, onChoose,
}: {
  plan: Plan;
  isCurrent: boolean;
  eligible: boolean;
  onChoose: (plan: Plan) => void;
}) {
  const highlight = plan.id.startsWith("premium");
  return (
    <Card className={`relative border-border/60 h-full ${highlight ? "border-primary/40 shadow-md" : "bg-card"}`}>
      {highlight && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-white border-primary gap-1 text-[10px]">
            <Sparkles className="h-3 w-3" />Premium
          </Badge>
        </div>
      )}
      <CardContent className="p-5 flex flex-col h-full">
        <h3 className="font-heading font-bold text-lg text-foreground">{plan.name}</h3>
        <p className="text-xs text-muted-foreground mt-0.5 min-h-[2rem]">{plan.description}</p>
        <div className="flex items-baseline gap-1 mt-2 mb-4">
          <span className="text-2xl font-bold text-foreground">
            {plan.isTrial || plan.price === 0 ? "Free" : rupees(plan.price)}
          </span>
          {!plan.isTrial && plan.price > 0 && (
            <span className="text-xs text-muted-foreground">/ {plan.durationDays}d</span>
          )}
          {plan.isTrial && <span className="text-xs text-muted-foreground">{plan.durationDays}-day trial</span>}
        </div>
        <ul className="space-y-2 mb-5 flex-1">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
              <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />{f}
            </li>
          ))}
        </ul>
        <Button
          className="w-full"
          variant={highlight ? "default" : "outline"}
          disabled={isCurrent || !eligible}
          onClick={() => onChoose(plan)}
        >
          {isCurrent ? "Current Plan" : !eligible ? "Not available" : plan.isTrial ? "Start Trial" : "Choose Plan"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function SubscriptionPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const careerTrack = user?.careerTrack ?? null;

  const { data: meData, isLoading: meLoading } = useSubscriptionMe();
  const { data: plansData, isLoading: plansLoading } = usePlans();
  const { data: paymentsData } = useSubscriptionPayments();
  const { data: invoicesData } = useSubscriptionInvoices();

  const startTrial = useStartTrial();
  const changePlan = useChangePlan();
  const validateCoupon = useValidateCoupon();

  const [dialogPlan, setDialogPlan] = useState<Plan | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [billingName, setBillingName] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState("");
  const [couponResult, setCouponResult] = useState<CouponValidation | null>(null);

  const currentPlanId = meData?.subscription?.plan ?? null;
  const currentStatus = meData?.subscription?.status ?? null;

  // Track isolation: only show plans that are track-agnostic or match the student's track.
  const plans = (plansData?.plans ?? []).filter(
    (p) => p.careerTrack == null || p.careerTrack === careerTrack
  );

  const openChoose = (plan: Plan) => {
    if (plan.isTrial) {
      startTrial.mutate(undefined, {
        onSuccess: () => toast({ title: "Trial started 🎉", description: "Enjoy your premium access." }),
        onError: (e: Error) => toast({ title: "Could not start trial", description: e.message, variant: "destructive" }),
      });
      return;
    }
    setDialogPlan(plan);
    setCouponCode("");
    setCouponResult(null);
    setBillingName(user?.fullName ?? "");
    setGstNumber("");
    setPlaceOfSupply("");
  };

  const handleValidateCoupon = () => {
    if (!couponCode.trim() || !dialogPlan) return;
    validateCoupon.mutate(
      { code: couponCode.trim(), plan: dialogPlan.id },
      {
        onSuccess: (res) => {
          setCouponResult(res);
          if (!res.valid) toast({ title: "Invalid coupon", description: res.reason ?? "This coupon can't be applied.", variant: "destructive" });
        },
        onError: (e: Error) => {
          setCouponResult({ valid: false, reason: e.message });
          toast({ title: "Coupon error", description: e.message, variant: "destructive" });
        },
      }
    );
  };

  const handleConfirmChange = () => {
    if (!dialogPlan) return;
    changePlan.mutate(
      {
        plan: dialogPlan.id,
        couponCode: couponResult?.valid ? couponCode.trim() : undefined,
        billingName: billingName.trim() || undefined,
        gstNumber: gstNumber.trim() || undefined,
        placeOfSupply: placeOfSupply.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast({ title: "Plan updated 🎉", description: "Your subscription and invoice are ready." });
          setDialogPlan(null);
        },
        onError: (e: Error) => toast({ title: "Could not change plan", description: e.message, variant: "destructive" }),
      }
    );
  };

  const payments = paymentsData?.payments ?? [];
  const invoices = invoicesData?.invoices ?? [];

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <PageHeader
        icon={CreditCard}
        title="Subscription"
        subtitle="Manage your plan, billing and invoices"
        actions={
          !meLoading && currentPlanId ? (
            <Badge className="bg-primary/10 text-primary border-primary/20 capitalize gap-1">
              <Crown className="h-3.5 w-3.5" />
              {currentPlanId.replace("_", " ")}{currentStatus ? ` · ${currentStatus}` : ""}
            </Badge>
          ) : undefined
        }
      />

      <Tabs defaultValue="plans">
        <TabsList className="mb-4">
          <TabsTrigger value="plans" className="text-xs gap-1.5"><Sparkles className="h-3.5 w-3.5" />Plans</TabsTrigger>
          <TabsTrigger value="payments" className="text-xs gap-1.5"><Receipt className="h-3.5 w-3.5" />Payments</TabsTrigger>
          <TabsTrigger value="invoices" className="text-xs gap-1.5"><FileText className="h-3.5 w-3.5" />Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="plans">
          {plansLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <CardSkeleton key={i} rows={4} />)}</div>
          ) : plans.length === 0 ? (
            <EmptyState icon={Sparkles} title="No plans available" description="Plans for your track will appear here soon." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
              {plans.map((plan, idx) => (
                <motion.div key={plan.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: idx * 0.06 }}>
                  <PlanCard
                    plan={plan}
                    isCurrent={plan.id === currentPlanId}
                    eligible={plan.careerTrack == null || plan.careerTrack === careerTrack}
                    onChoose={openChoose}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="payments">
          {!paymentsData ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
          ) : payments.length === 0 ? (
            <EmptyState icon={Receipt} title="No payments yet" description="Your payment history will appear here." />
          ) : (
            <div className="space-y-2">
              {payments.map((p) => (
                <Card key={p.id} className="bg-card border-border/60">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                      <Receipt className="h-4.5 w-4.5 text-muted-foreground/60" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{rupees(p.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.gateway} · {new Date(p.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <Badge variant={p.status === "success" || p.status === "paid" ? "default" : "secondary"} className="capitalize text-[10px]">
                      {p.status}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="invoices">
          {!invoicesData ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
          ) : invoices.length === 0 ? (
            <EmptyState icon={FileText} title="No invoices yet" description="GST invoices will appear here after a purchase." />
          ) : (
            <div className="space-y-2">
              {invoices.map((inv) => (
                <Card key={inv.id} className="bg-card border-border/60">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                      <FileText className="h-4.5 w-4.5 text-muted-foreground/60" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{inv.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {rupees(inv.totalAmount)} (incl. {rupees(inv.tax)} GST) · {new Date(inv.issuedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    {inv.s3Key ? (
                      <a href={inv.s3Key} target="_blank" rel="noreferrer">
                        <Button variant="outline" size="sm" className="gap-1.5"><FileText className="h-4 w-4" />Download</Button>
                      </a>
                    ) : (
                      <Button variant="outline" size="sm" disabled className="gap-1.5"><FileText className="h-4 w-4" />Download</Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Change plan dialog */}
      <Dialog open={!!dialogPlan} onOpenChange={(o) => !o && setDialogPlan(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              Subscribe to {dialogPlan?.name}
            </DialogTitle>
          </DialogHeader>
          {dialogPlan && (
            <div className="space-y-4">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">Base price</span>
                <span className="text-lg font-bold text-foreground">{rupees(dialogPlan.price)}</span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1"><Tag className="h-3.5 w-3.5" />Coupon code</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. WELCOME20"
                    value={couponCode}
                    onChange={(e) => { setCouponCode(e.target.value); setCouponResult(null); }}
                  />
                  <Button variant="outline" onClick={handleValidateCoupon} disabled={!couponCode.trim() || validateCoupon.isPending}>
                    Apply
                  </Button>
                </div>
                {couponResult && (
                  <p className={`text-xs flex items-center gap-1 ${couponResult.valid ? "text-emerald-600" : "text-destructive"}`}>
                    {couponResult.valid ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                    {couponResult.valid
                      ? `Discount ${couponResult.discount != null ? rupees(couponResult.discount) : ""} applied`
                      : couponResult.reason ?? "Invalid coupon"}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Billing name</Label>
                  <Input value={billingName} onChange={(e) => setBillingName(e.target.value)} placeholder="Full name" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">GST number (optional)</Label>
                    <Input value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} placeholder="GSTIN" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Place of supply</Label>
                    <Input value={placeOfSupply} onChange={(e) => setPlaceOfSupply(e.target.value)} placeholder="State" />
                  </div>
                </div>
              </div>

              {couponResult?.valid && couponResult.finalAmount != null && (
                <div className="flex items-baseline justify-between border-t border-border/60 pt-3">
                  <span className="text-sm font-medium text-foreground">Payable (excl. GST)</span>
                  <span className="text-lg font-bold text-primary">{rupees(couponResult.finalAmount)}</span>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogPlan(null)}>Cancel</Button>
            <Button onClick={handleConfirmChange} disabled={changePlan.isPending}>
              {changePlan.isPending ? "Processing…" : "Confirm & Pay"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
