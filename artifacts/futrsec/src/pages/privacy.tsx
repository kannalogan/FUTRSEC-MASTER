import { useGetConsentStatus, useGetConsentHistory, useWithdrawConsent, useRequestDataDeletion, useListDataRequests } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ShieldCheck, Trash2, RefreshCw, Download, AlertCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

export default function Privacy() {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { data: consentStatus } = useGetConsentStatus();
  const { data: history } = useGetConsentHistory();
  const { data: requests } = useListDataRequests();
  const withdrawConsent = useWithdrawConsent();
  const requestDeletion = useRequestDataDeletion();

  const handleWithdraw = (type: string) => {
    withdrawConsent.mutate({ data: { consentType: type as "marketing" | "analytics" | "thirdParty", reason: "User requested withdrawal" } });
  };

  const handleDeleteRequest = () => {
    requestDeletion.mutate(
      { data: { reason: "User requested account deletion" } },
      { onSuccess: () => setShowDeleteConfirm(false) }
    );
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <ShieldCheck className="w-7 h-7 text-primary" />
          <h1 className="text-2xl font-heading font-bold">Privacy & Data Control</h1>
        </div>
        <p className="text-muted-foreground">
          Manage your consent preferences and data rights under DPDP Act 2023.
        </p>
      </motion.div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Consent Status</CardTitle>
          <CardDescription>Manage what data we can use</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: "dataProcessing", label: "Core Data Processing", required: true },
            { key: "analytics", label: "Analytics & Performance", required: false },
            { key: "marketing", label: "Marketing Communications", required: false },
            { key: "thirdParty", label: "Third-party Placements", required: false },
          ].map(({ key, label, required }) => {
            const granted = (consentStatus as any)?.[key] ?? false;
            return (
              <div key={key} className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-sm">{label}</p>
                  {required && <p className="text-xs text-muted-foreground">Required — cannot be withdrawn</p>}
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={granted ? "default" : "secondary"} className="text-xs">
                    {granted ? "Granted" : "Withdrawn"}
                  </Badge>
                  {!required && granted && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 text-destructive hover:text-destructive"
                      onClick={() => handleWithdraw(key)}
                      disabled={withdrawConsent.isPending}
                    >
                      Withdraw
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data Rights (DPDP)</CardTitle>
          <CardDescription>Exercise your rights under the Digital Personal Data Protection Act</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <Download className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Download My Data</p>
                <p className="text-xs text-muted-foreground">Get a copy of all your data</p>
              </div>
            </div>
            <Button variant="outline" size="sm">Request</Button>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Correct My Data</p>
                <p className="text-xs text-muted-foreground">Fix inaccurate information</p>
              </div>
            </div>
            <Button variant="outline" size="sm">Request</Button>
          </div>
          <Separator />
          {!showDeleteConfirm ? (
            <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20">
              <div className="flex items-center gap-3">
                <Trash2 className="w-4 h-4 text-destructive" />
                <div>
                  <p className="text-sm font-medium text-destructive">Delete My Account</p>
                  <p className="text-xs text-muted-foreground">Permanently delete all your data</p>
                </div>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete
              </Button>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/30 space-y-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-sm">This will permanently delete your account and all associated data. This action cannot be undone.</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteRequest}
                  disabled={requestDeletion.isPending}
                >
                  {requestDeletion.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                  Confirm Delete
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {(history ?? []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Consent History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(history ?? []).slice(0, 10).map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                  <span className="text-muted-foreground">{item.consentType}</span>
                  <div className="flex items-center gap-3">
                    <Badge variant={item.action === "granted" ? "default" : "secondary"} className="text-xs">
                      {item.action}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.createdAt as string).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
