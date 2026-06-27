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
import {
  ClipboardList, Plus, ListChecks, Trash2, Pencil, X,
  Database, Sparkles, Search, Library,
} from "lucide-react";
import {
  useAdminQuestions,
  QB_TRACKS, QB_TRACK_LABELS, QB_TYPES, QB_TYPE_LABELS, QB_DIFFICULTIES,
} from "@/lib/question-bank-api";

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
  securityEnabled: boolean;
  maxWarnings: string;
  maxAttempts: string;
}
const EMPTY_CREATE: CreateForm = {
  title: "",
  type: "module_quiz",
  trackId: NO_TRACK,
  passingScore: "70",
  durationMinutes: "30",
  securityEnabled: false,
  maxWarnings: "3",
  maxAttempts: "",
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
    body.securityEnabled = createForm.securityEnabled;
    if (createForm.maxWarnings) body.maxWarnings = Number(createForm.maxWarnings);
    body.maxAttempts = createForm.maxAttempts
      ? Number(createForm.maxAttempts)
      : null;
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
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="a-sec">Proctoring (security mode)</Label>
                  <p className="text-xs text-muted-foreground">
                    Lock copy/paste and end the attempt after repeated tab switches.
                  </p>
                </div>
                <Switch
                  id="a-sec"
                  checked={createForm.securityEnabled}
                  onCheckedChange={(v) =>
                    setCreateForm((f) => ({ ...f, securityEnabled: v }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="a-warn">Max warnings</Label>
                  <Input
                    id="a-warn"
                    type="number"
                    min={1}
                    max={10}
                    disabled={!createForm.securityEnabled}
                    value={createForm.maxWarnings}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, maxWarnings: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="a-att">Max attempts</Label>
                  <Input
                    id="a-att"
                    type="number"
                    min={1}
                    max={100}
                    placeholder="Unlimited"
                    value={createForm.maxAttempts}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, maxAttempts: e.target.value }))
                    }
                  />
                </div>
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

const QB_ALL = "__all__";

