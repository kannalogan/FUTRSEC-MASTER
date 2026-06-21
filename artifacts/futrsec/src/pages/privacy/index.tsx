import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useGetConsentStatus, useWithdrawConsent, useRequestDataDeletion, useRequestDataCorrection, ConsentWithdrawInputConsentType } from "@workspace/api-client-react";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield, CheckCircle2, AlertTriangle, FileDown, Trash2, Edit3,
  Clock, Eye, Lock, Database, Globe, ToggleLeft, History,
  AlertCircle, ChevronRight, Info, Cookie, FileText, ScrollText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

type CookiePrefs = { necessary: boolean; analytics: boolean; marketing: boolean; functional: boolean; updatedAt?: string };

const COOKIE_TYPES: Array<{ key: keyof CookiePrefs; label: string; description: string; locked?: boolean }> = [
  { key: "necessary", label: "Strictly Necessary", description: "Required for authentication, security and core functionality. Always on.", locked: true },
  { key: "functional", label: "Functional", description: "Remember your preferences such as theme and layout for a better experience." },
  { key: "analytics", label: "Analytics", description: "Help us understand usage to improve learning outcomes (anonymized)." },
  { key: "marketing", label: "Marketing", description: "Used to show relevant opportunities and measure campaign effectiveness." },
];

const DATA_CATEGORIES = [
  { name: "Profile Information", description: "Your name, email, phone, and professional details", purpose: "Account management and personalization", retention: "Until deletion request" },
  { name: "Learning Progress", description: "Module completions, lesson progress, quiz scores", purpose: "Personalized learning experience", retention: "Duration of account" },
  { name: "Assessment Data", description: "Pre-assessment answers and results", purpose: "Track calibration and recommendations", retention: "Duration of account" },
  { name: "Lab Activity", description: "Lab attempts, scores, and flag submissions", purpose: "Skills verification and FTS scoring", retention: "Duration of account" },
  { name: "Job Applications", description: "Applications submitted, interview history", purpose: "Placement assistance", retention: "2 years post application" },
  { name: "Consent Records", description: "Your consent decisions and history", purpose: "DPDP Act compliance", retention: "Permanent (legal requirement)" },
];

function ConsentToggle({ label, description, checked, onChange }: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border/40 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} className="shrink-0 mt-0.5" />
    </div>
  );
}

