import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldX, Loader2 } from "lucide-react";

type VerifyResponse = {
  valid: boolean;
  certificate?: {
    code: string;
    holderName: string | null;
    title: string;
    type: string;
    careerTrack: string | null;
    issuedDate: string;
  };
};

const TRACK_LABELS: Record<string, string> = {
  soc: "SOC Analyst",
  vapt: "VAPT Professional",
  grc: "GRC Specialist",
};

export default function VerifyCertificatePage() {
  const [, params] = useRoute("/verify/:token");
  const token = params?.token ?? "";

  const { data, isLoading } = useQuery({
    queryKey: [`/api/certificates/verify/${token}`],
    queryFn: () => apiFetch<VerifyResponse>(`/api/certificates/verify/${token}`),
    enabled: !!token,
  });

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <span className="font-heading font-bold text-lg tracking-tight">FUTRSEC</span>
        </div>

        <Card>
          <CardContent className="p-8">
            {isLoading ? (
              <div className="flex flex-col items-center py-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">Verifying certificate…</p>
              </div>
            ) : data?.valid && data.certificate ? (
              <div className="flex flex-col items-center text-center">
                <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
                  <ShieldCheck className="h-8 w-8 text-emerald-600" />
                </div>
                <h1 className="text-lg font-heading font-bold mb-1">Certificate Verified</h1>
                <p className="text-sm text-muted-foreground mb-6">
                  This is an authentic FUTRSEC certificate.
                </p>
                <div className="w-full space-y-3 text-left">
                  <Field label="Certificate Code" value={data.certificate.code} mono />
                  <Field label="Issued To" value={data.certificate.holderName ?? "—"} />
                  <Field label="Title" value={data.certificate.title} />
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs text-muted-foreground">Track</span>
                    {data.certificate.careerTrack ? (
                      <Badge variant="secondary">
                        {TRACK_LABELS[data.certificate.careerTrack] ?? data.certificate.careerTrack}
                      </Badge>
                    ) : (
                      <span className="text-sm">—</span>
                    )}
                  </div>
                  <Field label="Issued Date" value={data.certificate.issuedDate} />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-8 text-center">
                <div className="h-16 w-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
                  <ShieldX className="h-8 w-8 text-red-600" />
                </div>
                <h1 className="text-lg font-heading font-bold mb-1">Not Verified</h1>
                <p className="text-sm text-muted-foreground">
                  This certificate could not be verified. It may have been revoked or the link is invalid.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className={`text-sm font-medium text-right ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
