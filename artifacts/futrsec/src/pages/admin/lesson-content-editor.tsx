import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { CardSkeleton, EmptyState } from "@/components/page-shell";
import { useToast } from "@/hooks/use-toast";
import {
  Video, FileText, ListChecks, Link2, Trash2, Plus, Database,
  ClipboardList, HelpCircle,
} from "lucide-react";
import {
  useAdminQuestions, QB_TRACKS, QB_TYPES, QB_DIFFICULTIES,
  QB_TRACK_LABELS, QB_TYPE_LABELS, CHOICE_TYPES,
  type QBQuestion,
} from "@/lib/question-bank-api";

const ALL = "__all__";
const VIDEO_PROVIDERS = ["youtube", "vimeo", "bunny", "s3", "url"] as const;
const RESOURCE_TYPES = ["link", "pdf", "file", "code", "tool"] as const;

interface LessonLite {
  id: number;
  title: string;
  type: string;
}

interface VideoBlock {
  id: number;
  lessonId: number;
  title: string | null;
  description: string | null;
  provider: string | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  transcript: string | null;
  durationSeconds: number | null;
}
interface ArticleBlock {
  id: number;
  lessonId: number;
  content: string;
}
interface QuizQuestion {
  id: number;
  quizId: number;
  question: string;
  type: string;
  options: string[];
  correctAnswers: number[];
  explanation: string | null;
  points: number;
  order: number;
}
interface QuizBlock {
  id: number;
  lessonId: number;
  title: string;
  passingScore: number;
  sourceType: string | null;
  sourceAssessmentId: number | null;
  questions: QuizQuestion[];
}
interface ResourceBlock {
  id: number;
  lessonId: number;
  title: string;
  url: string;
  type: string;
}
interface ContentResp {
  lesson: LessonLite;
  video: VideoBlock | null;
  article: ArticleBlock | null;
  quiz: QuizBlock | null;
  resources: ResourceBlock[];
}

interface AssessmentLite {
  id: number;
  title: string;
  trackId: number | null;
  questionCount?: number;
}

export function LessonContentEditor({
  lesson,
  open,
  onClose,
}: {
  lesson: LessonLite | null;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const lessonId = lesson?.id ?? null;

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "lesson-content", lessonId],
    queryFn: () => apiFetch<ContentResp>(`/api/admin/lessons/${lessonId}/content`),
    enabled: open && lessonId != null,
  });

  const refresh = () =>
    qc.invalidateQueries({ queryKey: ["admin", "lesson-content", lessonId] });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Lesson Content — {lesson?.title}</DialogTitle>
          <DialogDescription>
            Author the video, article, quiz, and downloadable resources students
            see in this lesson.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !data ? (
          <CardSkeleton rows={5} />
        ) : (
          <div className="space-y-6">
            <VideoSection
              lessonId={data.lesson.id}
              video={data.video}
              onSaved={refresh}
            />
            <ArticleSection
              lessonId={data.lesson.id}
              article={data.article}
              onSaved={refresh}
            />
            <QuizSection
              lessonId={data.lesson.id}
              quiz={data.quiz}
              onSaved={refresh}
            />
            <ResourcesSection
              lessonId={data.lesson.id}
              resources={data.resources}
              onSaved={refresh}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  function notifyErr(e: unknown) {
    toast({
      title: "Something went wrong",
      description: e instanceof Error ? e.message : "Please try again.",
      variant: "destructive",
    });
  }
  void notifyErr;
}

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <h4 className="flex items-center gap-2 text-sm font-semibold">
      <Icon className="h-4 w-4 text-primary" />
      {children}
    </h4>
  );
}