export default function PrivacyCenter() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exportRequested, setExportRequested] = useState(false);

  const { data: consentData, isLoading: consentLoading } = useGetConsentStatus();
  const withdrawConsentMutation = useWithdrawConsent();
  const deletionMutation = useRequestDataDeletion();

  const { data: historyData } = useQuery({
    queryKey: ["consent/history"],
    queryFn: () => apiFetch<any[]>("/api/consent/history"),
  });
  const historyEntries: any[] = Array.isArray(historyData) ? historyData : [];

  const { data: cookieData } = useQuery({
    queryKey: ["consent/cookies"],
    queryFn: () => apiFetch<CookiePrefs>("/api/consent/cookies"),
  });

  const cookieMutation = useMutation({
    mutationFn: (prefs: Partial<CookiePrefs>) =>
      apiFetch<CookiePrefs>("/api/consent/cookies", { method: "POST", body: JSON.stringify(prefs) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["consent/cookies"] });
      qc.invalidateQueries({ queryKey: ["consent/history"] });
      try { localStorage.setItem("futrsec_cookie_consent", "1"); } catch { /* ignore */ }
      toast({ title: "Cookie preferences saved", description: "Your choices have been recorded in your consent log." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const cookies = cookieData ?? { necessary: true, analytics: false, marketing: false, functional: false };

  const exportMutation = useMutation({
    mutationFn: () => apiFetch("/api/dpdp/download-request", { method: "POST", body: JSON.stringify({ reason: "User requested data export" }) }),
    onSuccess: () => {
      setExportRequested(true);
      toast({ title: "Export requested!", description: "You'll receive your data package within 72 hours as required by DPDP Act." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleWithdrawConsent = (type: string) => {
    withdrawConsentMutation.mutate(
      { data: { consentType: type as ConsentWithdrawInputConsentType, reason: "User withdrew consent via Privacy Center" } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["consent"] });
          toast({ title: "Consent withdrawn", description: "Your preference has been updated." });
        },
        onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      }
    );
  };

  const handleRequestDeletion = () => {
    deletionMutation.mutate(
      { data: { reason: "User requested account deletion via Privacy Center" } },
      {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          toast({ title: "Deletion request submitted", description: "Your account will be deleted within 30 days as per DPDP Act requirements." });
        },
        onError: (e: Error) => {
          setDeleteDialogOpen(false);
          toast({ title: "Error", description: e.message, variant: "destructive" });
        },
      }
    );
  };

  const consent = consentData as any;

  return (
    <div className="p-5 lg:p-8 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center">
          <Shield className="h-5 w-5 text-red-600" />
        </div>
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">DPDP Privacy Center</h1>
          <p className="text-sm text-muted-foreground">Your rights under the Digital Personal Data Protection Act 2023</p>
        </div>
        <Badge className="ml-auto bg-green-50 text-green-700 border-green-200 shrink-0">DPDP Compliant</Badge>
      </div>

      {/* Rights banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Eye, label: "Right to Access", desc: "Download all your data", color: "#2563EB" },
          { icon: Edit3, label: "Right to Correction", desc: "Fix inaccurate data", color: "#10B981" },
          { icon: Trash2, label: "Right to Erasure", desc: "Delete your account", color: "#EF4444" },
          { icon: Lock, label: "Right to Withdraw", desc: "Withdraw any consent", color: "#F97316" },
        ].map((right) => (
          <div key={right.label} className="p-3 bg-white rounded-xl border border-border/60 text-center">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: `${right.color}15` }}>
              <right.icon className="h-4 w-4" style={{ color: right.color }} />
            </div>
            <p className="text-xs font-semibold text-foreground">{right.label}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{right.desc}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="consent">
        <TabsList className="h-8 mb-4 flex-wrap">
          <TabsTrigger value="consent" className="text-xs h-7">Consent Settings</TabsTrigger>
          <TabsTrigger value="cookies" className="text-xs h-7">Cookies</TabsTrigger>
          <TabsTrigger value="data" className="text-xs h-7">My Data</TabsTrigger>
          <TabsTrigger value="history" className="text-xs h-7">Audit Trail</TabsTrigger>
          <TabsTrigger value="requests" className="text-xs h-7">Requests</TabsTrigger>
          <TabsTrigger value="legal" className="text-xs h-7">Policy &amp; Terms</TabsTrigger>
        </TabsList>

        {/* Consent Settings */}
        <TabsContent value="consent">
          <Card className="bg-white border-border/60">
            <CardHeader className="pb-3 pt-4 px-5">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ToggleLeft className="h-4 w-4 text-primary" />Consent Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {consentLoading ? (
                <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-muted/30 rounded-lg animate-pulse" />)}</div>
              ) : (
                <div>
                  <ConsentToggle
                    label="Data Processing"
                    description="Required for the platform to function. This cannot be withdrawn while your account is active."
                    checked={consent?.dataProcessing ?? true}
                    onChange={() => toast({ title: "Required", description: "Data processing consent is required to use FUTRSEC." })}
                  />
                  <ConsentToggle
                    label="Analytics"
                    description="Helps us understand how you use the platform to improve learning outcomes."
                    checked={consent?.analytics ?? false}
                    onChange={(v) => !v && handleWithdrawConsent("analytics")}
                  />
                  <ConsentToggle
                    label="Marketing Communications"
                    description="Receive updates about new tracks, job opportunities, and platform features."
                    checked={consent?.marketing ?? false}
                    onChange={(v) => !v && handleWithdrawConsent("marketing")}
                  />
                  <ConsentToggle
                    label="Third-Party Sharing"
                    description="Share anonymized performance data with hiring partners to improve placement recommendations."
                    checked={consent?.thirdParty ?? false}
                    onChange={(v) => !v && handleWithdrawConsent("thirdParty")}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cookie Preferences */}
        <TabsContent value="cookies">
          <Card className="bg-white border-border/60">
            <CardHeader className="pb-3 pt-4 px-5">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Cookie className="h-4 w-4 text-primary" />Cookie Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <p className="text-xs text-muted-foreground mb-3">
                Control how cookies are used on FUTRSEC. Strictly necessary cookies are always active because the platform cannot function without them. Your choices are recorded in your consent log.
              </p>
              <div>
                {COOKIE_TYPES.map((c) => (
                  <ConsentToggle
                    key={c.key}
                    label={c.locked ? `${c.label} (Always on)` : c.label}
                    description={c.description}
                    checked={c.locked ? true : Boolean(cookies[c.key])}
                    onChange={(v) => {
                      if (c.locked) {
                        toast({ title: "Required", description: "Strictly necessary cookies cannot be disabled." });
                        return;
                      }
                      cookieMutation.mutate({ ...cookies, [c.key]: v });
                    }}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <Button
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  disabled={cookieMutation.isPending}
                  onClick={() => cookieMutation.mutate({ necessary: true, analytics: true, marketing: true, functional: true })}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />Accept All
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1.5"
                  disabled={cookieMutation.isPending}
                  onClick={() => cookieMutation.mutate({ necessary: true, analytics: false, marketing: false, functional: false })}
                >
                  <Lock className="h-3.5 w-3.5" />Reject Non-Essential
                </Button>
              </div>
              {cookieData?.updatedAt && (
                <p className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1">
                  <Clock className="h-3 w-3" />Last updated {new Date(cookieData.updatedAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* My Data */}
        <TabsContent value="data">
          <div className="space-y-4">
            <Card className="bg-white border-border/60">
              <CardHeader className="pb-3 pt-4 px-5">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Database className="h-4 w-4 text-primary" />Data We Collect
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="space-y-3">
                  {DATA_CATEGORIES.map((cat) => (
                    <div key={cat.name} className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg">
                      <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Database className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{cat.name}</p>
                        <p className="text-xs text-muted-foreground">{cat.description}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                          <span className="text-[11px] text-muted-foreground"><span className="font-medium text-foreground/70">Purpose:</span> {cat.purpose}</span>
                          <span className="text-[11px] text-muted-foreground"><span className="font-medium text-foreground/70">Retention:</span> {cat.retention}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-border/60">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <FileDown className="h-4.5 w-4.5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">Download My Data</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Request a complete export of all your personal data. You'll receive a download link within 72 hours as required by the DPDP Act.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3 h-7 text-xs gap-1.5"
                      onClick={() => exportMutation.mutate()}
                      disabled={exportMutation.isPending || exportRequested}
                    >
                      <FileDown className="h-3.5 w-3.5" />
                      {exportRequested ? "Export Requested" : exportMutation.isPending ? "Requesting..." : "Request Data Export"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Audit Trail */}
        <TabsContent value="history">
          <Card className="bg-white border-border/60">
            <CardHeader className="pb-3 pt-4 px-5">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />Consent Audit Trail
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {historyEntries.length > 0 ? (
                <div className="space-y-2">
                  {historyEntries.map((entry: any) => (
                    <div key={entry.id} className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
                      <div className={`h-2 w-2 rounded-full shrink-0 ${entry.action === "granted" ? "bg-green-500" : "bg-red-500"}`} />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-foreground capitalize">{entry.consentType?.replace("_", " ")} — {entry.action}</p>
                        <p className="text-[11px] text-muted-foreground">{new Date(entry.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                      <Badge variant={entry.action === "granted" ? "default" : "secondary"} className="text-[10px]">
                        {entry.action}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <History className="h-10 w-10 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No consent history yet</p>
                  <p className="text-xs text-muted-foreground mt-1">All future consent changes will be logged here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Requests */}
        <TabsContent value="requests">
          <div className="space-y-4">
            <Card className="bg-white border-border/60">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                    <Edit3 className="h-4.5 w-4.5 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">Correction Request</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Request correction of any inaccurate personal data we hold about you.</p>
                    <Button size="sm" variant="outline" className="mt-3 h-7 text-xs gap-1.5" onClick={() => window.location.href = "/profile"}>
                      <ChevronRight className="h-3.5 w-3.5" />Go to Profile
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-border/60 border-red-100">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                    <Trash2 className="h-4.5 w-4.5 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-700">Delete My Account</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Permanently delete your account and all associated personal data. This action cannot be undone and will be processed within 30 days as required by DPDP Act §13.
                    </p>
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-orange-600 bg-orange-50 rounded-lg px-2.5 py-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span>Your learning progress, certifications, and placement history will be permanently erased.</span>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="mt-3 h-7 text-xs gap-1.5"
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />Request Account Deletion
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Policy & Terms */}
        <TabsContent value="legal">
          <div className="space-y-4">
            <Card className="bg-white border-border/60">
              <CardHeader className="pb-3 pt-4 px-5">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />Privacy Policy
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-3 text-xs text-muted-foreground leading-relaxed">
                <p><span className="font-medium text-foreground">Effective under the DPDP Act 2023.</span> FUTRSEC ("we", "us") is the Data Fiduciary responsible for your personal data. This policy explains what we collect, why, and the rights you hold over it.</p>
                <div>
                  <p className="font-medium text-foreground mb-1">1. Data we collect</p>
                  <p>Profile details, learning progress, assessment and lab activity, job applications, and consent records. Each category, its purpose, and retention period are listed in the "My Data" tab.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">2. Purpose & legal basis</p>
                  <p>We process data to deliver personalized learning, calibrate tracks, verify skills, and assist with placements. Processing relies on the consent you grant in the "Consent Settings" tab, except where required to operate your account.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">3. Your rights</p>
                  <p>You may access, correct, withdraw consent, or request erasure of your data at any time using the controls in this Privacy Center. Withdrawal does not affect processing carried out before withdrawal.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">4. Data retention & security</p>
                  <p>We retain data only as long as needed for the stated purpose or as legally required. Consent records are retained permanently as a legal obligation. Data is protected with industry-standard safeguards.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">5. Grievance redressal</p>
                  <p>To raise a concern about your data, contact our Data Protection Officer at <span className="text-foreground">dpo@futrsec.in</span>. We respond within the timelines mandated by the DPDP Act.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-border/60">
              <CardHeader className="pb-3 pt-4 px-5">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ScrollText className="h-4 w-4 text-primary" />Terms of Service
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-3 text-xs text-muted-foreground leading-relaxed">
                <div>
                  <p className="font-medium text-foreground mb-1">1. Acceptable use</p>
                  <p>FUTRSEC is provided for lawful cybersecurity learning and career development. You agree not to misuse labs, attempt to attack platform infrastructure, or share account access.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">2. Learning content & AI features</p>
                  <p>AI tutoring, coaching, interview, and assessment outputs are guidance aids and may contain inaccuracies. They do not guarantee employment outcomes. Use professional judgement before acting on them.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">3. Placements</p>
                  <p>Placement assistance connects you with hiring partners. We do not guarantee interviews or offers, and selection decisions rest with employers.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">4. Account & termination</p>
                  <p>You may delete your account at any time from the "Requests" tab. We may suspend accounts that violate these terms or applicable law.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">5. Changes</p>
                  <p>We may update these terms and the privacy policy. Material changes will be notified in-app, and continued use constitutes acceptance.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />Confirm Account Deletion
            </DialogTitle>
            <DialogDescription className="text-sm">
              This will permanently delete your account and all personal data within 30 days. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg space-y-1">
              <p>• All profile data will be erased</p>
              <p>• Learning progress will be permanently deleted</p>
              <p>• Job applications will be removed</p>
              <p>• Consent records will be retained (legal requirement)</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleRequestDeletion}
              disabled={deletionMutation.isPending}
            >
              {deletionMutation.isPending ? "Processing..." : "Confirm Deletion"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
