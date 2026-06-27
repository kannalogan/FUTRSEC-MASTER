import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  QB_TRACK_LABELS, QB_TYPES, QB_TYPE_LABELS, QB_DIFFICULTIES, CHOICE_TYPES,
  useCreateQuestion, useUpdateQuestion, useAIDifficulty, useAIExplain, useAIQuality, useAIDuplicates,
  type QBQuestion, type QBBody, type QBOption,
} from "@/lib/question-bank-api";
import {
  Plus, Trash2, Check, Sparkles, Loader2, Gauge, FileText, ShieldCheck, Copy as CopyIcon, X,
} from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  question?: QBQuestion | null;
  tracks: string[];
}

const blank = (track: string): QBBody => ({
  questionText: "", questionType: "mcq", careerTrack: track, difficulty: "intermediate",
  topic: "", marks: 1, negativeMarks: 0, skills: [], keywords: [], explanation: "",
  isShared: false, options: [
    { optionText: "", isCorrect: true }, { optionText: "", isCorrect: false },
    { optionText: "", isCorrect: false }, { optionText: "", isCorrect: false },
  ],
});

export function QuestionEditorDialog({ open, onOpenChange, question, tracks }: Props) {
  const { toast } = useToast();
  const createMut = useCreateQuestion();
  const updateMut = useUpdateQuestion();
  const aiDifficulty = useAIDifficulty();
  const aiExplain = useAIExplain();
  const aiQuality = useAIQuality();
  const aiDuplicates = useAIDuplicates();

  const [form, setForm] = useState<QBBody>(blank(tracks[0] ?? "soc"));
  const [skillInput, setSkillInput] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  const [quality, setQuality] = useState<{ score: number; issues: string[]; suggestions: string[] } | null>(null);
  const [dupes, setDupes] = useState<{ id: number; questionText: string; similarity: number }[] | null>(null);

  const isEdit = !!question;

  useEffect(() => {
    if (!open) return;
    if (question) {
      setForm({
        questionText: question.questionText, questionType: question.questionType, careerTrack: question.careerTrack,
        difficulty: question.difficulty, topic: question.topic ?? "", bloomLevel: question.bloomLevel ?? undefined,
        estimatedTimeMin: question.estimatedTimeMin ?? undefined, marks: question.marks, negativeMarks: question.negativeMarks,
        skills: question.skills, keywords: question.keywords, explanation: question.explanation ?? "",
        codeLanguage: question.codeLanguage ?? undefined, codeTemplate: question.codeTemplate ?? undefined,
        expectedOutput: question.expectedOutput ?? undefined, scenarioContext: question.scenarioContext ?? undefined,
        isShared: question.isShared, options: question.options.map((o) => ({ optionText: o.optionText, isCorrect: !!o.isCorrect, order: o.order })),
      });
    } else {
      setForm(blank(tracks[0] ?? "soc"));
    }
    setQuality(null); setDupes(null); setSkillInput(""); setKeywordInput("");
  }, [open, question, tracks]);

  const isChoice = CHOICE_TYPES.has(form.questionType);
  const set = <K extends keyof QBBody>(k: K, v: QBBody[K]) => setForm((f) => ({ ...f, [k]: v }));
  const opts = form.options ?? [];
  const setOpt = (i: number, patch: Partial<QBOption>) => set("options", opts.map((o, j) => (j === i ? { ...o, ...patch } : o)));
  const setCorrect = (i: number) => {
    if (form.questionType === "mcq" || form.questionType === "true_false") {
      set("options", opts.map((o, j) => ({ ...o, isCorrect: j === i })));
    } else {
      setOpt(i, { isCorrect: !opts[i].isCorrect });
    }
  };
  const addOpt = () => set("options", [...opts, { optionText: "", isCorrect: false }]);
  const removeOpt = (i: number) => set("options", opts.filter((_, j) => j !== i));

  const addTag = (kind: "skills" | "keywords", value: string) => {
    const v = value.trim();
    if (!v) return;
    const cur = form[kind] ?? [];
    if (!cur.includes(v)) set(kind, [...cur, v]);
    if (kind === "skills") setSkillInput(""); else setKeywordInput("");
  };
  const removeTag = (kind: "skills" | "keywords", value: string) =>
    set(kind, (form[kind] ?? []).filter((t) => t !== value));

  const validate = (): string | null => {
    if (form.questionText.trim().length < 3) return "Question text is required";
    if (isChoice) {
      const filled = opts.filter((o) => o.optionText.trim());
      if (filled.length < 2) return "Add at least 2 options";
      if (!filled.some((o) => o.isCorrect)) return "Mark at least one option correct";
    }
    return null;
  };

  const buildPayload = (): QBBody => ({
    ...form,
    questionText: form.questionText.trim(),
    topic: form.topic?.trim() || undefined,
    explanation: form.explanation?.trim() || undefined,
    options: isChoice ? opts.filter((o) => o.optionText.trim()).map((o, i) => ({ optionText: o.optionText.trim(), isCorrect: !!o.isCorrect, order: i })) : [],
  });

  const save = () => {
    const err = validate();
    if (err) { toast({ title: err, variant: "destructive" }); return; }
    const payload = buildPayload();
    if (isEdit && question) {
      updateMut.mutate({ id: question.id, body: payload }, {
        onSuccess: () => { toast({ title: "Question updated" }); onOpenChange(false); },
        onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
      });
    } else {
      createMut.mutate(payload, {
        onSuccess: () => { toast({ title: "Draft created" }); onOpenChange(false); },
        onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
      });
    }
  };

  const runDifficulty = () => {
    if (!form.questionText.trim()) { toast({ title: "Write the question first", variant: "destructive" }); return; }
    aiDifficulty.mutate({ questionText: form.questionText }, {
      onSuccess: (r) => { set("difficulty", r.difficulty); toast({ title: `Suggested: ${r.difficulty}`, description: r.rationale }); },
      onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
    });
  };
  const runExplain = () => {
    if (!form.questionText.trim()) { toast({ title: "Write the question first", variant: "destructive" }); return; }
    aiExplain.mutate({ questionText: form.questionText, options: isChoice ? opts.map((o) => ({ optionText: o.optionText, isCorrect: !!o.isCorrect })) : undefined }, {
      onSuccess: (r) => { set("explanation", r.explanation); toast({ title: "Explanation drafted" }); },
      onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
    });
  };
  const runQuality = () => {
    if (!form.questionText.trim()) { toast({ title: "Write the question first", variant: "destructive" }); return; }
    aiQuality.mutate({ questionText: form.questionText, questionId: question?.id }, {
      onSuccess: (r) => setQuality({ score: r.score, issues: r.issues, suggestions: r.suggestions }),
      onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
    });
  };
  const runDuplicates = () => {
    if (!form.questionText.trim()) { toast({ title: "Write the question first", variant: "destructive" }); return; }
    aiDuplicates.mutate({ questionText: form.questionText }, {
      onSuccess: (r) => { setDupes(r.duplicates); if (!r.duplicates.length) toast({ title: "No likely duplicates found" }); },
      onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
    });
  };

  const pending = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 gap-0 max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader className="p-6 pb-4 border-b border-border/60">
          <DialogTitle className="text-xl font-heading">{isEdit ? "Edit Question" : "New Question"}</DialogTitle>
          <DialogDescription className="text-sm">
            {isEdit ? "Editing a draft creates a new version snapshot." : "New questions are saved as drafts until you submit them for approval."}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto px-6 py-5 space-y-6">
          {/* Meta row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Track</Label>
              <Select value={form.careerTrack} onValueChange={(v) => set("careerTrack", v)}>
                <SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>{tracks.map((t) => <SelectItem key={t} value={t} className="font-medium">{QB_TRACK_LABELS[t] ?? t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</Label>
              <Select value={form.questionType} onValueChange={(v) => set("questionType", v)}>
                <SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>{QB_TYPES.map((t) => <SelectItem key={t} value={t} className="font-medium">{QB_TYPE_LABELS[t]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Difficulty</Label>
              <Select value={form.difficulty} onValueChange={(v) => set("difficulty", v)}>
                <SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>{QB_DIFFICULTIES.map((d) => <SelectItem key={d} value={d} className="font-medium capitalize">{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {/* Question text */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Question</Label>
              <div className="flex gap-1.5">
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={runDifficulty} disabled={aiDifficulty.isPending}>
                  {aiDifficulty.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Gauge className="h-3 w-3" />} Difficulty
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={runDuplicates} disabled={aiDuplicates.isPending}>
                  {aiDuplicates.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CopyIcon className="h-3 w-3" />} Duplicates
                </Button>
              </div>
            </div>
            <Textarea value={form.questionText} onChange={(e) => set("questionText", e.target.value)} rows={3} placeholder="Type the question stem…" className="resize-none" />
          </div>

          {dupes && dupes.length > 0 && (
            <div className="rounded-xl border border-warning/30 bg-warning/10 p-3 space-y-1.5">
              <p className="text-sm font-semibold text-warning">Possible duplicates</p>
              {dupes.map((d) => (
                <p key={d.id} className="text-xs text-foreground/80 truncate">· {d.questionText} <span className="text-warning">({d.similarity}%)</span></p>
              ))}
            </div>
          )}

          {/* Options */}
          {isChoice && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Options · click the circle to mark correct</Label>
              <div className="space-y-2">
                {opts.map((o, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <button type="button" onClick={() => setCorrect(i)} className={`h-9 w-9 shrink-0 rounded-lg border flex items-center justify-center transition-colors ${o.isCorrect ? "bg-success/10 border-success/40 text-success" : "border-border text-muted-foreground hover:bg-muted/50"}`} aria-label="Mark correct">
                      {o.isCorrect ? <Check className="h-4 w-4" /> : <span className="text-xs font-semibold">{String.fromCharCode(65 + i)}</span>}
                    </button>
                    <Input value={o.optionText} onChange={(e) => setOpt(i, { optionText: e.target.value })} placeholder={`Option ${String.fromCharCode(65 + i)}`} className="h-9" />
                    {opts.length > 2 && <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeOpt(i)}><Trash2 className="h-4 w-4" /></Button>}
                  </div>
                ))}
              </div>
              {opts.length < 8 && <Button type="button" variant="outline" size="sm" className="gap-1 mt-1" onClick={addOpt}><Plus className="h-3.5 w-3.5" /> Add option</Button>}
            </div>
          )}

          {/* Code-specific */}
          {form.questionType === "code" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Language</Label>
                <Input value={form.codeLanguage ?? ""} onChange={(e) => set("codeLanguage", e.target.value)} placeholder="python, bash…" className="h-10" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Expected Output</Label>
                <Input value={form.expectedOutput ?? ""} onChange={(e) => set("expectedOutput", e.target.value)} className="h-10" />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Starter Template</Label>
                <Textarea value={form.codeTemplate ?? ""} onChange={(e) => set("codeTemplate", e.target.value)} rows={4} className="font-mono text-sm resize-none" />
              </div>
            </div>
          )}

          {/* Scenario-specific */}
          {form.questionType === "scenario" && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Scenario Context</Label>
              <Textarea value={form.scenarioContext ?? ""} onChange={(e) => set("scenarioContext", e.target.value)} rows={4} className="resize-none" placeholder="Describe the incident / environment the learner must reason about…" />
            </div>
          )}

          {/* Explanation */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Explanation</Label>
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={runExplain} disabled={aiExplain.isPending}>
                {aiExplain.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} Draft with AI
              </Button>
            </div>
            <Textarea value={form.explanation ?? ""} onChange={(e) => set("explanation", e.target.value)} rows={3} className="resize-none" placeholder="Why is the answer correct? Shown to learners after they answer." />
          </div>

          {/* Tags + scoring */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Topic</Label>
              <Input value={form.topic ?? ""} onChange={(e) => set("topic", e.target.value)} placeholder="e.g. SIEM correlation" className="h-10" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Marks</Label>
                <Input type="number" min={0} value={form.marks ?? 1} onChange={(e) => set("marks", Number(e.target.value))} className="h-10" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Negative</Label>
                <Input type="number" min={0} step="0.25" value={form.negativeMarks ?? 0} onChange={(e) => set("negativeMarks", Number(e.target.value))} className="h-10" />
              </div>
            </div>
          </div>

          {/* Skills + keywords */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(["skills", "keywords"] as const).map((kind) => (
              <div key={kind} className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground capitalize">{kind}</Label>
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {(form[kind] ?? []).map((t) => (
                    <Badge key={t} variant="secondary" className="gap-1 pr-1">{t}<button type="button" onClick={() => removeTag(kind, t)} className="hover:text-destructive"><X className="h-3 w-3" /></button></Badge>
                  ))}
                </div>
                <Input
                  value={kind === "skills" ? skillInput : keywordInput}
                  onChange={(e) => (kind === "skills" ? setSkillInput(e.target.value) : setKeywordInput(e.target.value))}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(kind, kind === "skills" ? skillInput : keywordInput); } }}
                  placeholder={`Add ${kind} + Enter`} className="h-10"
                />
              </div>
            ))}
          </div>

          {/* Quality + share */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/50">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" className="accent-primary w-4 h-4" checked={!!form.isShared} onChange={(e) => set("isShared", e.target.checked)} />
              <span className="text-sm font-medium">Share with other mentors in this track (after approval)</span>
            </label>
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={runQuality} disabled={aiQuality.isPending}>
              {aiQuality.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Quality check
            </Button>
          </div>

          {quality && (
            <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold">AI quality score</span>
                <Badge className={quality.score >= 75 ? "bg-success/10 text-success border border-success/30" : quality.score >= 50 ? "bg-warning/10 text-warning border border-warning/30" : "bg-destructive/15 text-destructive border-destructive/30"}>{quality.score}/100</Badge>
              </div>
              {quality.issues.length > 0 && <div className="text-xs text-foreground/80"><span className="font-semibold flex items-center gap-1"><FileText className="h-3 w-3" /> Issues:</span> {quality.issues.join("; ")}</div>}
              {quality.suggestions.length > 0 && <div className="text-xs text-foreground/80"><span className="font-semibold">Suggestions:</span> {quality.suggestions.join("; ")}</div>}
            </div>
          )}
        </div>

        <div className="bg-muted/50 p-5 border-t border-border/60 flex justify-end gap-3">
          <Button variant="ghost" className="font-semibold" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="font-semibold px-6" onClick={save} disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{isEdit ? "Save changes" : "Create draft"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
