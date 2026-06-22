import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  MI_TRACK_LABELS, MI_TRACKS, MI_TYPES, MI_TYPE_LABELS, MI_DIFFICULTIES, MI_SOURCES, MI_SOURCE_LABELS,
  useCreateMITemplate, useUpdateMITemplate, useMIGenerateQuestions,
  type MITemplate, type MITemplateBody, type MICustomQuestion,
} from "@/lib/mock-interview-api";
import {
  Plus, Trash2, Sparkles, Loader2, X, GripVertical,
} from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  template?: MITemplate | null;
}

function blank(): MITemplateBody {
  return {
    title: "",
    description: "",
    careerTrack: MI_TRACKS[0],
    interviewType: "technical",
    difficulty: "intermediate",
    totalQuestions: 8,
    durationMin: 30,
    rounds: 1,
    passingScore: 60,
    allowVoice: true,
    questionSource: "ai",
    questionBankIds: [],
    customQuestions: [],
    focusSkills: [],
    instructions: "",
  };
}

export function MockInterviewEditorDialog({ open, onOpenChange, template }: Props) {
  const { toast } = useToast();
  const isEdit = !!template;
  const createMut = useCreateMITemplate();
  const updateMut = useUpdateMITemplate();
  const genMut = useMIGenerateQuestions();

  const [form, setForm] = useState<MITemplateBody>(blank());
  const [skillInput, setSkillInput] = useState("");
  const [custom, setCustom] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    if (template) {
      setForm({
        title: template.title,
        description: template.description ?? "",
        careerTrack: template.careerTrack,
        interviewType: template.interviewType,
        difficulty: template.difficulty,
        totalQuestions: template.totalQuestions,
        durationMin: template.durationMin,
        rounds: template.rounds,
        passingScore: template.passingScore,
        allowVoice: template.allowVoice,
        questionSource: template.questionSource,
        questionBankIds: template.questionBankIds,
        focusSkills: template.focusSkills,
        instructions: template.instructions ?? "",
      });
      setCustom((template.customQuestions ?? []).slice().sort((a, b) => a.index - b.index).map((q) => q.question));
    } else {
      setForm(blank());
      setCustom([]);
    }
    setSkillInput("");
  }, [open, template]);

  const set = <K extends keyof MITemplateBody>(k: K, v: MITemplateBody[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const addSkill = () => {
    const s = skillInput.trim();
    if (!s) return;
    if (!(form.focusSkills ?? []).includes(s)) set("focusSkills", [...(form.focusSkills ?? []), s]);
    setSkillInput("");
  };
  const removeSkill = (s: string) => set("focusSkills", (form.focusSkills ?? []).filter((x) => x !== s));

  const addCustom = () => setCustom((c) => [...c, ""]);
  const setCustomAt = (i: number, v: string) => setCustom((c) => c.map((x, idx) => (idx === i ? v : x)));
  const removeCustom = (i: number) => setCustom((c) => c.filter((_, idx) => idx !== i));

  const aiPreview = async () => {
    try {
      const r = await genMut.mutateAsync({
        careerTrack: form.careerTrack,
        interviewType: form.interviewType,
        difficulty: form.difficulty,
        count: form.totalQuestions ?? 8,
        focusSkills: form.focusSkills,
      });
      setCustom(r.questions.map((q) => q.question));
      set("questionSource", "custom");
      toast({ title: "Questions generated", description: `${r.count} questions added (${r.provider}). Edit them as needed.` });
    } catch (e) {
      toast({ title: "Generation failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  const submit = async () => {
    if (!form.title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    const customQuestions: MICustomQuestion[] = custom
      .map((q) => q.trim())
      .filter(Boolean)
      .map((question, index) => ({ index, question }));

    if (form.questionSource === "custom" && customQuestions.length === 0) {
      toast({ title: "Add at least one custom question", variant: "destructive" });
      return;
    }

    const payload: MITemplateBody = {
      ...form,
      description: form.description?.trim() || undefined,
      instructions: form.instructions?.trim() || undefined,
      customQuestions: form.questionSource === "custom" ? customQuestions : undefined,
    };

    try {
      if (isEdit && template) {
        await updateMut.mutateAsync({ id: template.id, body: payload });
        toast({ title: "Saved", description: "Template updated." });
      } else {
        await createMut.mutateAsync(payload);
        toast({ title: "Created", description: "Draft template created. Publish it to assign." });
      }
      onOpenChange(false);
    } catch (e) {
      toast({ title: "Save failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  const saving = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Template" : "New Mock Interview Template"}</DialogTitle>
          <DialogDescription>
            Configure the interview, then publish it to assign to your students.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. SOC L1 Technical Screen" />
          </div>

          <div className="space-y-2">
            <Label>Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} placeholder="What this interview covers…" className="min-h-[60px]" />
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Track</Label>
              <Select value={form.careerTrack} onValueChange={(v) => set("careerTrack", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MI_TRACKS.map((t) => <SelectItem key={t} value={t}>{MI_TRACK_LABELS[t]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.interviewType} onValueChange={(v) => set("interviewType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MI_TYPES.map((t) => <SelectItem key={t} value={t}>{MI_TYPE_LABELS[t]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select value={form.difficulty} onValueChange={(v) => set("difficulty", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MI_DIFFICULTIES.map((d) => <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid sm:grid-cols-4 gap-3">
            <div className="space-y-2">
              <Label>Questions</Label>
              <Input type="number" min={3} max={30} value={form.totalQuestions ?? 8} onChange={(e) => set("totalQuestions", Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Duration (m)</Label>
              <Input type="number" min={5} max={240} value={form.durationMin ?? 30} onChange={(e) => set("durationMin", Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Rounds</Label>
              <Input type="number" min={1} max={5} value={form.rounds ?? 1} onChange={(e) => set("rounds", Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Pass %</Label>
              <Input type="number" min={0} max={100} value={form.passingScore ?? 60} onChange={(e) => set("passingScore", Number(e.target.value))} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
            <div>
              <Label className="cursor-pointer">Allow voice answers</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Students can answer by voice when a provider is available.</p>
            </div>
            <Switch checked={form.allowVoice} onCheckedChange={(v) => set("allowVoice", v)} />
          </div>

          <div className="space-y-2">
            <Label>Focus skills <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <div className="flex gap-2">
              <Input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                placeholder="e.g. SIEM, incident triage"
              />
              <Button type="button" variant="outline" onClick={addSkill}><Plus className="h-4 w-4" /></Button>
            </div>
            {(form.focusSkills ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {(form.focusSkills ?? []).map((s) => (
                  <Badge key={s} variant="secondary" className="gap-1">
                    {s}
                    <button onClick={() => removeSkill(s)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Question source</Label>
            <Select value={form.questionSource} onValueChange={(v) => set("questionSource", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{MI_SOURCES.map((s) => <SelectItem key={s} value={s}>{MI_SOURCE_LABELS[s]}</SelectItem>)}</SelectContent>
            </Select>
            {form.questionSource === "ai" && (
              <p className="text-xs text-muted-foreground">Questions are generated for each student when they start, scoped to the track and difficulty.</p>
            )}
            {form.questionSource === "bank" && (
              <p className="text-xs text-muted-foreground">Pull approved questions from your Question Bank. Manage selection from the bank, then reference them here.</p>
            )}
          </div>

          {form.questionSource === "custom" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Custom questions</Label>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={aiPreview} disabled={genMut.isPending}>
                    {genMut.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
                    AI draft
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={addCustom}><Plus className="h-3.5 w-3.5 mr-1.5" />Add</Button>
                </div>
              </div>
              <div className="space-y-2">
                {custom.length === 0 && <p className="text-xs text-muted-foreground">No questions yet. Add manually or generate an AI draft.</p>}
                {custom.map((q, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground/50 mt-2.5 shrink-0" />
                    <Textarea value={q} onChange={(e) => setCustomAt(i, e.target.value)} placeholder={`Question ${i + 1}`} className="min-h-[44px]" />
                    <Button type="button" variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeCustom(i)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Instructions for students <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea value={form.instructions ?? ""} onChange={(e) => set("instructions", e.target.value)} placeholder="Any context or rules shown before the interview begins…" className="min-h-[60px]" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            {isEdit ? "Save changes" : "Create draft"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
