import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Award, Download, Calendar, Trophy } from "lucide-react";
import { PageHeader, GridSkeleton, EmptyState } from "@/components/page-shell";

interface Certification {
  id: string;
  title: string;
  issuedAt: string | null;
  score: number;
  type: string;
}

export default function CertificationsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/certifications"],
    queryFn: () => apiFetch<Certification[]>("/api/certifications"),
  });

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <PageHeader
        icon={Award}
        title="Certifications"
        subtitle="Certificates you've earned by completing labs and tracks"
        actions={data && data.length > 0 ? <Badge className="bg-warning/10 text-warning border border-warning/30">{data.length} earned</Badge> : undefined}
      />

      {isLoading ? (
        <GridSkeleton cols={3} rows={2} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={Award}
          title="No certifications yet"
          description="Complete labs and tracks to earn certificates you can showcase."
          action={<Link href="/labs"><Button size="sm">Explore Labs</Button></Link>}
        />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((cert, idx) => (
            <motion.div
              key={cert.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.04 }}
              whileHover={{ y: -2 }}
            >
              <Card className="bg-card border-border/60 hover-lift transition-all overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-amber-400 to-amber-600" />
                <CardContent className="p-5">
                  <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-warning/10 mx-auto mb-3">
                    <Award className="h-7 w-7 text-warning" />
                  </div>
                  <h3 className="font-semibold text-sm text-foreground text-center leading-tight mb-2">{cert.title}</h3>
                  <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground mb-3">
                    {cert.issuedAt && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(cert.issuedAt).toLocaleDateString()}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Trophy className="h-3 w-3" />
                      {cert.score}%
                    </span>
                  </div>
                  <Button size="sm" variant="outline" className="w-full">
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Download
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
