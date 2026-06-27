import { useMentorAtRisk } from "@/lib/mentor-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader, CardSkeleton, EmptyState } from "@/components/page-shell";
import { RiskBadge } from "./students";
import { AlertTriangle, ShieldCheck, Lightbulb, Activity, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export default function MentorAtRiskPage() {
  const { data, isLoading } = useMentorAtRisk();
  const students = data?.students ?? [];

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <PageHeader 
          icon={AlertTriangle} 
          title="At-Risk Interventions" 
          subtitle="Early-warning signals and AI-recommended interventions for your cohort." 
        />
      </motion.div>

      {isLoading ? (
        <div className="space-y-4"><CardSkeleton rows={4} /><CardSkeleton rows={4} /></div>
      ) : students.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <EmptyState 
            icon={ShieldCheck} 
            title="Cohort is healthy" 
            description="Everyone in your cohort is on track. No active risk signals detected." 
          />
        </motion.div>
      ) : (
        <div className="space-y-6">
          {students.map((s, idx) => (
            <motion.div 
              key={s.studentId} 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.4, delay: idx * 0.1 }}
            >
              <Card className="glass-card overflow-hidden border-border/60">
                <div className={`h-1.5 w-full ${s.riskLevel === 'high' ? 'bg-danger' : s.riskLevel === 'medium' ? 'bg-warning' : 'bg-success'}`} />
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-muted to-muted-foreground/20 flex items-center justify-center font-bold text-lg text-foreground ring-1 ring-border">
                          {s.fullName?.[0]?.toUpperCase() ?? s.email?.[0]?.toUpperCase() ?? "U"}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold font-heading text-foreground tracking-tight">{s.fullName ?? "Unknown Student"}</h3>
                          <p className="text-sm text-muted-foreground">{s.email}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 p-4 rounded-xl bg-muted/30">
                        <div>
                          <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">Risk Status</div>
                          <RiskBadge level={s.riskLevel} score={s.riskScore} />
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">FTS Score</div>
                          <div className="font-mono font-bold text-lg text-foreground flex items-center gap-1.5">
                            <Activity className="h-4 w-4 text-primary" /> {s.ftsTotal}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">Missed Tasks</div>
                          <div className="font-bold text-lg text-foreground">{s.missedTasks}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">Last Active</div>
                          <div className="font-medium text-sm text-foreground">
                            {s.lastActivityAt ? new Date(s.lastActivityAt).toLocaleDateString() : "Never"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="w-full md:w-96 flex flex-col gap-6">
                      <div>
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                          <AlertTriangle className="h-4 w-4 text-warning" /> Identified Risk Signals
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {s.signals.map((sig, i) => (
                            <Badge key={i} variant="outline" className="bg-background text-xs py-1 px-2.5 rounded-full border-border/80">
                              {sig}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                        <h4 className="text-sm font-semibold text-primary flex items-center gap-2 mb-3">
                          <Lightbulb className="h-4 w-4" /> Recommended Action
                        </h4>
                        <ul className="space-y-2.5">
                          {s.recommendations.map((rec, i) => (
                            <li key={i} className="text-sm text-foreground/80 flex gap-2.5 items-start leading-snug">
                              <CheckCircle2 className="h-4 w-4 text-primary/70 shrink-0 mt-0.5" />
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
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
