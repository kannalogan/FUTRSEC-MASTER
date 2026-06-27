import {
  useStudentJourney, useStudentJourneyProgress, useCompleteJourneyItem,
  JOURNEY_ITEM_LABELS, JOURNEY_TRACK_LABELS,
  type StudentJourneyItem, type StudentJourneyDay,
} from "@/lib/journey-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PageHeader, CardSkeleton, EmptyState } from "@/components/page-shell";
import { useToast } from "@/hooks/use-toast";
import {
  Map, Lock, CheckCircle2, Circle, Zap, Flame, Trophy, Target,
  CalendarClock, Award, ArrowRight,
} from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";

/** Where a student should go to actually do an item, when applicable. */
function itemActionLink(item: StudentJourneyItem): { href: string; label: string } | null {
  if (item.refId == null) return null;
  switch (item.type) {
    case "assessment": return { href: `/assessment/${item.refId}`, label: "Take assessment" };
    case "lab": return { href: `/labs/${item.refId}`, label: "Open lab" };
    case "course": return { href: `/learning`, label: "Go to learning" };
    case "assignment":
    case "resource":
    case "declaration": return { href: `/tasks`, label: "Open task" };
    case "mock_interview": return { href: `/interviews/assigned`, label: "Start interview" };
    case "certificate": return { href: `/certifications`, label: "View certificate" };
    default: return null;
  }
}

