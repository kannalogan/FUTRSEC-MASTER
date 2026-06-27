import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, downloadFile } from "@/lib/api";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Award, Download, ShieldCheck, Calendar, Linkedin, Link2, Ban, Clock,
} from "lucide-react";
import { PageHeader, GridSkeleton, EmptyState } from "@/components/page-shell";
import { useToast } from "@/hooks/use-toast";

interface MyCertificate {
  id: number;
  certificateCode: string;
  title: string;
  type: string;
  careerTrack: string | null;
  issuedDate: string | null;
  expiresDate: string | null;
  status: "issued" | "revoked" | "expired";
  verifyToken: string;
  verifyUrl: string;
  hasPdf: boolean;
}
interface MineResp {
  certificates: MyCertificate[];
}

const STATUS_STYLES: Record<string, string> = {
  issued: "bg-success/10 text-success border border-success/30",
  revoked: "bg-danger/10 text-danger border border-danger/30",
  expired: "bg-warning/10 text-warning border border-warning/30",
};

function linkedInAddUrl(c: MyCertificate): string {
  const params = new URLSearchParams({
    startTask: "CERTIFICATION_NAME",
    name: c.title,
    organizationName: "FUTRSEC",
    certUrl: c.verifyUrl,
    certId: c.certificateCode,
  });
  if (c.issuedDate) {
    const d = new Date(c.issuedDate);
    if (!Number.isNaN(d.getTime())) {
      params.set("issueYear", String(d.getFullYear()));
      params.set("issueMonth", String(d.getMonth() + 1));
    }
  }
  return `https://www.linkedin.com/profile/add?${params.toString()}`;
}

export default function CertificatesPage() {
  const { toast } = useToast();
  const [busyId, setBusyId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["/api/certificates/mine"],
    queryFn: () => apiFetch<MineResp>("/api/certificates/mine"),
  });

  const certificates = data?.certificates ?? [];
  const verifiedCount = certificates.filter((c) => c.status === "issued").length;

  const handleDownload = async (c: MyCertificate) => {
    setBusyId(c.id);
    try {
      await downloadFile(`/api/certificates/${c.id}/pdf`, `${c.certificateCode}.pdf`);
    } catch (e) {
      toast({
        title: "Download failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  const copyVerify = async (c: MyCertificate) => {
    try {
      await navigator.clipboard.writeText(c.verifyUrl);
      toast({ title: "Verify link copied", description: c.verifyUrl });
    } catch {
      window.open(c.verifyUrl, "_blank");
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <PageHeader
        icon={Award}
        title="Certificate Wallet"
        subtitle="Your verified, shareable completion certificates"
        actions={
          verifiedCount > 0 ? (
            <Badge className="bg-success/10 text-success border border-success/30">
              {verifiedCount} verified
            </Badge>
          ) : undefined
        }
      />

      {isLoading ? (
        <GridSkeleton cols={2} rows={2} />
      ) : certificates.length === 0 ? (
        <EmptyState
          icon={Award}
          title="Your wallet is empty"
          description="Finish labs and courses to collect verified certificates you can share with employers."
          action={
            <Link href="/learning">
              <Button size="sm">Start Learning</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          {certificates.map((cert, idx) => {
            const revoked = cert.status === "revoked";
            const expired = cert.status === "expired";
            const inactive = revoked || expired;
            return (
              <motion.div
                key={cert.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.04 }}
              >
                <Card className="bg-card border-border/60 overflow-hidden hover-lift transition-all">
                  <div
                    className={`p-5 text-white relative ${
                      inactive
                        ? "bg-gradient-to-br from-muted-foreground/70 to-muted-foreground"
                        : "bg-gradient-to-br from-primary/90 to-primary"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <Award className="h-8 w-8 opacity-90" />
                      <Badge
                        className={`text-[10px] gap-1 capitalize ${
                          revoked
                            ? "bg-white/20 text-white border-white/30"
                            : expired
                              ? "bg-white/20 text-white border-white/30"
                              : "bg-white/20 text-white border-white/30"
                        }`}
                      >
                        {revoked ? (
                          <Ban className="h-3 w-3" />
                        ) : expired ? (
                          <Clock className="h-3 w-3" />
                        ) : (
                          <ShieldCheck className="h-3 w-3" />
                        )}
                        {cert.status}
                      </Badge>
                    </div>
                    <h3 className="font-heading font-bold text-base mt-3 leading-tight">
                      {cert.title}
                    </h3>
                    <p className="text-xs text-white/80 mt-1 font-mono">
                      {cert.certificateCode}
                    </p>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                      {cert.issuedDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(cert.issuedDate).toLocaleDateString()}
                        </span>
                      )}
                      <Badge
                        variant="outline"
                        className={`capitalize ${STATUS_STYLES[cert.status] ?? ""}`}
                      >
                        {cert.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 min-w-[120px]"
                        disabled={inactive || busyId === cert.id}
                        onClick={() => handleDownload(cert)}
                      >
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                        {busyId === cert.id ? "Preparing…" : "Download PDF"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 min-w-[120px]"
                        onClick={() => copyVerify(cert)}
                      >
                        <Link2 className="h-3.5 w-3.5 mr-1.5" />
                        Verify link
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 min-w-[120px]"
                        disabled={inactive}
                        asChild={!inactive}
                      >
                        {inactive ? (
                          <span>
                            <Linkedin className="h-3.5 w-3.5 mr-1.5" />
                            Share
                          </span>
                        ) : (
                          <a
                            href={linkedInAddUrl(cert)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Linkedin className="h-3.5 w-3.5 mr-1.5" />
                            Add to LinkedIn
                          </a>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
