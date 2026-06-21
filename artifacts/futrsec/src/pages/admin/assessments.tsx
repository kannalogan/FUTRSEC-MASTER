import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { PageHeader, CardSkeleton, EmptyState } from "@/components/page-shell";
import { useToast } from "@/hooks/use-toast";
import { ClipboardList, Plus, ListChecks, Trash2, Pencil, X } from "lucide-react";

const TRACK_LABELS: Record<string, string> = {
  soc: "SOC Analyst",
  vapt: "VAPT Professional",
  grc: "GRC Specialist",
};
const TRACK_COLORS: Record<string, string> = {
  soc: "#2563EB",
  vapt: "#F97316",
  grc: "#10B981",
};

const ASSESSMENT_TYPES = [
  { value: "pre_assessment", label: "Pre-Assessment" },
  { value: "module_quiz", label: "Module Quiz" },
  { value: "final_exam", label: "Final Exam" },
  { value: "practice", label: "Practice" },
];
const QUESTION_TYPES = [
  { value: "mcq", label: "Multiple Choice" },
  { value: "multi_select", label: "Multi Select" },
  { value: "true_false", label: "True / False" },
  { value: "code", label: "Code" },
];

function typeLabel(type: string): string {
  return ASSESSMENT_TYPES.find((t) => t.value === type)?.label ?? type;
}
function questionTypeLabel(type: string): string {
  return QUESTION_TYPES.find((t) => t.value === type)?.label ?? type;
}

interface Track {
  id: number;
  name: string;
  slug: string;
  domain: string;
}
interface TracksResp {
  tracks: Track[];
}

interface Assessment {
  id: number;
  title: string;
  type: string;
  trackId: number | null;
  totalQuestions: number;
  durationMinutes: number;
  passingScore: number;
  isActive: boolean;
  trackName: string | null;
  trackSlug: string | null;
}
interface AssessmentsResp {
  assessments: Assessment[];
}

interface QuestionOption {
  id: number;
  optionText: string;
  isCorrect: boolean;
  order: number;
}
interface Question {
  id: number;
  questionText: string;
  questionType: string;
  explanation: string | null;
  points: number;
  order: number;
  options: QuestionOption[];
}
interface AssessmentDetailResp {
  assessment: Assessment;
  questions: Question[];
}

const NO_TRACK = "__none__";
const ALL = "__all__";

interface CreateForm {
  title: string;
  type: string;
  trackId: string;
  passingScore: string;
  durationMinutes: string;
}
const EMPTY_CREATE: CreateForm = {
  title: "",
  type: "module_quiz",
  trackId: NO_TRACK,
  passingScore: "70",
  durationMinutes: "30",
};

interface OptionRow {
  optionText: string;
  isCorrect: boolean;
}
interface QuestionForm {
  questionText: string;
  questionType: string;
  explanation: string;
  points: string;
  options: OptionRow[];
}
const EMPTY_QUESTION: QuestionForm = {
  questionText: "",
  questionType: "mcq",
  explanation: "",
  points: "1",
  options: [
    { optionText: "", isCorrect: false },
    { optionText: "", isCorrect: false },
  ],
};

