import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/page-shell";
import { useToast } from "@/hooks/use-toast";
import { Terminal, Regex, ScrollText, Code2, CheckCircle2, Lightbulb, ChevronRight, Trophy } from "lucide-react";
import { ALL_DRILLS, type Category, type Drill } from "./sandbox/drills";
import { LinuxLab } from "./sandbox/linux-lab";
import { RegexLab } from "./sandbox/regex-lab";
import { LogsLab } from "./sandbox/logs-lab";
import { PythonLab } from "./sandbox/python-lab";

const STORAGE_KEY = "futrsec_sandbox_solved";

const CATEGORIES: { id: Category; label: string; icon: typeof Terminal; color: string; blurb: string }[] = [
  { id: "linux", label: "Linux CLI", icon: Terminal, color: "#10B981", blurb: "Navigate a real shell, hunt through logs, master grep & find." },
  { id: "regex", label: "Regex", icon: Regex, color: "#6366F1", blurb: "Extract IOCs — IPs, hashes, CVEs — with live-highlighted patterns." },
  { id: "logs", label: "Log Analysis", icon: ScrollText, color: "#F97316", blurb: "Filter web access logs and answer the investigation question." },
  { id: "python", label: "Python", icon: Code2, color: "#EAB308", blurb: "Run real Python in your browser to crunch security data." },
];

const DIFF_COLORS: Record<string, string> = {
  beginner: "#10B981",
  intermediate: "#F97316",
  advanced: "#EF4444",
};

function loadSolved(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export default function SandboxPage() {
  const { toast } = useToast();
  const [solved, setSolved] = useState<Set<string>>(() => loadSolved());
  const [activeCat, setActiveCat] = useState<Category>("linux");
  const [activeDrillId, setActiveDrillId] = useState<string>(
    () => ALL_DRILLS.find((d) => d.category === "linux")!.id,
  );
  const [showHint, setShowHint] = useState(false);

  const drillsInCat = useMemo(() => ALL_DRILLS.filter((d) => d.category === activeCat), [activeCat]);
  const activeDrill = useMemo<Drill>(
    () => ALL_DRILLS.find((d) => d.id === activeDrillId) ?? drillsInCat[0],
    [activeDrillId, drillsInCat],
  );

  useEffect(() => {
    setShowHint(false);
  }, [activeDrillId]);

  const persist = (next: Set<string>) => {
    setSolved(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
    } catch {
      /* storage unavailable — progress stays in-memory for this session */
    }
  };

  const markSolved = (drill: Drill) => {
    if (solved.has(drill.id)) return;
    const next = new Set(solved);
    next.add(drill.id);
    persist(next);
    toast({ title: "Drill solved! 🎉", description: drill.title });
  };

  const selectCat = (cat: Category) => {
    setActiveCat(cat);
    const first = ALL_DRILLS.find((d) => d.category === cat);
    if (first) setActiveDrillId(first.id);
  };

  const totalSolved = solved.size;
  const totalDrills = ALL_DRILLS.length;
  const pct = Math.round((totalSolved / totalDrills) * 100);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <PageHeader
        icon={Terminal}
        title="Practice Sandbox"
        subtitle="Hands-on, in-browser drills — no setup, nothing to install. Solve them to level up."
        actions={
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-warning" />
            <span className="text-sm font-medium text-foreground">
              {totalSolved}/{totalDrills} solved
            </span>
          </div>
        }
      />

      <div className="mb-6">
        <Progress value={pct} className="h-2" />
      </div>

      {/* Category tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const inCat = ALL_DRILLS.filter((d) => d.category === cat.id);
          const done = inCat.filter((d) => solved.has(d.id)).length;
          const active = activeCat === cat.id;
          return (
            <button key={cat.id} onClick={() => selectCat(cat.id)} className="text-left">
              <Card className={`transition-all h-full ${active ? "ring-2 ring-primary border-primary/40" : "border-border/60 hover-lift"}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${cat.color}15` }}>
                      <Icon className="h-4.5 w-4.5" style={{ color: cat.color }} />
                    </div>
                    <span className="text-[11px] text-muted-foreground">{done}/{inCat.length}</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{cat.label}</p>
                  <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">{cat.blurb}</p>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Drill list */}
        <div className="space-y-2">
          {drillsInCat.map((d) => {
            const isActive = d.id === activeDrill.id;
            const isSolved = solved.has(d.id);
            return (
              <button
                key={d.id}
                onClick={() => setActiveDrillId(d.id)}
                className={`w-full text-left rounded-lg border p-3 transition-all ${
                  isActive ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20" : "border-border/60 bg-card hover:bg-muted/30"
                }`}
              >
                <div className="flex items-center gap-2">
                  {isSolved ? (
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                  )}
                  <span className="text-sm font-medium text-foreground flex-1">{d.title}</span>
                  <Badge
                    className="text-[9px] px-1.5 shrink-0"
                    style={{ backgroundColor: `${DIFF_COLORS[d.difficulty]}15`, color: DIFF_COLORS[d.difficulty], borderColor: `${DIFF_COLORS[d.difficulty]}30` }}
                  >
                    {d.difficulty}
                  </Badge>
                  {isActive && <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Active drill */}
        <div className="lg:col-span-2">
          <motion.div key={activeDrill.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <Card className="border-border/60">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <h2 className="text-lg font-semibold text-foreground">{activeDrill.title}</h2>
                  {solved.has(activeDrill.id) && (
                    <Badge className="bg-success/10 text-success border-success/30 shrink-0">
                      <CheckCircle2 className="h-3 w-3 mr-1" />Solved
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-3">{activeDrill.prompt}</p>

                <button
                  onClick={() => setShowHint((v) => !v)}
                  className="inline-flex items-center gap-1.5 text-xs text-warning hover:text-warning/80 mb-4"
                >
                  <Lightbulb className="h-3.5 w-3.5" />
                  {showHint ? "Hide hint" : "Show hint"}
                </button>
                {showHint && (
                  <div className="mb-4 rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-xs text-warning font-mono">
                    {activeDrill.hint}
                  </div>
                )}

                {activeDrill.category === "linux" && <LinuxLab drill={activeDrill} onSolve={() => markSolved(activeDrill)} />}
                {activeDrill.category === "regex" && <RegexLab drill={activeDrill} onSolve={() => markSolved(activeDrill)} />}
                {activeDrill.category === "logs" && <LogsLab drill={activeDrill} onSolve={() => markSolved(activeDrill)} />}
                {activeDrill.category === "python" && <PythonLab drill={activeDrill} onSolve={() => markSolved(activeDrill)} />}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