export default function StudentJourneyPage() {
  const { toast } = useToast();
  const { data: jData, isLoading: jLoading } = useStudentJourney();
  const { data: pData } = useStudentJourneyProgress();
  const complete = useCompleteJourneyItem();

  const journey = jData?.journey ?? null;
  const progress = pData?.progress ?? null;

  const onComplete = (item: StudentJourneyItem) => {
    complete.mutate(item.id, {
      onSuccess: (r) => {
        if (r.journeyComplete) toast({ title: "Journey complete! 🎉", description: `+${r.awardedXp} XP` });
        else if (r.dayComplete) toast({ title: "Day complete!", description: `+${r.awardedXp} XP` });
        else toast({ title: r.awardedXp > 0 ? `+${r.awardedXp} XP` : "Already completed" });
      },
      onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
    });
  };

  if (jLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        <CardSkeleton rows={3} />
        <CardSkeleton rows={5} />
      </div>
    );
  }

  if (!journey) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <PageHeader title="My Journey" subtitle="Your personalized day-by-day path to job-ready." icon={Map} />
        <EmptyState
          icon={Map}
          title="No journey available yet"
          description="A guided journey for your track hasn't been published yet. Check back soon — your timeline unlocks automatically when one goes live."
        />
      </div>
    );
  }

  const days = [...journey.days].sort((a, b) => a.offset - b.offset);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <PageHeader
        title={journey.title}
        subtitle={`${JOURNEY_TRACK_LABELS[journey.careerTrack] ?? journey.careerTrack} · Day ${journey.daysElapsed + 1} of ${journey.totalDays}`}
        icon={Map}
      />

      {progress && <ProgressPanel progress={progress} nextUnlockInDays={journey.nextUnlockInDays} lockedDayCount={journey.lockedDayCount} />}

      <div className="relative">
        <div className="space-y-4">
          {days.map((day) => (
            <DayBlock key={day.id} day={day} onComplete={onComplete} pending={complete.isPending} />
          ))}
        </div>

        {journey.lockedDayCount > 0 && (
          <Card className="mt-4 border-dashed">
            <CardContent className="py-5 flex items-center gap-3 text-muted-foreground">
              <Lock className="h-5 w-5 shrink-0" />
              <div className="text-sm">
                <span className="font-medium text-foreground">{journey.lockedDayCount} more day{journey.lockedDayCount === 1 ? "" : "s"}</span> ahead.
                {journey.nextUnlockInDays != null && (
                  <> Next day unlocks in <span className="font-medium text-foreground">{journey.nextUnlockInDays} day{journey.nextUnlockInDays === 1 ? "" : "s"}</span>.</>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function ProgressPanel({
  progress, nextUnlockInDays, lockedDayCount,
}: {
  progress: NonNullable<ReturnType<typeof useStudentJourneyProgress>["data"]>["progress"];
  nextUnlockInDays: number | null;
  lockedDayCount: number;
}) {
  if (!progress) return null;
  const stats = [
    { icon: Zap, label: "XP earned", value: progress.xp },
    { icon: Flame, label: "Day streak", value: progress.streak },
    { icon: CalendarClock, label: "Days done", value: `${progress.completedDays}/${progress.totalDays}` },
    { icon: Target, label: "Career readiness", value: `${progress.careerReadiness}%` },
  ];
  const earned = progress.badges.filter((b) => b.earned);

  return (
    <Card>
      <CardContent className="p-5 space-y-5">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall progress</span>
            <span className="text-sm font-semibold">{progress.overallPercent}%</span>
          </div>
          <Progress value={progress.overallPercent} className="h-2.5" />
          <p className="text-xs text-muted-foreground mt-1.5">
            {progress.completedItems} of {progress.totalRequiredItems} required items complete
            {lockedDayCount > 0 && nextUnlockInDays != null && <> · next unlock in {nextUnlockInDays}d</>}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-border/60 bg-card/50 p-3">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <s.icon className="h-3.5 w-3.5" />
                <span className="text-[11px] uppercase tracking-wide">{s.label}</span>
              </div>
              <p className="text-xl font-heading font-bold">{s.value}</p>
            </div>
          ))}
        </div>

        {progress.badges.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2 text-muted-foreground">
              <Trophy className="h-3.5 w-3.5" />
              <span className="text-[11px] uppercase tracking-wide">Badges ({earned.length}/{progress.badges.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {progress.badges.map((b) => (
                <Badge key={b.id} variant={b.earned ? "default" : "outline"} className={b.earned ? "" : "opacity-50"}>
                  {b.earned ? "★ " : ""}{b.label}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DayBlock({
  day, onComplete, pending,
}: {
  day: StudentJourneyDay;
  onComplete: (item: StudentJourneyItem) => void;
  pending: boolean;
}) {
  const items = [...day.items].sort((a, b) => a.order - b.order);
  const doneCount = items.filter((i) => i.completed).length;
  const allDone = items.length > 0 && doneCount === items.length;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={day.unlocked ? "" : "opacity-70"}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <span className={`inline-flex items-center justify-center h-8 min-w-8 px-2 rounded-xl text-xs font-semibold ring-1 ${
                allDone ? "bg-emerald-500/15 text-emerald-600 ring-emerald-500/25" : day.unlocked ? "bg-primary/15 text-primary ring-primary/20" : "bg-muted text-muted-foreground ring-border"
              }`}>
                Day {day.dayNumber}
              </span>
              <div>
                <h3 className="font-semibold text-sm leading-tight">{day.title}</h3>
                {day.description && <p className="text-xs text-muted-foreground">{day.description}</p>}
              </div>
            </div>
            {day.unlocked ? (
              <span className="text-xs text-muted-foreground shrink-0">{doneCount}/{items.length}</span>
            ) : (
              <Badge variant="outline" className="gap-1 shrink-0"><Lock className="h-3 w-3" /> Locked</Badge>
            )}
          </div>

          {day.unlocked && (
            <div className="space-y-2">
              {items.length === 0 ? (
                <p className="text-xs text-muted-foreground">No items in this day.</p>
              ) : (
                items.map((item) => (
                  <ItemRow key={item.id} item={item} onComplete={onComplete} pending={pending} />
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ItemRow({
  item, onComplete, pending,
}: {
  item: StudentJourneyItem;
  onComplete: (item: StudentJourneyItem) => void;
  pending: boolean;
}) {
  const link = itemActionLink(item);
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-background px-3 py-2.5">
      {item.completed ? (
        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
      ) : (
        <Circle className="h-5 w-5 text-muted-foreground/40 shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-medium truncate ${item.completed ? "text-muted-foreground line-through" : ""}`}>{item.title}</p>
          <Badge variant="outline" className="text-[10px] capitalize shrink-0">{JOURNEY_ITEM_LABELS[item.type]}</Badge>
        </div>
        {item.description && <p className="text-xs text-muted-foreground truncate">{item.description}</p>}
      </div>
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground shrink-0"><Zap className="h-3 w-3" /> {item.xpReward}</span>
      {!item.completed && (
        <div className="flex items-center gap-1.5 shrink-0">
          {link && (
            <Link href={link.href}>
              <Button size="sm" variant="outline" className="h-8 gap-1 text-xs">
                {link.label} <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          )}
          <Button size="sm" className="h-8 text-xs" disabled={pending} onClick={() => onComplete(item)}>
            {item.type === "mentor_review" || item.type === "certificate" ? "Mark done" : "Complete"}
          </Button>
        </div>
      )}
      {item.completed && <Award className="h-4 w-4 text-emerald-500/70 shrink-0" />}
    </div>
  );
}
