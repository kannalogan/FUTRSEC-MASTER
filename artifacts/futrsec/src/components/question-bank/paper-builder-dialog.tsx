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
  QB_TRACK_LABELS, QB_TYPE_LABELS,
  useGeneratePaper, usePublishPaper,
  type PaperPreview,
} from "@/lib/question-bank-api";
import { FileStack, Loader2, Shuffle, Send, ListChecks } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tracks: string[];
}

export function PaperBuilderDialog({ open, onOpenChange, tracks }: Props) {
  const { toast } = useToast();
  const genMut = useGeneratePaper();
  const pubMut = usePublishPaper();

  const [track, setTrack] = useState(tracks[0] ?? "soc");
  const [title, setTitle] = useState("");
  const [total, setTotal] = useState(10);
  const [timeLimit, setTimeLimit] = useState(30);
  const [passingScore, setPassingScore] = useState(70);
  const [randomize, setRandomize] = useState(true);
  const [negative, setNegative] = useState(false);
  const [preview, setPreview] = useState<PaperPreview | null>(null);

  const generate = () => {
    genMut.mutate({ careerTrack: track, totalQuestions: total, randomize, negativeMarking: negative, timeLimitMin: timeLimit }, {
      onSuccess: (r) => {
        setPreview(r);
        if (r.selectedCount === 0) toast({ title: "No approved questions in this track yet", variant: "destructive" });
      },
      onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
    });
  };

  const publish = () => {
    if (!preview || preview.questions.length === 0) return;
    if (!title.trim()) { toast({ title: "Give the paper a title", variant: "destructive" }); return; }
    pubMut.mutate({ title: title.trim(), questionIds: preview.questions.map((q) => q.id), timeLimitMin: timeLimit, passingScore }, {
      onSuccess: (r) => { toast({ title: "Assessment published", description: `${r.totalQuestions} questions · "${r.title}"` }); setPreview(null); setTitle(""); onOpenChange(false); },
      onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 gap-0 max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader className="p-6 pb-4 border-b border-border/60">
          <DialogTitle className="text-xl font-heading flex items-center gap-2"><FileStack className="h-5 w-5 text-primary" /> Build Question Paper</DialogTitle>
          <DialogDescription className="text-sm">Auto-assemble an assessment from your approved questions, preview it, then publish.</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto px-6 py-5 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-muted/30 border border-border/50">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Paper Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. SOC Weekly Quiz #4" className="h-10 bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Track</Label>
              <Select value={track} onValueChange={setTrack}><SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>{tracks.map((t) => <SelectItem key={t} value={t}>{QB_TRACK_LABELS[t] ?? t}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Questions</Label>
              <Input type="number" min={1} max={100} value={total} onChange={(e) => setTotal(Math.max(1, Number(e.target.value)))} className="h-10 bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Time (min)</Label>
              <Input type="number" min={1} value={timeLimit} onChange={(e) => setTimeLimit(Math.max(1, Number(e.target.value)))} className="h-10 bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pass %</Label>
              <Input type="number" min={0} max={100} value={passingScore} onChange={(e) => setPassingScore(Math.min(100, Math.max(0, Number(e.target.value))))} className="h-10 bg-background" />
            </div>
            <div className="col-span-2 sm:col-span-4 flex flex-wrap gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium"><input type="checkbox" className="accent-primary w-4 h-4" checked={randomize} onChange={(e) => setRandomize(e.target.checked)} /><Shuffle className="h-3.5 w-3.5" /> Randomize selection</label>
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium"><input type="checkbox" className="accent-primary w-4 h-4" checked={negative} onChange={(e) => setNegative(e.target.checked)} /> Negative marking</label>
            </div>
          </div>

          <Button onClick={generate} disabled={genMut.isPending} variant="outline" className="w-full font-semibold gap-2 bg-background">
            {genMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListChecks className="h-4 w-4" />} Generate preview
          </Button>

          {preview && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge variant="secondary">{preview.selectedCount} / {preview.requested} selected</Badge>
                <Badge variant="secondary">{preview.totalMarks} marks</Badge>
                <Badge variant="secondary">{preview.timeLimitMin} min</Badge>
                <Badge variant="secondary">Pool: {preview.poolSize}</Badge>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto rounded-xl border border-border/60 p-3">
                {preview.questions.map((q, i) => (
                  <div key={q.id} className="flex items-start gap-2.5 py-1.5">
                    <span className="text-xs font-semibold text-muted-foreground w-5 shrink-0 mt-0.5">{i + 1}.</span>
                    <div className="min-w-0">
                      <p className="text-sm text-foreground">{q.questionText}</p>
                      <div className="flex gap-1.5 mt-1">
                        <Badge variant="outline" className="text-xs">{QB_TYPE_LABELS[q.questionType]}</Badge>
                        <Badge variant="outline" className="text-xs capitalize">{q.difficulty}</Badge>
                        <Badge variant="outline" className="text-xs">{q.marks}m</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-muted/50 p-5 border-t border-border/60 flex justify-end gap-3">
          <Button variant="ghost" className="font-semibold" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="font-semibold px-6 gap-2" onClick={publish} disabled={pubMut.isPending || !preview || preview.questions.length === 0}>
            {pubMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Publish assessment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
