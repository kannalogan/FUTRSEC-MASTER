import { useState } from "react";
import {
  useCoupons, useCreateCoupon, type Coupon, type CreateCouponBody,
} from "@/lib/subscription-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { PageHeader, CardSkeleton, EmptyState } from "@/components/page-shell";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Gift, Plus, Tag } from "lucide-react";

const DISCOUNT_TYPES = [
  { value: "percent", label: "Percentage (%)" },
  { value: "fixed", label: "Fixed (₹)" },
];

const PLANS = [
  { value: "premium_soc", label: "Premium — SOC" },
  { value: "premium_vapt", label: "Premium — VAPT" },
  { value: "premium_grc", label: "Premium — GRC" },
  { value: "corporate", label: "Corporate" },
];
const NO_PLAN = "__all__";

interface FormState {
  code: string;
  description: string;
  discountType: string;
  discountValue: string;
  plan: string;
  maxRedemptions: string;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  code: "",
  description: "",
  discountType: "percent",
  discountValue: "",
  plan: NO_PLAN,
  maxRedemptions: "",
  validFrom: "",
  validUntil: "",
  isActive: true,
};

function fmtDiscount(c: Coupon): string {
  return c.discountType === "percent"
    ? `${c.discountValue}%`
    : `₹${(c.discountValue / 100).toLocaleString("en-IN")}`;
}

function fmtDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "—" : format(d, "dd MMM yyyy");
}

export default function AdminCouponsPage() {
  const { toast } = useToast();
  const { data, isLoading } = useCoupons();
  const createMut = useCreateCoupon();

  const coupons = data?.coupons ?? [];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const save = () => {
    const code = form.code.trim().toUpperCase();
    if (code.length < 2) {
      toast({ title: "Coupon code is required", variant: "destructive" });
      return;
    }
    const value = Number(form.discountValue);
    if (!Number.isFinite(value) || value <= 0) {
      toast({ title: "Enter a valid discount value", variant: "destructive" });
      return;
    }
    if (form.discountType === "percent" && value > 100) {
      toast({ title: "Percentage cannot exceed 100", variant: "destructive" });
      return;
    }

    const body: CreateCouponBody = {
      code,
      description: form.description.trim() || undefined,
      discountType: form.discountType,
      discountValue:
        form.discountType === "fixed" ? Math.round(value * 100) : Math.round(value),
      plan: form.plan === NO_PLAN ? undefined : form.plan,
      maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : undefined,
      validFrom: form.validFrom ? new Date(form.validFrom).toISOString() : undefined,
      validUntil: form.validUntil ? new Date(form.validUntil).toISOString() : undefined,
      isActive: form.isActive,
    };

    createMut.mutate(body, {
      onSuccess: () => {
        toast({ title: "Coupon created" });
        setDialogOpen(false);
      },
      onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
    });
  };

  return (
    <div>
      <PageHeader
        title="Coupons"
        subtitle="Create & manage discount coupons"
        icon={Gift}
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" /> Create Coupon
          </Button>
        }
      />

      {isLoading ? (
        <CardSkeleton rows={6} />
      ) : coupons.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="No coupons yet"
          description="Create your first discount coupon to offer to students."
          action={<Button onClick={openCreate}><Plus className="h-4 w-4 mr-1.5" /> Create Coupon</Button>}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Redemptions</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono font-medium">{c.code}</TableCell>
                    <TableCell>{fmtDiscount(c)}</TableCell>
                    <TableCell className="text-muted-foreground capitalize">
                      {c.plan ? c.plan.replace(/_/g, " ") : "All plans"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.timesRedeemed}
                      {c.maxRedemptions != null ? ` / ${c.maxRedemptions}` : ""}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{fmtDate(c.validUntil)}</TableCell>
                    <TableCell>
                      <Badge variant={c.isActive ? "secondary" : "outline"}>
                        {c.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Coupon</DialogTitle>
            <DialogDescription>Set up a new discount coupon for subscription plans.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="c-code">Code</Label>
              <Input
                id="c-code"
                value={form.code}
                onChange={(e) => set("code", e.target.value.toUpperCase())}
                placeholder="WELCOME10"
                className="font-mono"
              />
            </div>
            <div>
              <Label htmlFor="c-desc">Description</Label>
              <Textarea id="c-desc" value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Discount Type</Label>
                <Select value={form.discountType} onValueChange={(v) => set("discountType", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DISCOUNT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="c-value">
                  {form.discountType === "percent" ? "Percentage" : "Amount (₹)"}
                </Label>
                <Input
                  id="c-value"
                  type="number"
                  min={0}
                  value={form.discountValue}
                  onChange={(e) => set("discountValue", e.target.value)}
                  placeholder={form.discountType === "percent" ? "10" : "500"}
                />
              </div>
            </div>
            <div>
              <Label>Applies To</Label>
              <Select value={form.plan} onValueChange={(v) => set("plan", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PLAN}>All plans</SelectItem>
                  {PLANS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="c-max">Max Redemptions</Label>
              <Input
                id="c-max"
                type="number"
                min={0}
                value={form.maxRedemptions}
                onChange={(e) => set("maxRedemptions", e.target.value)}
                placeholder="Unlimited"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="c-from">Valid From</Label>
                <Input id="c-from" type="date" value={form.validFrom} onChange={(e) => set("validFrom", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="c-until">Valid Until</Label>
                <Input id="c-until" type="date" value={form.validUntil} onChange={(e) => set("validUntil", e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch id="c-active" checked={form.isActive} onCheckedChange={(v) => set("isActive", v)} />
              <Label htmlFor="c-active">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={createMut.isPending}>
              {createMut.isPending ? "Saving…" : "Create Coupon"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
