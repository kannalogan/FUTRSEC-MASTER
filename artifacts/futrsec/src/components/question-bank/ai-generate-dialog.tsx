import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  QB_TRACK_LABELS, QB_TYPES, QB_TYPE_LABELS, QB_DIFFICULTIES, CHOICE_TYPES,
  useAIGenerate, useCreateQuestion,
  type AIGeneratedQuestion,
} from "@/lib/question-bank-api";
import { Sparkles, Loader2, Check, Wand2, Save } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tracks: string[];
}

export function AIGenerateDialog({ open, onOpenChange, tracks }: Props) {
  const { toast } = useToast();
  const gen = useAIGenerate();
  const createMut = useCreateQuestion();

  const [track, setTrack] = useState(tracks[0] ?? "soc");
  const [type, setType] = useState("mcq");
  const [difficulty, setDifficulty] = useState("intermediate");
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(5);
  const [results, setResults] = useState<AIGeneratedQuestion[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [provider, setProvider] = useState<string | null>(null);

  const run = () => {
    gen.mutate({ careerTrack: track, questionType: type, difficulty, topic: topic.trim() || undefined, count }, {
      onSuccess: (r) => {
        setResults(r.generated);
        setProvider(r.provider);
        setSelected(new Set(r.generated.map((_, i) => i)));
      },
      onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
    });
  };

  const toggle = (i: number) => setSelected((p) => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n; });

  const saveSelected = async () => {
    const picks = results.filter((_, i) => selected.has(i));
    if (!picks.length) { toast({ title: "Select at least one question", variant: "destructive" }); return; }
    setSaving(true);
    let ok = 0;
    for (const q of picks) {
      try {
        await createMut.mutateAsync({
          questionText: q.questionText, questionType: q.questionType, careerTrack: q.careerTrack, difficulty: q.difficulty,
          topic: q.topic ?? undefined, bloomLevel: q.bloomLevel ?? undefined, estimatedTimeMin: q.estimatedTimeMin ?? undefined,
          skills: q.skills, keywords: q.keywords, explanation: q.explanation ?? undefined,
          options: CHOICE_TYPES.has(q.questionType) ? q.options : [], aiGenerated: true,
        });
        ok++;
      } catch { /* continue */ }
    }
    setSaving(false);
    toast({ title: `${ok} question${ok === 1 ? "" : "s"} saved as drafts` });
    setResults([]); setSelected(new Set()); onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 gap-0 max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader className="p-6 pb-4 border-b border-border/60">
          <DialogTitle className="text-xl font-heading flex items-center gap-2"><Wand2 className="h-5 w-5 text-primary" /> AI Question Generator</DialogTitle>
          <DialogDescription className="text-sm">Generate exam-grade questions, review, then save the ones you want as drafts.</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto px-6 py-5 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-muted/30 border border-border/50">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Track</Label>
              <Select value={track} onValueChange={setTrack}><SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>{tracks.map((t) => <SelectItem key={t} value={t}>{QB_TRACK_LABELS[t] ?? t}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</Label>
              <Select value={type} onValueChange={setType}><SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>{QB_TYPES.map((t) => <SelectItem key={t} value={t}>{QB_TYPE_LABELS[t]}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}><SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>{QB_DIFFICULTIES.map((d) => <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Count</Label>
              <Input type="number" min={1} max={10} value={count} onChange={(e) => setCount(Math.min(10, Math.max(1, Number(e.target.value))))} className="h-10 bg-background" />
            </div>
            <div className="col-span-2 sm:col-span-4 space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Topic (optional)</Label>
              <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Windows event log analysis" className="h-10 bg-background" />
            </div>
          </div>

          <Button onClick={run} disabled={gen.isPending} className="w-full font-semibold gap-2">
            {gen.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Generate {count} questions
          </Button>

          {provider === "mock" && results.length > 0 && (
            <p className="text-xs text-warning bg-warning/10 border border-warning/30 rounded-lg p-2.5 font-medium">No AI provider configured — these are placeholders. Configure a provider for real generation.</p>
          )}

          {results.length > 0 && (
            <div className="space-y-2.5">
              {results.map((q, i) => (
                <button key={i} type="button" onClick={() => toggle(i)} className={`w-full text-left rounded-xl border p-4 transition-colors ${selected.has(i) ? "border-primary/50 bg-primary/5 ring-1 ring-primary/30" : "border-border hover:bg-muted/40"}`}>
                  <div className="flex items-start gap-3">
                    <div className={`h-5 w-5 shrink-0 rounded-md border flex items-center justify-center mt-0.5 ${selected.has(i) ? "bg-primary border-primary text-primary-foreground" : "border-border"}`}>{selected.has(i) && <Check className="h-3.5 w-3.5" />}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{q.questionText}</p>
                      {q.options.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {q.options.map((o, j) => (
                            <li key={j} className={`text-xs flex items-center gap-1.5 ${o.isCorrect ? "text-success font-medium" : "text-muted-foreground"}`}>
                              {o.isCorrect ? <Check className="h-3 w-3" /> : <span className="w-3" />} {o.optionText}
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {q.skills.slice(0, 4).map((s) => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-muted/50 p-5 border-t border-border/60 flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">{results.length > 0 ? `${selected.size} of ${results.length} selected` : ""}</span>
          <div className="flex gap-3">
            <Button variant="ghost" className="font-semibold" onClick={() => onOpenChange(false)}>Close</Button>
            <Button className="font-semibold px-6 gap-2" onClick={saveSelected} disabled={saving || results.length === 0}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save selected
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
