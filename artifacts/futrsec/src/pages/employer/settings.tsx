import { useEmployerMe } from "@/lib/employer-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader, CardSkeleton } from "@/components/page-shell";
import { Building2, ExternalLink, BadgeCheck } from "lucide-react";

const APPROVAL_COLORS: Record<string, string> = {
  pending: "#F97316",
  approved: "#22C55E",
  rejected: "#EF4444",
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <span className="text-muted-foreground text-xs uppercase tracking-wide">{label}</span>
      <div className="font-medium mt-0.5">{value ?? "—"}</div>
    </div>
  );
}

export default function EmployerSettingsPage() {
  const { data, isLoading } = useEmployerMe();

  if (isLoading || !data) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <PageHeader icon={Building2} title="Company Settings" subtitle="Your company profile and verification status." />
        <CardSkeleton rows={8} />
      </div>
    );
  }

  const p = data.profile;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <PageHeader icon={Building2} title="Company Settings" subtitle="Your company profile and verification status." />

      <Card className="mb-4">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Verification</h3>
            <div className="flex items-center gap-2">
              <Badge className="border-0" style={{ backgroundColor: p.isVerified ? "#22C55E20" : "#64748B20", color: p.isVerified ? "#22C55E" : "#64748B" }}>
                <BadgeCheck className="h-3.5 w-3.5 mr-1" />
                {p.isVerified ? "Verified" : "Unverified"}
              </Badge>
              <Badge className="border-0 capitalize" style={{ backgroundColor: `${APPROVAL_COLORS[p.approvalStatus] ?? "#64748B"}20`, color: APPROVAL_COLORS[p.approvalStatus] ?? "#64748B" }}>
                {p.approvalStatus}
              </Badge>
            </div>
          </div>
          {p.approvalStatus === "rejected" && p.rejectionReason && (
            <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400">
              <strong>Rejection reason:</strong> {p.rejectionReason}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold mb-4">Company Profile</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <Field label="Company Name" value={p.companyName} />
            <Field label="Industry" value={p.industry} />
            <Field label="Company Size" value={p.companySize} />
            <Field label="Designation" value={p.designation} />
            <Field label="Contact Name" value={p.fullName} />
            <Field label="Email" value={p.email} />
            <Field
              label="Website"
              value={p.website ? (
                <a href={p.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                  {p.website} <ExternalLink className="h-3 w-3" />
                </a>
              ) : "—"}
            />
            <Field
              label="LinkedIn"
              value={p.linkedinUrl ? (
                <a href={p.linkedinUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                  LinkedIn <ExternalLink className="h-3 w-3" />
                </a>
              ) : "—"}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-4">Your company profile is managed during registration and verified by an admin.</p>
        </CardContent>
      </Card>
    </div>
  );
}
