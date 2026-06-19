import { useListTracks, useSelectTrack } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Clock, BookOpen, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  intermediate: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  advanced: "bg-red-500/10 text-red-600 border-red-500/20",
};

export default function Tracks() {
  const [_, setLocation] = useLocation();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  const { data: tracks, isLoading } = useListTracks();
  const selectTrack = useSelectTrack();

  const handleContinue = () => {
    if (!selectedSlug) return;
    selectTrack.mutate(
      { data: { trackSlug: selectedSlug } },
      {
        onSuccess: () => {
          setLocation("/onboarding/assessment");
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-background p-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-heading font-bold tracking-tight">Choose Your Learning Track</h1>
          <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
            Pick the cybersecurity domain that aligns with your goals. You can explore others later.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {(tracks ?? []).map((track) => (
              <motion.div
                key={track.slug}
                whileHover={{ y: -2 }}
                onClick={() => setSelectedSlug(track.slug)}
                className={`relative cursor-pointer rounded-xl border-2 p-5 transition-all ${
                  selectedSlug === track.slug
                    ? "border-primary shadow-lg shadow-primary/10"
                    : "border-border hover:border-muted-foreground/40 bg-card"
                }`}
                style={selectedSlug === track.slug ? { borderColor: track.accentColor ?? undefined, backgroundColor: `${track.accentColor}08` } : {}}
              >
                {selectedSlug === track.slug && (
                  <CheckCircle2
                    className="absolute top-3 right-3 w-5 h-5"
                    style={{ color: track.accentColor ?? "hsl(var(--primary))" }}
                  />
                )}

                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 text-white font-bold text-lg"
                  style={{ backgroundColor: track.accentColor ?? "hsl(var(--primary))" }}
                >
                  {track.name.charAt(0)}
                </div>

                <h3 className="font-heading font-bold text-base mb-1">{track.name}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-3">
                  {track.description}
                </p>

                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {track.durationWeeks}w
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />
                    {track.totalModules} modules
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {(track.enrolledCount ?? 0).toLocaleString()}
                  </span>
                </div>

                <Badge
                  variant="outline"
                  className={`mt-3 text-xs ${DIFFICULTY_COLORS[track.difficulty ?? "beginner"] ?? ""}`}
                >
                  {track.difficulty}
                </Badge>
              </motion.div>
            ))}
          </div>
        )}

        <div className="flex justify-center">
          <Button
            size="lg"
            className="px-10"
            disabled={!selectedSlug || selectTrack.isPending}
            onClick={handleContinue}
          >
            {selectTrack.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Continue to Assessment
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
