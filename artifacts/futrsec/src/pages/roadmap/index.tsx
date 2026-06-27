import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { PageHeader, GridSkeleton } from "@/components/page-shell";
import { Map, CheckCircle2, Lock, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";

const MILESTONES = [
  { id: "auth",        title: "Account Created & Verified",  type: "auth",       alwaysDone: true },
  { id: "consent",     title: "DPDP Consent Captured",       type: "compliance", alwaysDone: true },
  { id: "track",       title: "Track Selected",               type: "onboarding", alwaysDone: false },
  { id: "assessment",  title: "Pre-Assessment Completed",     type: "assessment", alwaysDone: false },
  { id: "module1",     title: "Foundation Modules (1–3)",     type: "learning",   alwaysDone: false },
  { id: "first_lab",   title: "First Lab Completed",          type: "labs",       alwaysDone: false },
  { id: "mid_assess",  title: "Mid-Assessment Checkpoint",    type: "assessment", alwaysDone: false },
  { id: "adv_modules", title: "Advanced Modules (4–6)",       type: "learning",   alwaysDone: false },
  { id: "capstone",    title: "Capstone Lab + Report",        type: "labs",       alwaysDone: false },
  { id: "portfolio",   title: "Portfolio & Resume Ready",     type: "profile",    alwaysDone: false },
  { id: "mock_int",    title: "Mock Interview Cleared",       type: "interview",  alwaysDone: false },
  { id: "job_app",     title: "Job Application Submitted",    type: "jobs",       alwaysDone: false },
  { id: "placement",   title: "Placement / Offer Received",   type: "placement",  alwaysDone: false },
];

const TYPE_COLORS: Record<string, string> = {
  auth: "#10B981", compliance: "#10B981", onboarding: "#2563EB",
  assessment: "#F97316", learning: "#2563EB", labs: "#EF4444",
  profile: "#8B5CF6", interview: "#8B5CF6", jobs: "#06B6D4", placement: "#F59E0B",
};

const LINKS: Partial<Record<string, string>> = {
  track: "/onboarding/tracks", assessment: "/onboarding/assessment",
  module1: "/learning", first_lab: "/labs", portfolio: "/profile",
  mock_int: "/ai/mock-interview", job_app: "/jobs",
};

export default function RoadmapPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["career-roadmap"],
    queryFn: () => apiFetch<any>("/api/career/roadmap"),
  });

  if (isLoading) return <div className="p-6"><GridSkeleton cols={1} rows={5} /></div>;

  const hasTrack = !!data?.track;
  const milestones = MILESTONES.map(m => ({ ...m, done: m.alwaysDone || (m.id === "track" && hasTrack) }));
  const firstActive = milestones.findIndex(m => !m.done);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <PageHeader title="Roadmap" subtitle="Your path from beginner to job-ready" icon={Map} />

      {data?.track && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 mb-6 flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-primary" />
          <p className="text-sm font-medium text-foreground">{data.track.name}</p>
          <Badge className="ml-auto text-[10px]" variant="outline">{data.track.difficulty}</Badge>
        </div>
      )}

      <div className="relative">
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />
        <div className="space-y-4">
          {milestones.map((m, i) => {
            const color = TYPE_COLORS[m.type] ?? "#2563EB";
            const isActive = i === firstActive;
            const link = LINKS[m.id];
            return (
              <motion.div key={m.id} className="relative flex items-start gap-4"
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 z-10 border-2 bg-card transition-all ${
                  m.done ? "border-success" : isActive ? "border-primary animate-pulse" : "border-border"
                }`}>
                  {m.done ? <CheckCircle2 className="h-5 w-5 text-success" />
                    : isActive ? <Circle className="h-5 w-5 text-primary fill-primary/20" />
                    : <Lock className="h-4 w-4 text-muted-foreground/40" />}
                </div>
                <div className={`flex-1 border rounded-xl px-4 py-3 elevation-1 ${
                  m.done ? "bg-success/10 border-success/30" : isActive ? "bg-card border-primary/30" : "bg-card border-border/60"
                }`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-medium ${m.done || isActive ? "text-foreground" : "text-muted-foreground"}`}>{m.title}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className="text-[10px]" style={{ backgroundColor: `${color}15`, color, borderColor: `${color}30` }}>{m.type}</Badge>
                      {isActive && link && (
                        <Link href={link}><Button size="sm" className="h-6 text-[10px] px-2">Start</Button></Link>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
