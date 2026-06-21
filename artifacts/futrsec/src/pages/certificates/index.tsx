import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Award, Download, Share2, ShieldCheck, Calendar } from "lucide-react";
import { PageHeader, GridSkeleton, EmptyState } from "@/components/page-shell";

interface Certificate {
  id: string;
  title: string;
  issuedAt: string | null;
  score: number;
  type: string;
}

export default function CertificatesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/certifications"],
    queryFn: () => apiFetch<Certificate[]>("/api/certifications"),
  });

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <PageHeader
        icon={Award}
        title="Certificate Wallet"
        subtitle="Your verified, shareable completion certificates"
        actions={data && data.length > 0 ? <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200">{data.length} verified</Badge> : undefined}
      />

      {isLoading ? (
        <GridSkeleton cols={2} rows={2} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={Award}
          title="Your wallet is empty"
          description="Finish labs and courses to collect verified certificates you can share with employers."
          action={<Link href="/learning"><Button size="sm">Start Learning</Button></Link>}
        />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          {data.map((cert, idx) => (
            <motion.div
              key={cert.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.04 }}
            >
              <Card className="bg-card border-border/60 overflow-hidden hover:shadow-md transition-all">
                <div className="bg-gradient-to-br from-primary/90 to-primary p-5 text-white relative">
                  <div className="flex items-start justify-between">
                    <Award className="h-8 w-8 opacity-90" />
                    <Badge className="bg-white/20 text-white border-white/30 text-[10px] gap-1">
                      <ShieldCheck className="h-3 w-3" />Verified
                    </Badge>
                  </div>
                  <h3 className="font-heading font-bold text-base mt-3 leading-tight">{cert.title}</h3>
                  <p className="text-xs text-white/80 mt-1">Certificate of Completion</p>
                </div>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                    {cert.issuedAt && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(cert.issuedAt).toLocaleDateString()}
                      </span>
                    )}
                    <span className="font-medium text-foreground">Score: {cert.score}%</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Download className="h-3.5 w-3.5 mr-1.5" />Download
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      <Share2 className="h-3.5 w-3.5 mr-1.5" />Share
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