export default function AdminAssessmentsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [trackFilter, setTrackFilter] = useState(ALL);
  const [typeFilter, setTypeFilter] = useState(ALL);

  const listKey = `/api/admin/assessments${buildQuery(trackFilter, typeFilter)}`;

  const { data, isLoading } = useQuery({
    queryKey: [listKey],
    queryFn: () => apiFetch<AssessmentsResp>(listKey),
  });
  const { data: tracksData } = useQuery({
    queryKey: ["/api/admin/tracks"],
    queryFn: () => apiFetch<TracksResp>("/api/admin/tracks"),
  });

  const assessments = data?.assessments ?? [];
  const tracks = tracksData?.tracks ?? [];

  // ── Create assessment ──────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE);

  const createMut = useMutation({
    mutationFn: (vars: Record<string, unknown>) =>
      apiFetch("/api/admin/assessments", {
        method: "POST",
        body: JSON.stringify(vars),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [listKey] });
      toast({ title: "Assessment created" });
      setCreateOpen(false);
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const submitCreate = () => {
    const title = createForm.title.trim();
    if (title.length < 1) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    const body: Record<string, unknown> = {
      title,
      type: createForm.type,
    };
    if (createForm.trackId !== NO_TRACK) body.trackId = Number(createForm.trackId);
    if (createForm.passingScore) body.passingScore = Number(createForm.passingScore);
    if (createForm.durationMinutes) body.durationMinutes = Number(createForm.durationMinutes);
    createMut.mutate(body);
  };

  // ── Active toggle ──────────────────────────────────────────────────
  const toggleMut = useMutation({
    mutationFn: (vars: { id: number; active: boolean }) =>
      apiFetch(`/api/admin/assessments/${vars.id}/${vars.active ? "activate" : "deactivate"}`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [listKey] });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  // ── Manage questions ───────────────────────────────────────────────
  const [manageId, setManageId] = useState<number | null>(null);

  return (
    <div>
      <PageHeader
        title="Assessment CMS"
        subtitle="Create assessments and manage their questions and answer options."
        icon={ClipboardList}
        actions={
          <Button onClick={() => { setCreateForm(EMPTY_CREATE); setCreateOpen(true); }}>
            <Plus className="h-4 w-4 mr-1.5" /> New Assessment
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="w-48">
          <Select value={trackFilter} onValueChange={setTrackFilter}>
            <SelectTrigger><SelectValue placeholder="Track" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All tracks</SelectItem>
              {tracks.map((t) => (
                <SelectItem key={t.id} value={t.slug}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-48">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All types</SelectItem>
              {ASSESSMENT_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <CardSkeleton rows={6} />
      ) : assessments.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No assessments yet"
          description="Create your first assessment to start adding questions."
          action={
            <Button onClick={() => { setCreateForm(EMPTY_CREATE); setCreateOpen(true); }}>
              <Plus className="h-4 w-4 mr-1.5" /> New Assessment
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Track</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Questions</TableHead>
                  <TableHead>Passing</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assessments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.title}</TableCell>
                    <TableCell>
                      {a.trackSlug ? (
                        <Badge
                          style={{
                            backgroundColor: `${TRACK_COLORS[a.trackSlug] ?? "#64748B"}20`,
                            color: TRACK_COLORS[a.trackSlug] ?? "#64748B",
                          }}
                          className="border-0"
                        >
                          {TRACK_LABELS[a.trackSlug] ?? a.trackName ?? a.trackSlug}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{typeLabel(a.type)}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{a.totalQuestions}</TableCell>
                    <TableCell className="text-muted-foreground">{a.passingScore}%</TableCell>
                    <TableCell>
                      <Switch
                        checked={a.isActive}
                        onCheckedChange={(v) => toggleMut.mutate({ id: a.id, active: v })}
                        disabled={toggleMut.isPending}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setManageId(a.id)}>
                        <ListChecks className="h-4 w-4 mr-1.5" /> Questions
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Assessment</DialogTitle>
            <DialogDescription>Create an assessment shell, then add questions to it.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="a-title">Title</Label>
              <Input
                id="a-title"
                value={createForm.title}
                onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. CP1 — Network Fundamentals"
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={createForm.type} onValueChange={(v) => setCreateForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASSESSMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Track</Label>
              <Select value={createForm.trackId} onValueChange={(v) => setCreateForm((f) => ({ ...f, trackId: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_TRACK}>No track (general)</SelectItem>
                  {tracks.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="a-pass">Passing Score (%)</Label>
                <Input
                  id="a-pass"
                  type="number"
                  min={0}
                  max={100}
                  value={createForm.passingScore}
                  onChange={(e) => setCreateForm((f) => ({ ...f, passingScore: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="a-dur">Duration (min)</Label>
                <Input
                  id="a-dur"
                  type="number"
                  min={1}
                  value={createForm.durationMinutes}
                  onChange={(e) => setCreateForm((f) => ({ ...f, durationMinutes: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={submitCreate} disabled={createMut.isPending}>
              {createMut.isPending ? "Saving…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage questions dialog */}
      <ManageQuestionsDialog
        assessmentId={manageId}
        onClose={() => setManageId(null)}
        listKey={listKey}
      />
    </div>
  );
}

function buildQuery(trackFilter: string, typeFilter: string): string {
  const params = new URLSearchParams();
  if (trackFilter !== ALL) params.set("track", trackFilter);
  if (typeFilter !== ALL) params.set("type", typeFilter);
  const q = params.toString();
  return q ? `?${q}` : "";
}

function ManageQuestionsDialog({
  assessmentId, onClose, listKey,
}: {
  assessmentId: number | null;
  onClose: () => void;
  listKey: string;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const detailKey = `/api/admin/assessments/${assessmentId}`;
  const { data, isLoading } = useQuery({
    queryKey: [detailKey],
    queryFn: () => apiFetch<AssessmentDetailResp>(detailKey),
    enabled: assessmentId !== null,
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<QuestionForm>(EMPTY_QUESTION);

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_QUESTION);
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [detailKey] });
    queryClient.invalidateQueries({ queryKey: [listKey] });
  };

  const addMut = useMutation({
    mutationFn: (vars: Record<string, unknown>) =>
      apiFetch(`/api/admin/assessments/${assessmentId}/questions`, {
        method: "POST",
        body: JSON.stringify(vars),
      }),
    onSuccess: () => {
      invalidate();
      toast({ title: "Question added" });
      resetForm();
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: (vars: { qid: number; body: Record<string, unknown> }) =>
      apiFetch(`/api/admin/assessment-questions/${vars.qid}`, {
        method: "PATCH",
        body: JSON.stringify(vars.body),
      }),
    onSuccess: () => {
      invalidate();
      toast({ title: "Question updated" });
      resetForm();
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (qid: number) =>
      apiFetch(`/api/admin/assessment-questions/${qid}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidate();
      toast({ title: "Question deleted" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const startEdit = (q: Question) => {
    setEditingId(q.id);
    setForm({
      questionText: q.questionText,
      questionType: q.questionType,
      explanation: q.explanation ?? "",
      points: String(q.points),
      options: q.options.length > 0
        ? q.options.map((o) => ({ optionText: o.optionText, isCorrect: o.isCorrect }))
        : [{ optionText: "", isCorrect: false }],
    });
  };

  const setOption = (idx: number, patch: Partial<OptionRow>) =>
    setForm((f) => ({
      ...f,
      options: f.options.map((o, i) => (i === idx ? { ...o, ...patch } : o)),
    }));

  const addOptionRow = () =>
    setForm((f) => ({ ...f, options: [...f.options, { optionText: "", isCorrect: false }] }));

  const removeOptionRow = (idx: number) =>
    setForm((f) => ({ ...f, options: f.options.filter((_, i) => i !== idx) }));

  const submitQuestion = () => {
    const questionText = form.questionText.trim();
    if (questionText.length < 1) {
      toast({ title: "Question text is required", variant: "destructive" });
      return;
    }
    const options = form.options
      .filter((o) => o.optionText.trim().length > 0)
      .map((o, idx) => ({ optionText: o.optionText.trim(), isCorrect: o.isCorrect, order: idx }));

    const body: Record<string, unknown> = {
      questionText,
      questionType: form.questionType,
      explanation: form.explanation.trim() || null,
      points: form.points ? Number(form.points) : 1,
      options,
    };

    if (editingId !== null) {
      updateMut.mutate({ qid: editingId, body });
    } else {
      addMut.mutate(body);
    }
  };

  const questions = data?.questions ?? [];
  const saving = addMut.isPending || updateMut.isPending;

  return (
    <Dialog open={assessmentId !== null} onOpenChange={(open) => { if (!open) { onClose(); resetForm(); } }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{data?.assessment.title ?? "Manage Questions"}</DialogTitle>
          <DialogDescription>Add, edit, and remove questions with their answer options.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <CardSkeleton rows={4} />
        ) : (
          <div className="space-y-6 py-2">
            {/* Existing questions */}
            <div className="space-y-3">
              {questions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No questions yet. Add one below.</p>
              ) : (
                questions.map((q, idx) => (
                  <div key={q.id} className="rounded-lg border border-border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-muted-foreground">Q{idx + 1}</span>
                          <Badge variant="outline" className="text-[10px]">{questionTypeLabel(q.questionType)}</Badge>
                          <span className="text-xs text-muted-foreground">{q.points} pt</span>
                        </div>
                        <p className="text-sm font-medium">{q.questionText}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="icon" variant="ghost" onClick={() => startEdit(q)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteMut.mutate(q.id)}
                          disabled={deleteMut.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    {q.options.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {q.options.map((o) => (
                          <li key={o.id} className="flex items-center gap-2 text-sm">
                            <span
                              className={`h-2 w-2 rounded-full ${o.isCorrect ? "bg-emerald-500" : "bg-muted-foreground/30"}`}
                            />
                            <span className={o.isCorrect ? "font-medium" : "text-muted-foreground"}>
                              {o.optionText}
                            </span>
                            {o.isCorrect && <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[10px]">Correct</Badge>}
                          </li>
                        ))}
                      </ul>
                    )}
                    {q.explanation && (
                      <p className="mt-2 text-xs text-muted-foreground italic">{q.explanation}</p>
                    )}
                  </div>
                ))
              )}
            </div>

            <Separator />

            {/* Add / edit question form */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">{editingId !== null ? "Edit Question" : "Add Question"}</h4>
                {editingId !== null && (
                  <Button size="sm" variant="ghost" onClick={resetForm}>
                    <X className="h-4 w-4 mr-1" /> Cancel edit
                  </Button>
                )}
              </div>

              <div>
                <Label htmlFor="q-text">Question</Label>
                <Textarea
                  id="q-text"
                  value={form.questionText}
                  onChange={(e) => setForm((f) => ({ ...f, questionText: e.target.value }))}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Question Type</Label>
                  <Select value={form.questionType} onValueChange={(v) => setForm((f) => ({ ...f, questionType: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {QUESTION_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="q-points">Points</Label>
                  <Input
                    id="q-points"
                    type="number"
                    min={0}
                    value={form.points}
                    onChange={(e) => setForm((f) => ({ ...f, points: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Options</Label>
                  <Button size="sm" variant="outline" onClick={addOptionRow}>
                    <Plus className="h-4 w-4 mr-1" /> Add option
                  </Button>
                </div>
                <div className="space-y-2">
                  {form.options.map((o, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Checkbox
                        checked={o.isCorrect}
                        onCheckedChange={(v) => setOption(idx, { isCorrect: v === true })}
                      />
                      <Input
                        value={o.optionText}
                        onChange={(e) => setOption(idx, { optionText: e.target.value })}
                        placeholder={`Option ${idx + 1}`}
                        className="flex-1"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeOptionRow(idx)}
                        disabled={form.options.length <= 1}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Check the box next to correct option(s).</p>
              </div>

              <div>
                <Label htmlFor="q-exp">Explanation (optional)</Label>
                <Textarea
                  id="q-exp"
                  value={form.explanation}
                  onChange={(e) => setForm((f) => ({ ...f, explanation: e.target.value }))}
                  rows={2}
                />
              </div>

              <Button onClick={submitQuestion} disabled={saving}>
                {saving ? "Saving…" : editingId !== null ? "Update Question" : "Add Question"}
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => { onClose(); resetForm(); }}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
