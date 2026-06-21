import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { PageHeader, CardSkeleton } from "@/components/page-shell";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, GraduationCap, Briefcase, Mic, FileText } from "lucide-react";

const TRACK_LABELS: Record<string, string> = {
  soc: "SOC Analyst",
  vapt: "VAPT Professional",
  grc: "GRC Specialist",
};
const TRACKS = ["soc", "vapt", "grc"] as const;
type Track = (typeof TRACKS)[number];

type Feature =
  | "explain_tutor"
  | "career_coach"
  | "mock_interview"
  | "resume_analyzer";

interface FeatureConfig {
  feature: Feature;
  enabled: boolean;
  settings: Record<string, unknown>;
}

interface ConfigResponse {
  features: FeatureConfig[];
}

const FEATURE_META: Record<
  Feature,
  { label: string; description: string; icon: React.ComponentType<{ className?: string }> }
> = {
  explain_tutor: {
    label: "Explain Tutor",
    description: "AI tutor that explains concepts to students on demand.",
    icon: GraduationCap,
  },
  career_coach: {
    label: "Career Coach",
    description: "AI guidance for career planning and skill development.",
    icon: Briefcase,
  },
  mock_interview: {
    label: "Mock Interview",
    description: "AI-driven interview practice with configurable difficulty.",
    icon: Mic,
  },
  resume_analyzer: {
    label: "Resume Analyzer",
    description: "Analyzes resumes against track-specific keywords.",
    icon: FileText,
  },
};

const DIFFICULTIES = ["easy", "medium", "hard"] as const;
const NO_TRACK = "__none__";

function FeatureCard({ config }: { config: FeatureConfig }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const meta = FEATURE_META[config.feature];
  const Icon = meta.icon;

  const [enabled, setEnabled] = useState(config.enabled);

  const mi = config.settings as {
    questionCount?: number;
    difficulty?: string;
    track?: string | null;
  };
  const ra = config.settings as {
    socKeywords?: string[];
    vaptKeywords?: string[];
    grcKeywords?: string[];
  };

  const [questionCount, setQuestionCount] = useState(String(mi.questionCount ?? 5));
  const [difficulty, setDifficulty] = useState(mi.difficulty ?? "medium");
  const [track, setTrack] = useState<string>(mi.track ?? NO_TRACK);

  const [socKw, setSocKw] = useState((ra.socKeywords ?? []).join(", "));
  const [vaptKw, setVaptKw] = useState((ra.vaptKeywords ?? []).join(", "));
  const [grcKw, setGrcKw] = useState((ra.grcKeywords ?? []).join(", "));

  useEffect(() => {
    setEnabled(config.enabled);
  }, [config.enabled]);

  const saveMut = useMutation({
    mutationFn: (vars: { enabled: boolean; settings?: Record<string, unknown> }) =>
      apiFetch(`/api/admin/ai/config/${config.feature}`, {
        method: "PATCH",
        body: JSON.stringify(vars),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai/config"] });
      toast({ title: `${meta.label} saved` });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const parseList = (raw: string): string[] =>
    raw.split(",").map((s) => s.trim()).filter(Boolean);

  const save = () => {
    let settings: Record<string, unknown> | undefined;
    if (config.feature === "mock_interview") {
      settings = {
        questionCount: Number(questionCount) || 1,
        difficulty,
        track: track === NO_TRACK ? null : (track as Track),
      };
    } else if (config.feature === "resume_analyzer") {
      settings = {
        socKeywords: parseList(socKw),
        vaptKeywords: parseList(vaptKw),
        grcKeywords: parseList(grcKw),
      };
    }
    saveMut.mutate({ enabled, settings });
  };

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="h-[18px] w-[18px] text-primary" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base leading-tight">{meta.label}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">{meta.description}</p>
            </div>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        {config.feature === "mock_interview" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div>
              <Label htmlFor={`${config.feature}-qc`}>Question Count</Label>
              <Input
                id={`${config.feature}-qc`}
                type="number"
                min={1}
                value={questionCount}
                onChange={(e) => setQuestionCount(e.target.value)}
              />
            </div>
            <div>
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIFFICULTIES.map((d) => (
                    <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Track</Label>
              <Select value={track} onValueChange={setTrack}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_TRACK}>All tracks</SelectItem>
                  {TRACKS.map((t) => (
                    <SelectItem key={t} value={t}>{TRACK_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {config.feature === "resume_analyzer" && (
          <div className="space-y-3 mb-4">
            <div>
              <Label htmlFor={`${config.feature}-soc`}>SOC Keywords (comma-separated)</Label>
              <Textarea id={`${config.feature}-soc`} value={socKw} onChange={(e) => setSocKw(e.target.value)} rows={2} />
            </div>
            <div>
              <Label htmlFor={`${config.feature}-vapt`}>VAPT Keywords (comma-separated)</Label>
              <Textarea id={`${config.feature}-vapt`} value={vaptKw} onChange={(e) => setVaptKw(e.target.value)} rows={2} />
            </div>
            <div>
              <Label htmlFor={`${config.feature}-grc`}>GRC Keywords (comma-separated)</Label>
              <Textarea id={`${config.feature}-grc`} value={grcKw} onChange={(e) => setGrcKw(e.target.value)} rows={2} />
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button size="sm" onClick={save} disabled={saveMut.isPending}>
            {saveMut.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminAiConfigPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/ai/config"],
    queryFn: () => apiFetch<ConfigResponse>("/api/admin/ai/config"),
  });

  const features = data?.features ?? [];

  return (
    <div>
      <PageHeader
        icon={Sparkles}
        title="AI Configuration"
        subtitle="Enable, disable and tune the platform's AI features."
      />

      {isLoading ? (
        <div className="space-y-4">
          <CardSkeleton rows={3} />
          <CardSkeleton rows={3} />
        </div>
      ) : (
        <div className="space-y-4">
          {features.map((f) => (
            <FeatureCard key={f.feature} config={f} />
          ))}
        </div>
      )}
    </div>
  );
}