// ─── Video ──────────────────────────────────────────────────────────────────
function VideoSection({
  lessonId,
  video,
  onSaved,
}: {
  lessonId: number;
  video: VideoBlock | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState(video?.title ?? "");
  const [description, setDescription] = useState(video?.description ?? "");
  const [provider, setProvider] = useState(video?.provider ?? "");
  const [videoUrl, setVideoUrl] = useState(video?.videoUrl ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState(video?.thumbnailUrl ?? "");
  const [transcript, setTranscript] = useState(video?.transcript ?? "");
  const [duration, setDuration] = useState(
    video?.durationSeconds != null ? String(video.durationSeconds) : "",
  );

  const save = useMutation({
    mutationFn: () =>
      apiFetch(`/api/admin/lessons/${lessonId}/video`, {
        method: "PUT",
        body: JSON.stringify({
          title: title.trim() || null,
          description: description.trim() || null,
          provider: provider || undefined,
          videoUrl: videoUrl.trim(),
          thumbnailUrl: thumbnailUrl.trim() || null,
          transcript: transcript.trim() || null,
          durationSeconds: duration ? Number(duration) : null,
        }),
      }),
    onSuccess: () => {
      toast({ title: "Video saved" });
      onSaved();
    },
    onError: (e) =>
      toast({
        title: "Could not save video",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      }),
  });

  return (
    <section className="border rounded-lg p-4 space-y-3">
      <SectionTitle icon={Video}>Video</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label>Video URL</Label>
          <Input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=…  ·  vimeo  ·  bunny  ·  s3"
          />
        </div>
        <div>
          <Label>Provider</Label>
          <Select
            value={provider || ALL}
            onValueChange={(v) => setProvider(v === ALL ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Auto-detect from URL" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Auto-detect from URL</SelectItem>
              {VIDEO_PROVIDERS.map((p) => (
                <SelectItem key={p} value={p} className="capitalize">
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Duration (seconds)</Label>
          <Input
            type="number"
            min={0}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
        </div>
        <div className="col-span-2">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="col-span-2">
          <Label>Thumbnail URL</Label>
          <Input
            value={thumbnailUrl}
            onChange={(e) => setThumbnailUrl(e.target.value)}
            placeholder="https://…"
          />
        </div>
        <div className="col-span-2">
          <Label>Description</Label>
          <Textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="col-span-2">
          <Label>Transcript</Label>
          <Textarea
            rows={4}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Optional — improves accessibility & search."
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => save.mutate()}
          disabled={save.isPending || videoUrl.trim().length === 0}
        >
          Save Video
        </Button>
      </div>
    </section>
  );
}

// ─── Article ──────────────────────────────────────────────────────────────────
function ArticleSection({
  lessonId,
  article,
  onSaved,
}: {
  lessonId: number;
  article: ArticleBlock | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [content, setContent] = useState(article?.content ?? "");

  const save = useMutation({
    mutationFn: () =>
      apiFetch(`/api/admin/lessons/${lessonId}/article`, {
        method: "PUT",
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => {
      toast({ title: "Article saved" });
      onSaved();
    },
    onError: (e) =>
      toast({
        title: "Could not save article",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      }),
  });

  return (
    <section className="border rounded-lg p-4 space-y-3">
      <SectionTitle icon={FileText}>Article</SectionTitle>
      <p className="text-xs text-muted-foreground">
        Markdown supported — headings, lists, links, images, and fenced code
        blocks.
      </p>
      <Textarea
        rows={8}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={"## Section heading\n\nWrite the lesson reading here…"}
        className="font-mono text-sm"
      />
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => save.mutate()}
          disabled={save.isPending || content.trim().length === 0}
        >
          Save Article
        </Button>
      </div>
    </section>
  );
}

// ─── Quiz ──────────────────────────────────────────────────────────────────
function QuizSection({
  lessonId,
  quiz,
  onSaved,
}: {
  lessonId: number;
  quiz: QuizBlock | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState(quiz?.title ?? "");
  const [passingScore, setPassingScore] = useState(
    quiz ? String(quiz.passingScore) : "70",
  );
  const [bankOpen, setBankOpen] = useState(false);
  const [assessmentOpen, setAssessmentOpen] = useState(false);

  const saveMeta = useMutation({
    mutationFn: () =>
      apiFetch(`/api/admin/lessons/${lessonId}/quiz`, {
        method: "PUT",
        body: JSON.stringify({
          title: title.trim(),
          passingScore: passingScore ? Number(passingScore) : undefined,
        }),
      }),
    onSuccess: () => {
      toast({ title: "Quiz saved" });
      onSaved();
    },
    onError: (e) =>
      toast({
        title: "Could not save quiz",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      }),
  });

  const deleteQ = useMutation({
    mutationFn: (qid: number) =>
      apiFetch(`/api/admin/lessons/${lessonId}/quiz/questions/${qid}`, {
        method: "DELETE",
      }),
    onSuccess: () => onSaved(),
    onError: (e) =>
      toast({
        title: "Could not remove question",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      }),
  });

  return (
    <section className="border rounded-lg p-4 space-y-3">
      <SectionTitle icon={ListChecks}>Quiz</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Quiz title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="End-of-lesson check"
          />
        </div>
        <div>
          <Label>Passing score (%)</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={passingScore}
            onChange={(e) => setPassingScore(e.target.value)}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => saveMeta.mutate()}
          disabled={saveMeta.isPending || title.trim().length === 0}
        >
          Save Quiz Settings
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setAssessmentOpen(true)}
        >
          <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
          From Assessment
        </Button>
        <Button size="sm" variant="outline" onClick={() => setBankOpen(true)}>
          <Database className="h-3.5 w-3.5 mr-1.5" />
          From Question Bank
        </Button>
        {quiz?.sourceType && (
          <Badge variant="secondary" className="ml-auto capitalize">
            Source: {quiz.sourceType.replace("_", " ")}
          </Badge>
        )}
      </div>

      {quiz && quiz.questions.length > 0 ? (
        <ul className="space-y-2 mt-2">
          {quiz.questions.map((q, idx) => (
            <li
              key={q.id}
              className="flex items-start gap-2 border rounded-md p-2.5 text-sm"
            >
              <span className="text-muted-foreground">{idx + 1}.</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{q.question}</span>
                  <Badge variant="outline" className="capitalize shrink-0">
                    {q.type.replace("_", " ")}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {q.options.map((opt, i) => (
                    <span
                      key={i}
                      className={
                        q.correctAnswers.includes(i)
                          ? "text-primary font-medium mr-3"
                          : "mr-3"
                      }
                    >
                      {q.correctAnswers.includes(i) ? "✓ " : ""}
                      {opt}
                    </span>
                  ))}
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => deleteQ.mutate(q.id)}
                disabled={deleteQ.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">
          No questions yet. Add them from an existing assessment or the question
          bank.
        </p>
      )}

      {bankOpen && (
        <BankPickerDialog
          lessonId={lessonId}
          passingScore={passingScore ? Number(passingScore) : undefined}
          open={bankOpen}
          onClose={() => setBankOpen(false)}
          onAdded={onSaved}
        />
      )}
      {assessmentOpen && (
        <AssessmentPickerDialog
          lessonId={lessonId}
          passingScore={passingScore ? Number(passingScore) : undefined}
          open={assessmentOpen}
          onClose={() => setAssessmentOpen(false)}
          onAdded={onSaved}
        />
      )}
    </section>
  );
}

// ─── Quiz: From Question Bank ────────────────────────────────────────────────
function BankPickerDialog({
  lessonId,
  passingScore,
  open,
  onClose,
  onAdded,
}: {
  lessonId: number;
  passingScore?: number;
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}) {
  const { toast } = useToast();
  const [track, setTrack] = useState<string>(ALL);
  const [type, setType] = useState<string>(ALL);
  const [difficulty, setDifficulty] = useState<string>(ALL);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const { data, isLoading } = useAdminQuestions({
    status: "approved",
    track: track === ALL ? undefined : track,
    type: type === ALL ? undefined : type,
    difficulty: difficulty === ALL ? undefined : difficulty,
    q: search.trim() || undefined,
    pageSize: 50,
  });

  // Only choice-based questions can become a lesson quiz.
  const items = (data?.items ?? []).filter((q: QBQuestion) =>
    CHOICE_TYPES.has(q.questionType),
  );

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const add = useMutation({
    mutationFn: () =>
      apiFetch<{ copied: number; skipped: number[] }>(
        `/api/admin/lessons/${lessonId}/quiz/from-bank`,
        {
          method: "POST",
          body: JSON.stringify({
            bankQuestionIds: [...selected],
            passingScore,
          }),
        },
      ),
    onSuccess: (res) => {
      toast({
        title: `Added ${res.copied} question${res.copied === 1 ? "" : "s"}`,
        description:
          res.skipped.length > 0
            ? `${res.skipped.length} skipped (not approved or not choice-based).`
            : undefined,
      });
      onAdded();
      onClose();
    },
    onError: (e) =>
      toast({
        title: "Could not add questions",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add from Question Bank</DialogTitle>
          <DialogDescription>
            Only approved, choice-based questions can be added to a lesson quiz.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder="Search questions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="col-span-2"
          />
          <Select value={track} onValueChange={setTrack}>
            <SelectTrigger>
              <SelectValue placeholder="Track" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All tracks</SelectItem>
              {QB_TRACKS.map((t) => (
                <SelectItem key={t} value={t}>
                  {QB_TRACK_LABELS[t] ?? t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All types</SelectItem>
              {QB_TYPES.filter((t) => CHOICE_TYPES.has(t)).map((t) => (
                <SelectItem key={t} value={t}>
                  {QB_TYPE_LABELS[t] ?? t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger>
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All difficulties</SelectItem>
              {QB_DIFFICULTIES.map((d) => (
                <SelectItem key={d} value={d} className="capitalize">
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-2 max-h-[40vh] overflow-y-auto space-y-1.5">
          {isLoading ? (
            <CardSkeleton rows={4} />
          ) : items.length === 0 ? (
            <EmptyState
              icon={HelpCircle}
              title="No matching questions"
              description="Adjust the filters or approve more questions first."
            />
          ) : (
            items.map((q: QBQuestion) => (
              <label
                key={q.id}
                className="flex items-start gap-2 border rounded-md p-2.5 text-sm cursor-pointer hover:bg-muted/50"
              >
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={selected.has(q.id)}
                  onChange={() => toggle(q.id)}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{q.questionText}</div>
                  <div className="flex gap-1.5 mt-1">
                    <Badge variant="outline" className="capitalize">
                      {QB_TYPE_LABELS[q.questionType] ?? q.questionType}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {q.difficulty}
                    </Badge>
                    <Badge variant="outline" className="uppercase">
                      {q.careerTrack}
                    </Badge>
                  </div>
                </div>
              </label>
            ))
          )}
        </div>

        <div className="flex justify-between items-center pt-2">
          <span className="text-sm text-muted-foreground">
            {selected.size} selected
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => add.mutate()}
              disabled={add.isPending || selected.size === 0}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add {selected.size > 0 ? selected.size : ""} to Quiz
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Quiz: From Assessment ───────────────────────────────────────────────────
function AssessmentPickerDialog({
  lessonId,
  passingScore,
  open,
  onClose,
  onAdded,
}: {
  lessonId: number;
  passingScore?: number;
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}) {
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "assessments-lite"],
    queryFn: () =>
      apiFetch<{ assessments: AssessmentLite[] } | AssessmentLite[]>(
        "/api/admin/assessments",
      ),
    enabled: open,
  });
  const assessments: AssessmentLite[] = Array.isArray(data)
    ? data
    : (data?.assessments ?? []);

  const copy = useMutation({
    mutationFn: () =>
      apiFetch<{ copied: number; skipped: number }>(
        `/api/admin/lessons/${lessonId}/quiz/from-assessment`,
        {
          method: "POST",
          body: JSON.stringify({
            assessmentId: Number(selectedId),
            passingScore,
          }),
        },
      ),
    onSuccess: (res) => {
      toast({
        title: `Copied ${res.copied} question${res.copied === 1 ? "" : "s"}`,
        description:
          res.skipped > 0
            ? `${res.skipped} skipped (not choice-based).`
            : undefined,
      });
      onAdded();
      onClose();
    },
    onError: (e) =>
      toast({
        title: "Could not copy assessment",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Build quiz from Assessment</DialogTitle>
          <DialogDescription>
            Copies the assessment's choice-based questions into this lesson
            quiz. This replaces any existing quiz questions.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <CardSkeleton rows={2} />
        ) : (
          <div className="space-y-3">
            <div>
              <Label>Assessment</Label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an assessment" />
                </SelectTrigger>
                <SelectContent>
                  {assessments.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => copy.mutate()}
                disabled={copy.isPending || !selectedId}
              >
                Copy Questions
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Resources ───────────────────────────────────────────────────────────────
function ResourcesSection({
  lessonId,
  resources,
  onSaved,
}: {
  lessonId: number;
  resources: ResourceBlock[];
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState<string>("link");

  const add = useMutation({
    mutationFn: () =>
      apiFetch(`/api/admin/lessons/${lessonId}/resources`, {
        method: "POST",
        body: JSON.stringify({ title: title.trim(), url: url.trim(), type }),
      }),
    onSuccess: () => {
      setTitle("");
      setUrl("");
      setType("link");
      onSaved();
    },
    onError: (e) =>
      toast({
        title: "Could not add resource",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      }),
  });

  const remove = useMutation({
    mutationFn: (rid: number) =>
      apiFetch(`/api/admin/lessons/${lessonId}/resources/${rid}`, {
        method: "DELETE",
      }),
    onSuccess: () => onSaved(),
    onError: (e) =>
      toast({
        title: "Could not remove resource",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      }),
  });

  return (
    <section className="border rounded-lg p-4 space-y-3">
      <SectionTitle icon={Link2}>Resources & Attachments</SectionTitle>
      {resources.length > 0 && (
        <ul className="space-y-1.5">
          {resources.map((r) => (
            <li
              key={r.id}
              className="flex items-center gap-2 border rounded-md p-2 text-sm"
            >
              <Badge variant="outline" className="capitalize shrink-0">
                {r.type}
              </Badge>
              <a
                href={r.url}
                target="_blank"
                rel="noreferrer"
                className="flex-1 min-w-0 truncate text-primary hover:underline"
              >
                {r.title}
              </a>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => remove.mutate(r.id)}
                disabled={remove.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="grid grid-cols-12 gap-2 items-end">
        <div className="col-span-4">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="col-span-5">
          <Label>URL</Label>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
          />
        </div>
        <div className="col-span-3">
          <Label>Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RESOURCE_TYPES.map((t) => (
                <SelectItem key={t} value={t} className="capitalize">
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          onClick={() => add.mutate()}
          disabled={add.isPending || !title.trim() || !url.trim()}
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Resource
        </Button>
      </div>
    </section>
  );
}
