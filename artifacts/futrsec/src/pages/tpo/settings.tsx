import { useTpoMe } from "@/lib/tpo-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader, CardSkeleton } from "@/components/page-shell";
import { Settings as SettingsIcon, AlertTriangle } from "lucide-react";

const APPROVAL_VARIANTS: Record<string, "secondary" | "outline" | "destructive"> = {
  approved: "secondary",
  pending: "outline",
  rejected: "destructive",
};

export default function TpoSettings() {
  const { data, isLoading } = useTpoMe();

  if (isLoading || !data) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <PageHeader icon={SettingsIcon} title="Settings" subtitle="Your TPO account details." />
        <CardSkeleton rows={6} />
      </div>
    );
  }

  const p = data.profile;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <PageHeader icon={SettingsIcon} title="Settings" subtitle="Your TPO account and institution details." />

      <Card className="mb-4">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Account</h3>
            <Badge variant={APPROVAL_VARIANTS[p.approvalStatus] ?? "outline"} className="capitalize">
              {p.approvalStatus}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Name</span>
              <div className="font-medium">{p.fullName ?? "—"}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Email</span>
              <div className="font-medium">{p.email ?? "—"}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Status</span>
              <div className="mt-0.5">
                <Badge variant={p.isActive ? "secondary" : "outline"}>
                  {p.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold mb-4">Institution</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Institution</span>
              <div className="font-medium">{p.institution ?? "—"}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Institution Code</span>
              <div className="font-medium">{p.institutionCode ?? "—"}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Designation</span>
              <div className="font-medium">{p.designation ?? "—"}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {p.approvalStatus === "rejected" && p.rejectionReason && (
        <Card className="mt-4 border-destructive/40">
          <CardContent className="p-5">
            <div className="flex items-start gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold mb-1">Application Rejected</div>
                <p>{p.rejectionReason}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground mt-4">
        Your profile is managed by the platform administrator. Contact support to update these details.
      </p>
    </div>
  );
}
