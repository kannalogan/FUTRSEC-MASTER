import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import { PageHeader, CardSkeleton } from "@/components/page-shell";
import { useToast } from "@/hooks/use-toast";
import { Settings, KeyRound, ShieldCheck } from "lucide-react";

interface PlatformSettings {
  trialDays: number | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  termsContent: string | null;
  privacyContent: string | null;
  refundContent: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactAddress: string | null;
}

interface SettingsResponse {
  settings: PlatformSettings;
}

interface SecretStatus {
  key: string;
  configured: boolean;
}

interface SecretsResponse {
  secrets: SecretStatus[];
}

interface FormState {
  trialDays: string;
  logoUrl: string;
  bannerUrl: string;
  termsContent: string;
  privacyContent: string;
  refundContent: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
}

const EMPTY_FORM: FormState = {
  trialDays: "",
  logoUrl: "",
  bannerUrl: "",
  termsContent: "",
  privacyContent: "",
  refundContent: "",
  contactEmail: "",
  contactPhone: "",
  contactAddress: "",
};

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/settings"],
    queryFn: () => apiFetch<SettingsResponse>("/api/admin/settings"),
  });

  const { data: secretsData, isLoading: secretsLoading } = useQuery({
    queryKey: ["/api/admin/settings/secrets"],
    queryFn: () => apiFetch<SecretsResponse>("/api/admin/settings/secrets"),
  });

  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  useEffect(() => {
    if (data?.settings) {
      const s = data.settings;
      setForm({
        trialDays: s.trialDays != null ? String(s.trialDays) : "",
        logoUrl: s.logoUrl ?? "",
        bannerUrl: s.bannerUrl ?? "",
        termsContent: s.termsContent ?? "",
        privacyContent: s.privacyContent ?? "",
        refundContent: s.refundContent ?? "",
        contactEmail: s.contactEmail ?? "",
        contactPhone: s.contactPhone ?? "",
        contactAddress: s.contactAddress ?? "",
      });
    }
  }, [data]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const saveMut = useMutation({
    mutationFn: (vars: Record<string, unknown>) =>
      apiFetch("/api/admin/settings", { method: "PUT", body: JSON.stringify(vars) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({ title: "Settings saved" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const save = () => {
    saveMut.mutate({
      trialDays: form.trialDays ? Number(form.trialDays) : 0,
      logoUrl: form.logoUrl.trim() || null,
      bannerUrl: form.bannerUrl.trim() || null,
      termsContent: form.termsContent || null,
      privacyContent: form.privacyContent || null,
      refundContent: form.refundContent || null,
      contactEmail: form.contactEmail.trim() || null,
      contactPhone: form.contactPhone.trim() || null,
      contactAddress: form.contactAddress.trim() || null,
    });
  };

  const secrets = secretsData?.secrets ?? [];

  return (
    <div>
      <PageHeader
        icon={Settings}
        title="Platform Settings"
        subtitle="Manage general configuration, legal content and integration secrets."
      />

      {isLoading ? (
        <CardSkeleton rows={6} />
      ) : (
        <Tabs defaultValue="general">
          <TabsList className="mb-6">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="legal">Legal</TabsTrigger>
            <TabsTrigger value="secrets">Secrets</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="max-w-xs">
                  <Label htmlFor="s-trial">Trial Days</Label>
                  <Input
                    id="s-trial"
                    type="number"
                    min={0}
                    value={form.trialDays}
                    onChange={(e) => set("trialDays", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="s-logo">Logo URL</Label>
                    <Input id="s-logo" value={form.logoUrl} onChange={(e) => set("logoUrl", e.target.value)} placeholder="https://…" />
                  </div>
                  <div>
                    <Label htmlFor="s-banner">Banner URL</Label>
                    <Input id="s-banner" value={form.bannerUrl} onChange={(e) => set("bannerUrl", e.target.value)} placeholder="https://…" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="s-email">Contact Email</Label>
                    <Input id="s-email" type="email" value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="s-phone">Contact Phone</Label>
                    <Input id="s-phone" value={form.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="s-address">Contact Address</Label>
                  <Textarea id="s-address" value={form.contactAddress} onChange={(e) => set("contactAddress", e.target.value)} rows={2} />
                </div>
                <div className="flex justify-end">
                  <Button onClick={save} disabled={saveMut.isPending}>
                    {saveMut.isPending ? "Saving…" : "Save Settings"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="legal">
            <Card>
              <CardContent className="p-5 space-y-4">
                <div>
                  <Label htmlFor="s-terms">Terms of Service</Label>
                  <Textarea id="s-terms" value={form.termsContent} onChange={(e) => set("termsContent", e.target.value)} rows={6} />
                </div>
                <div>
                  <Label htmlFor="s-privacy">Privacy Policy</Label>
                  <Textarea id="s-privacy" value={form.privacyContent} onChange={(e) => set("privacyContent", e.target.value)} rows={6} />
                </div>
                <div>
                  <Label htmlFor="s-refund">Refund Policy</Label>
                  <Textarea id="s-refund" value={form.refundContent} onChange={(e) => set("refundContent", e.target.value)} rows={6} />
                </div>
                <div className="flex justify-end">
                  <Button onClick={save} disabled={saveMut.isPending}>
                    {saveMut.isPending ? "Saving…" : "Save Settings"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="secrets">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground mb-4">
                  <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>Secrets are managed via environment variables, never stored in the database.</span>
                </div>
                {secretsLoading ? (
                  <CardSkeleton rows={5} />
                ) : (
                  <div className="divide-y divide-border">
                    {secrets.map((s) => (
                      <div key={s.key} className="flex items-center justify-between py-3">
                        <span className="flex items-center gap-2 font-mono text-sm">
                          <KeyRound className="h-4 w-4 text-muted-foreground" />
                          {s.key}
                        </span>
                        {s.configured ? (
                          <Badge className="bg-success/10 text-success border border-success/30">Configured</Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">Not set</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