function BankPicker({
  assessmentId,
  onChanged,
}: {
  assessmentId: number;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [track, setTrack] = useState(QB_ALL);
  const [type, setType] = useState(QB_ALL);
  const [difficulty, setDifficulty] = useState(QB_ALL);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Auto-generate sub-form
  const [genTrack, setGenTrack] = useState(QB_ALL);
  const [genType, setGenType] = useState(QB_ALL);
  const [genDifficulty, setGenDifficulty] = useState(QB_ALL);
  const [genCount, setGenCount] = useState("10");

  const { data, isLoading } = useAdminQuestions({
    status: "approved",
    track: track === QB_ALL ? undefined : track,
    type: type === QB_ALL ? undefined : type,
    difficulty: difficulty === QB_ALL ? undefined : difficulty,
    q: search.trim() || undefined,
    pageSize: 50,
  });
  const questions = data?.items ?? [];

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const fromBankMut = useMutation({
    mutationFn: (ids: number[]) =>
      apiFetch<{ attached: number; skipped: number[]; totalQuestions: number }>(
        `/api/admin/assessments/${assessmentId}/questions/from-bank`,
        { method: "POST", body: JSON.stringify({ bankQuestionIds: ids }) },
      ),
    onSuccess: (r) => {
      toast({
        title: `Added ${r.attached} question${r.attached === 1 ? "" : "s"} from the bank`,
        description:
          r.skipped.length > 0
            ? `${r.skipped.length} skipped (not approved).`
            : undefined,
      });
      setSelected(new Set());
      onChanged();
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const autoGenMut = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch<{ attached: number; requested: number; poolSize: number; totalQuestions: number }>(
        `/api/admin/assessments/${assessmentId}/questions/auto-generate`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    onSuccess: (r) => {
      toast({
        title: `Auto-generated ${r.attached} question${r.attached === 1 ? "" : "s"}`,
        description:
          r.attached < r.requested
            ? `Only ${r.poolSize} approved question(s) matched the filters.`
            : undefined,
      });
      onChanged();
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const runAutoGen = () => {
    const count = Number(genCount);
    if (!Number.isInteger(count) || count < 1) {
      toast({ title: "Enter a valid question count", variant: "destructive" });
      return;
    }
    autoGenMut.mutate({
      count,
      careerTrack: genTrack === QB_ALL ? undefined : genTrack,
      questionType: genType === QB_ALL ? undefined : genType,
      difficulty: genDifficulty === QB_ALL ? undefined : genDifficulty,
    });
  };

  return (
    <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
      <div className="flex items-center gap-2">
        <Database className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold">Add from Question Bank</h4>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
        <Select value={track} onValueChange={setTrack}>
          <SelectTrigger><SelectValue placeholder="Track" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={QB_ALL}>All tracks</SelectItem>
            {QB_TRACKS.map((t) => (
              <SelectItem key={t} value={t}>{QB_TRACK_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={difficulty} onValueChange={setDifficulty}>
          <SelectTrigger><SelectValue placeholder="Difficulty" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={QB_ALL}>All difficulties</SelectItem>
            {QB_DIFFICULTIES.map((d) => (
              <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={QB_ALL}>All types</SelectItem>
            {QB_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{QB_TYPE_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="pl-8"
          />
        </div>
      </div>

      {/* Question list */}
      <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border border-border bg-background p-2">
        {isLoading ? (
          <p className="p-3 text-sm text-muted-foreground">Loading questions…</p>
        ) : questions.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">
            No approved questions match these filters.
          </p>
        ) : (
          questions.map((q) => (
            <label
              key={q.id}
              className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-muted/50"
            >
              <Checkbox
                checked={selected.has(q.id)}
                onCheckedChange={() => toggle(q.id)}
                className="mt-0.5"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm">{q.questionText}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  <Badge variant="outline" className="text-[10px] uppercase">{q.careerTrack}</Badge>
                  <Badge variant="outline" className="text-[10px] capitalize">{q.difficulty}</Badge>
                  <Badge variant="outline" className="text-[10px]">{QB_TYPE_LABELS[q.questionType] ?? q.questionType}</Badge>
                  <span className="text-[10px] text-muted-foreground">{q.marks} pt · used {q.usageCount}×</span>
                </div>
              </div>
            </label>
          ))
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{selected.size} selected</span>
        <Button
          size="sm"
          onClick={() => fromBankMut.mutate([...selected])}
          disabled={selected.size === 0 || fromBankMut.isPending}
        >
          <Plus className="mr-1 h-4 w-4" />
          {fromBankMut.isPending ? "Adding…" : "Add selected"}
        </Button>
      </div>

      <Separator />

      {/* Auto-generate */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h5 className="text-sm font-semibold">Auto-generate</h5>
          <span className="text-xs text-muted-foreground">Randomly pick approved questions</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Select value={genTrack} onValueChange={setGenTrack}>
            <SelectTrigger><SelectValue placeholder="Track" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={QB_ALL}>Any track</SelectItem>
              {QB_TRACKS.map((t) => (
                <SelectItem key={t} value={t}>{QB_TRACK_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={genDifficulty} onValueChange={setGenDifficulty}>
            <SelectTrigger><SelectValue placeholder="Difficulty" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={QB_ALL}>Any difficulty</SelectItem>
              {QB_DIFFICULTIES.map((d) => (
                <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={genType} onValueChange={setGenType}>
            <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={QB_ALL}>Any type</SelectItem>
              {QB_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{QB_TYPE_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            min={1}
            value={genCount}
            onChange={(e) => setGenCount(e.target.value)}
            placeholder="Count"
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={runAutoGen}
          disabled={autoGenMut.isPending}
        >
          <Library className="mr-1 h-4 w-4" />
          {autoGenMut.isPending ? "Generating…" : "Auto-generate & add"}
        </Button>
      </div>
    </div>
  );
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
                              className={`h-2 w-2 rounded-full ${o.isCorrect ? "bg-success" : "bg-muted-foreground/30"}`}
                            />
                            <span className={o.isCorrect ? "font-medium" : "text-muted-foreground"}>
                              {o.optionText}
                            </span>
                            {o.isCorrect && <Badge className="bg-success/10 text-success border border-success/30 text-[10px]">Correct</Badge>}
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

            {/* Add from question bank (only when not editing an existing question) */}
            {editingId === null && assessmentId !== null && (
              <>
                <BankPicker assessmentId={assessmentId} onChanged={invalidate} />
                <Separator />
              </>
            )}

            {/* Add / edit question form */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">{editingId !== null ? "Edit Question" : "Add Question Manually"}</h4>
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
