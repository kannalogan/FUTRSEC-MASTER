import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Lock } from "lucide-react";
import { PageHeader, GridSkeleton } from "@/components/page-shell";

interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  earned: boolean;
}
interface AchievementsData {
  badges: Badge[];
  stats: { labs: number; applications: number; lessons: number };
}

export default function AchievementsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/achievements"],
    queryFn: () => apiFetch<AchievementsData>("/api/achievements"),
  });

  const earned = data?.badges.filter((b) => b.earned).length ?? 0;
  const total = data?.badges.length ?? 0;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <PageHeader
        icon={Trophy}
        title="Achievements"
        subtitle="Badges you've unlocked on your cybersecurity journey"
        actions={!isLoading ? <Badge className="bg-amber-50 text-amber-600 border-amber-200">{earned}/{total} unlocked</Badge> : undefined}
      />

      {isLoading ? (
        <GridSkeleton cols={3} rows={3} />
      ) : (
        <>
          {data && (
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: "Labs Completed", value: data.stats.labs },
                { label: "Lessons Done", value: data.stats.lessons },
                { label: "Applications", value: data.stats.applications },
              ].map((s) => (
                <Card key={s.label} className="bg-card border-border/60">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold font-heading text-foreground">{s.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {data?.badges.map((badge, idx) => (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: idx * 0.03 }}
              >
                <Card className={`border-border/60 transition-all ${badge.earned ? "bg-card hover:shadow-md" : "bg-muted/30"}`}>
                  <CardContent className="p-4 text-center">
                    <div className={`text-4xl mb-2 ${badge.earned ? "" : "grayscale opacity-40"}`}>
                      {badge.icon}
                    </div>
                    <h3 className={`font-semibold text-sm mb-1 ${badge.earned ? "text-foreground" : "text-muted-foreground"}`}>
                      {badge.title}
                    </h3>
                    <p className="text-[11px] text-muted-foreground leading-tight">{badge.description}</p>
                    {!badge.earned && (
                      <div className="flex items-center justify-center gap-1 mt-2 text-[10px] text-muted-foreground/60">
                        <Lock className="h-2.5 w-2.5" />Locked
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
