import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageHeader, CardSkeleton } from "@/components/page-shell";
import { useToast } from "@/hooks/use-toast";
import {
  Send, Lock, Sparkles, ShieldCheck, Play, Crown, CheckCircle2, AlertCircle,
} from "lucide-react";
import {
  useAutoApply,
  useUpdateAutoApply,
  useRunAutoApply,
  type AutoApplyUpdate,
} from "@/lib/job-agent-api";

const WORK_MODES = [
  { value: "any", label: "Any" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "On-site" },
];
const COMPANY_SIZES = [
  { value: "any", label: "Any" },
  { value: "startup", label: "Startup" },
  { value: "mid", label: "Mid-size" },
  { value: "enterprise", label: "Enterprise" },
];

export default function JobAgentAutoApplyPage() {
  const { toast } = useToast();
  const { data, isLoading } = useAutoApply();
  const updateMut = useUpdateAutoApply();
  const runMut = useRunAutoApply();

  const [form, setForm] = useState<AutoApplyUpdate>({
    enabled: false,
    minSalary: null,
    preferredLocation: "",
    workMode: "any",
    companySize: "any",
  });

  useEffect(() => {
    if (data?.settings) {
      setForm({
        enabled: data.settings.enabled,
        minSalary: data.settings.minSalary,
        preferredLocation: data.settings.preferredLocation ?? "",
        workMode: data.settings.workMode ?? "any",
        companySize: data.settings.companySize ?? "any",
      });
    }
  }, [data?.settings]);

  const eligibility = data?.eligibility;
  const locked = eligibility ? !eligibility.eligible : true;

  const handleSave = () => {
    updateMut.mutate(form, {
      onSuccess: () => toast({ title: "Preferences saved", description: "Your auto-apply settings have been updated." }),
      onError: (e: Error) => {
        let msg = e.message;
        try {
          const parsed = JSON.parse(e.message);
          if (parsed?.error) msg = parsed.error;
        } catch { /* keep raw */ }
        toast({ title: "Could not save", description: msg, variant: "destructive" });
      },
    });
  };

  const handleToggle = (checked: boolean) => {
    if (checked && locked) {
      toast({
        title: "Feature locked",
        description: eligibility?.lockReason ?? "Upgrade to premium to enable auto-apply.",
        variant: "destructive",
      });
      return;
    }
    setForm((f) => ({ ...f, enabled: checked }));
  };

  const handleRun = () => {
    runMut.mutate(undefined, {
      onSuccess: (res) => toast({
        title: res.count > 0 ? `Applied to ${res.count} role${res.count === 1 ? "" : "s"} 🎉` : "No new matches",
        description: res.count > 0 ? "Track them in your Placement timeline." : "We'll keep watching for matching roles.",
      }),
      onError: (e: Error) => toast({ title: "Run failed", description: e.message, variant: "destructive" }),
    });
  };

  return (
    <div className="p-5 lg:p-8 max-w-3xl mx-auto">
      <PageHeader
        icon={Send}
        title="Auto-Apply"
        subtitle="Let the AI Job Agent apply to your top track-matched roles"
        actions={
          <Link href="/job-agent">
            <Button variant="ghost" size="sm">Back to Agent</Button>
          </Link>
        }
      />

      {isLoading ? (
        <div className="space-y-4">
          <CardSkeleton rows={4} />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Eligibility / lock state */}
          {locked ? (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="p-5 flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <Lock className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    Auto-Apply is locked
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {eligibility?.lockReason ?? "This is a premium feature."}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className={`text-[11px] px-2 py-1 rounded-full flex items-center gap-1 ${eligibility?.isPremium ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                      {eligibility?.isPremium ? <CheckCircle2 className="h-3 w-3" /> : <Crown className="h-3 w-3" />}
                      Premium plan
                    </span>
                    <span className={`text-[11px] px-2 py-1 rounded-full flex items-center gap-1 ${eligibility?.cp5Complete ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                      {eligibility?.cp5Complete ? <CheckCircle2 className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
                      Checkpoint CP5
                    </span>
                    {eligibility?.isTrial && (
                      <span className="text-[11px] px-2 py-1 rounded-full flex items-center gap-1 bg-amber-100 text-amber-700">
                        <AlertCircle className="h-3 w-3" />Trial plan
                      </span>
                    )}
                  </div>
                  {!eligibility?.isPremium && (
                    <Link href="/subscription">
                      <Button size="sm" className="mt-3 gap-1.5">
                        <Sparkles className="h-4 w-4" />Upgrade to Premium
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-emerald-200 bg-emerald-50/40">
              <CardContent className="p-4 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <p className="text-sm text-foreground">
                  You're eligible for Auto-Apply. Configure your filters below.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Settings */}
          <Card className="bg-white border-border/60">
            <CardContent className="p-5 space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label className="text-sm font-semibold">Enable Auto-Apply</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Automatically apply to top track-matched roles that fit your filters.
                  </p>
                </div>
                <Switch
                  checked={!!form.enabled}
                  onCheckedChange={handleToggle}
                  disabled={locked}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Minimum Salary (₹ LPA)</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="e.g. 6"
                    value={form.minSalary != null ? form.minSalary / 100000 : ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm((f) => ({ ...f, minSalary: v === "" ? null : Math.round(parseFloat(v) * 100000) }));
                    }}
                    disabled={locked}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Preferred Location</Label>
                  <Input
                    placeholder="e.g. Bengaluru"
                    value={form.preferredLocation ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, preferredLocation: e.target.value }))}
                    disabled={locked}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Work Mode</Label>
                  <Select
                    value={form.workMode ?? "any"}
                    onValueChange={(v) => setForm((f) => ({ ...f, workMode: v }))}
                    disabled={locked}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {WORK_MODES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Company Size</Label>
                  <Select
                    value={form.companySize ?? "any"}
                    onValueChange={(v) => setForm((f) => ({ ...f, companySize: v }))}
                    disabled={locked}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COMPANY_SIZES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button onClick={handleSave} disabled={locked || updateMut.isPending}>
                  {updateMut.isPending ? "Saving…" : "Save Preferences"}
                </Button>
                <Button
                  variant="outline"
                  className="gap-1.5"
                  onClick={handleRun}
                  disabled={locked || !form.enabled || runMut.isPending}
                >
                  <Play className="h-4 w-4" />
                  {runMut.isPending ? "Running…" : "Run Auto-Apply Now"}
                </Button>
                {form.enabled && !locked && (
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Active</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
