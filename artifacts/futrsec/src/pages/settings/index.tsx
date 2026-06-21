import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Settings as SettingsIcon, Bell, Shield, Save, Lock } from "lucide-react";
import { PageHeader, CardSkeleton } from "@/components/page-shell";
import { useToast } from "@/hooks/use-toast";

interface SettingsData {
  notifications: { email: boolean; push: boolean; marketing: boolean; weeklyDigest: boolean };
  privacy: { profileVisible: boolean; showLeaderboard: boolean };
  theme: string;
}

const NOTIF_LABELS: Record<string, string> = {
  email: "Email notifications",
  push: "Push notifications",
  marketing: "Marketing emails",
  weeklyDigest: "Weekly progress digest",
};
const PRIVACY_LABELS: Record<string, string> = {
  profileVisible: "Make profile visible to employers",
  showLeaderboard: "Show me on the leaderboard",
};

export default function SettingsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [settings, setSettings] = useState<SettingsData | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["/api/settings"],
    queryFn: () => apiFetch<SettingsData>("/api/settings"),
  });

  useEffect(() => { if (data) setSettings(data); }, [data]);

  const save = useMutation({
    mutationFn: (body: SettingsData) => apiFetch("/api/settings", { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Settings saved!", description: "Your preferences have been updated." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading || !settings) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-8">
        <PageHeader icon={SettingsIcon} title="Settings" subtitle="Manage your account preferences" />
        <div className="space-y-4"><CardSkeleton rows={4} /><CardSkeleton rows={2} /></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <PageHeader icon={SettingsIcon} title="Settings" subtitle="Manage your account preferences" />

      <div className="space-y-5">
        <Card className="bg-white border-border/60">
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-3">
            {(Object.keys(settings.notifications) as Array<keyof typeof settings.notifications>).map((key) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm text-foreground">{NOTIF_LABELS[key] ?? key}</span>
                <Switch
                  checked={settings.notifications[key]}
                  onCheckedChange={(v) => setSettings({ ...settings, notifications: { ...settings.notifications, [key]: v } })}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-white border-border/60">
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />Privacy
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-3">
            {(Object.keys(settings.privacy) as Array<keyof typeof settings.privacy>).map((key) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm text-foreground">{PRIVACY_LABELS[key] ?? key}</span>
                <Switch
                  checked={settings.privacy[key]}
                  onCheckedChange={(v) => setSettings({ ...settings, privacy: { ...settings.privacy, [key]: v } })}
                />
              </div>
            ))}
            <Link href="/privacy" className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline pt-1">
              <Lock className="h-3.5 w-3.5" />Manage data & consent in Privacy Center
            </Link>
          </CardContent>
        </Card>

        <Button className="w-full" onClick={() => save.mutate(settings)} disabled={save.isPending}>
          <Save className="h-4 w-4 mr-1.5" />{save.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
