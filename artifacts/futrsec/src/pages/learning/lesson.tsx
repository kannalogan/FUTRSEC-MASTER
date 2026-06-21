import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useRoute, Link, useLocation } from "wouter";
import ReactMarkdown from "react-markdown";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EmptyState } from "@/components/page-shell";
import {
  ArrowLeft, ChevronLeft, ChevronRight, CheckCircle2, Bookmark, Share2,
  PlayCircle, FileText, LinkIcon, ClipboardList, MessageSquare, StickyNote,
  Sparkles, Clock, Award, ThumbsUp, Pin, BadgeCheck, Send, Loader2, ExternalLink,
  RotateCcw, Trophy, AlertCircle, BookOpen, Download, FileCode, Wrench,
} from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────
function initials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}
function timeAgo(iso?: string | null) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
function fmtTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const RESOURCE_ICONS: Record<string, React.ComponentType<any>> = {
  pdf: FileText, doc: FileText, link: LinkIcon, tool: Wrench, code: FileCode, download: Download,
};

// ── Video player with resume + speed ───────────────────────────────────────
function VideoPlayer({ lessonId, video, initialProgress }: { lessonId: number; video: any; initialProgress: any }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [speed, setSpeed] = useState(1);
  const lastSaved = useRef(0);

  const saveProgress = useMutation({
    mutationFn: (body: { positionSeconds: number; watchedPercent: number }) =>
      apiFetch(`/api/learning/lessons/${lessonId}/video-progress`, { method: "POST", body: JSON.stringify(body) }),
  });

  // Seek to saved position once metadata is ready.
  useEffect(() => {
    const el = ref.current;
    if (!el || !initialProgress?.positionSeconds) return;
    const onMeta = () => {
      if (initialProgress.positionSeconds < (el.duration || Infinity)) {
        el.currentTime = initialProgress.positionSeconds;
      }
    };
    el.addEventListener("loadedmetadata", onMeta);
    return () => el.removeEventListener("loadedmetadata", onMeta);
  }, [initialProgress]);

  const persist = () => {
    const el = ref.current;
    if (!el || !el.duration) return;
    const pct = Math.round((el.currentTime / el.duration) * 100);
    saveProgress.mutate({ positionSeconds: Math.floor(el.currentTime), watchedPercent: pct });
  };

  const onTimeUpdate = () => {
    const el = ref.current;
    if (!el) return;
    if (el.currentTime - lastSaved.current >= 10) {
      lastSaved.current = el.currentTime;
      persist();
    }
  };

  const setRate = (r: number) => {
    setSpeed(r);
    if (ref.current) ref.current.playbackRate = r;
  };

  const isEmbed = video?.provider === "youtube" || video?.provider === "vimeo";
  const embedUrl = (() => {
    if (video?.provider === "youtube") {
      const id = video.url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/)?.[1];
      return id ? `https://www.youtube.com/embed/${id}` : video.url;
    }
    if (video?.provider === "vimeo") {
      const id = video.url.match(/vimeo\.com\/(\d+)/)?.[1];
      return id ? `https://player.vimeo.com/video/${id}` : video.url;
    }
    return video?.url;
  })();

  return (
    <div className="space-y-3">
      <div className="rounded-xl overflow-hidden bg-black aspect-video">
        {isEmbed ? (
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={video.title}
          />
        ) : (
          <video
            ref={ref}
            src={video.url}
            poster={video.thumbnailUrl ?? undefined}
            controls
            className="w-full h-full"
            onTimeUpdate={onTimeUpdate}
            onPause={persist}
            onEnded={() => saveProgress.mutate({ positionSeconds: 0, watchedPercent: 100 })}
          />
        )}
      </div>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="font-semibold text-sm text-foreground">{video.title}</p>
          {video.durationSeconds ? (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Clock className="h-3 w-3" />{fmtTime(video.durationSeconds)}
              {initialProgress?.watchedPercent ? ` · ${initialProgress.watchedPercent}% watched` : ""}
            </p>
          ) : null}
        </div>
        {!isEmbed && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground mr-1">Speed</span>
            {[0.5, 1, 1.25, 1.5, 2].map((r) => (
              <Button
                key={r}
                size="sm"
                variant={speed === r ? "default" : "outline"}
                className="h-7 px-2 text-xs"
                onClick={() => setRate(r)}
              >
                {r}x
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Quiz runner ────────────────────────────────────────────────────────────
function QuizRunner({ lessonId, quiz, latestAttempt }: { lessonId: number; quiz: any; latestAttempt: any }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [answers, setAnswers] = useState<Record<number, number[]>>({});
  const [started, setStarted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (!started || result) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [started, result]);

  const submit = useMutation({
    mutationFn: () =>
      apiFetch<any>(`/api/learning/lessons/${lessonId}/quiz/submit`, {
        method: "POST",
        body: JSON.stringify({ answers, timeSpentSeconds: elapsed }),
      }),
    onSuccess: (data) => {
      setResult(data);
      qc.invalidateQueries({ queryKey: ["lesson", lessonId] });
      qc.invalidateQueries({ queryKey: ["learning/modules"] });
      if (data.passed) {
        toast({ title: `Passed! ${data.percent}%`, description: data.xpAwarded ? `+${data.xpAwarded} XP earned` : "Already completed." });
      } else {
        toast({ title: `Not passed — ${data.percent}%`, description: `Need ${data.passingScore}% to pass. Review and retry.`, variant: "destructive" });
      }
    },
  });

  const toggle = (qId: number, optIdx: number, multi: boolean) => {
    setAnswers((prev) => {
      const cur = prev[qId] ?? [];
      if (multi) {
        return { ...prev, [qId]: cur.includes(optIdx) ? cur.filter((i) => i !== optIdx) : [...cur, optIdx] };
      }
      return { ...prev, [qId]: [optIdx] };
    });
  };

  const reset = () => { setAnswers({}); setResult(null); setElapsed(0); setStarted(true); };

  if (!started && !result) {
    return (
      <div className="rounded-xl border border-border/60 bg-card p-6 text-center">
        <div className="h-12 w-12 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-3">
          <ClipboardList className="h-6 w-6 text-orange-500" />
        </div>
        <h3 className="font-heading font-bold text-lg text-foreground">{quiz.title ?? "Knowledge Check"}</h3>
        {quiz.description && <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">{quiz.description}</p>}
        <div className="flex items-center justify-center gap-5 mt-4 text-sm">
          <span className="flex items-center gap-1.5 text-muted-foreground"><ClipboardList className="h-4 w-4" />{quiz.questionCount} questions</span>
          <span className="flex items-center gap-1.5 text-muted-foreground"><Trophy className="h-4 w-4" />Pass: {quiz.passingScore}%</span>
        </div>
        {latestAttempt && (
          <p className="text-xs text-muted-foreground mt-3">
            Last attempt: {Math.round((latestAttempt.score / latestAttempt.maxScore) * 100)}% · {latestAttempt.passed ? "Passed" : "Not passed"}
          </p>
        )}
        <Button className="mt-5" onClick={() => setStarted(true)}>Start Quiz</Button>
      </div>
    );
  }

  if (result) {
    return (
      <div className="space-y-4">
        <div className={`rounded-xl border p-6 text-center ${result.passed ? "border-green-200 bg-green-50/60" : "border-amber-200 bg-amber-50/60"}`}>
          <div className={`h-14 w-14 rounded-2xl flex items-center justify-center mx-auto mb-3 ${result.passed ? "bg-green-100" : "bg-amber-100"}`}>
            {result.passed ? <Trophy className="h-7 w-7 text-green-600" /> : <AlertCircle className="h-7 w-7 text-amber-600" />}
          </div>
          <p className="text-3xl font-heading font-bold text-foreground">{result.percent}%</p>
          <p className="text-sm text-muted-foreground mt-1">
            {result.score}/{result.maxScore} points · {result.passed ? "Passed" : `Need ${result.passingScore}% to pass`}
          </p>
          {result.xpAwarded > 0 && (
            <Badge className="mt-3 bg-primary/10 text-primary border-primary/20"><Award className="h-3 w-3 mr-1" />+{result.xpAwarded} XP</Badge>
          )}
          <div className="mt-4">
            <Button variant="outline" size="sm" onClick={reset}><RotateCcw className="h-3.5 w-3.5 mr-1.5" />Retake Quiz</Button>
          </div>
        </div>
        <div className="space-y-3">
          {quiz.questions.map((q: any, i: number) => {
            const r = result.results.find((x: any) => x.questionId === q.id);
            return (
              <div key={q.id} className={`rounded-lg border p-4 ${r?.isCorrect ? "border-green-200 bg-green-50/30" : "border-red-200 bg-red-50/30"}`}>
                <div className="flex items-start gap-2">
                  {r?.isCorrect ? <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" /> : <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />}
                  <p className="text-sm font-medium text-foreground">{i + 1}. {q.question}</p>
                </div>
                <div className="mt-2 space-y-1 pl-6">
                  {(q.options as string[]).map((opt, oi) => {
                    const isCorrect = r?.correctAnswers?.includes(oi);
                    const wasChosen = r?.given?.includes(oi);
                    return (
                      <div key={oi} className={`text-xs px-2 py-1 rounded flex items-center gap-2 ${
                        isCorrect ? "bg-green-100 text-green-800" : wasChosen ? "bg-red-100 text-red-700 line-through" : "text-muted-foreground"
                      }`}>
                        {isCorrect && <CheckCircle2 className="h-3 w-3" />}{opt}
                      </div>
                    );
                  })}
                </div>
                {r?.explanation && <p className="text-xs text-muted-foreground mt-2 pl-6 italic">{r.explanation}</p>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const allAnswered = quiz.questions.every((q: any) => (answers[q.id] ?? []).length > 0);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur py-2 z-10">
        <span className="text-xs text-muted-foreground">{Object.keys(answers).length}/{quiz.questions.length} answered</span>
        <Badge variant="outline" className="font-mono"><Clock className="h-3 w-3 mr-1" />{fmtTime(elapsed)}</Badge>
      </div>
      {quiz.questions.map((q: any, i: number) => {
        const multi = q.type === "multi-select";
        return (
          <div key={q.id} className="rounded-lg border border-border/60 bg-card p-4">
            <p className="text-sm font-medium text-foreground mb-1">{i + 1}. {q.question}</p>
            <p className="text-[11px] text-muted-foreground mb-3">{multi ? "Select all that apply" : "Select one"} · {q.points} pts</p>
            <div className="space-y-2">
              {(q.options as string[]).map((opt, oi) => {
                const chosen = (answers[q.id] ?? []).includes(oi);
                return (
                  <button
                    key={oi}
                    onClick={() => toggle(q.id, oi, multi)}
                    className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition-all flex items-center gap-2.5 ${
                      chosen ? "border-primary bg-primary/5 text-foreground" : "border-border/60 hover:border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className={`h-4 w-4 shrink-0 flex items-center justify-center border ${multi ? "rounded" : "rounded-full"} ${chosen ? "bg-primary border-primary" : "border-muted-foreground/40"}`}>
                      {chosen && <CheckCircle2 className="h-3 w-3 text-white" />}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      <Button className="w-full" disabled={!allAnswered || submit.isPending} onClick={() => submit.mutate()}>
        {submit.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Grading...</> : "Submit Quiz"}
      </Button>
    </div>
  );
}

// ── Discussion ──────────────────────────────────────────────────────────────
function Discussion({ lessonId }: { lessonId: number }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const [newPost, setNewPost] = useState("");
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({});
  const isModerator = user?.role === "mentor" || user?.role === "admin";

  const { data, isLoading } = useQuery({
    queryKey: ["discussion", lessonId],
    queryFn: () => apiFetch<{ posts: any[] }>(`/api/learning/lessons/${lessonId}/discussion`),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["discussion", lessonId] });

  const createPost = useMutation({
    mutationFn: () => apiFetch(`/api/learning/lessons/${lessonId}/discussion`, { method: "POST", body: JSON.stringify({ body: newPost }) }),
    onSuccess: () => { setNewPost(""); invalidate(); toast({ title: "Posted to discussion" }); },
  });
  const createComment = useMutation({
    mutationFn: ({ postId, body }: { postId: number; body: string }) =>
      apiFetch(`/api/learning/discussion/${postId}/comments`, { method: "POST", body: JSON.stringify({ body }) }),
    onSuccess: (_d, v) => { setCommentDrafts((p) => ({ ...p, [v.postId]: "" })); invalidate(); },
  });
  const likePost = useMutation({
    mutationFn: (postId: number) => apiFetch(`/api/learning/discussion/${postId}/like`, { method: "POST" }),
    onSuccess: invalidate,
  });
  const likeComment = useMutation({
    mutationFn: (commentId: number) => apiFetch(`/api/learning/discussion/comments/${commentId}/like`, { method: "POST" }),
    onSuccess: invalidate,
  });
  const moderate = useMutation({
    mutationFn: ({ postId, patch }: { postId: number; patch: any }) =>
      apiFetch(`/api/learning/discussion/${postId}/moderate`, { method: "PATCH", body: JSON.stringify(patch) }),
    onSuccess: invalidate,
  });

  if (isLoading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}</div>;
  const posts = data?.posts ?? [];

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <Textarea
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
          placeholder="Ask a question or share an insight about this lesson..."
          className="min-h-[80px] resize-none"
        />
        <div className="flex justify-end mt-2">
          <Button size="sm" disabled={!newPost.trim() || createPost.isPending} onClick={() => createPost.mutate()}>
            {createPost.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}Post
          </Button>
        </div>
      </div>

      {posts.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No discussion yet" description="Be the first to start a conversation about this lesson." />
      ) : (
        posts.map((p) => (
          <div key={p.id} className={`rounded-xl border bg-card p-4 ${p.isPinned ? "border-primary/40 bg-primary/[0.02]" : "border-border/60"}`}>
            <div className="flex items-start gap-3">
              <Avatar className="h-8 w-8"><AvatarFallback className="text-xs bg-primary/10 text-primary">{initials(p.authorName)}</AvatarFallback></Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-foreground">{p.authorName ?? "User"}</span>
                  {p.authorRole && p.authorRole !== "student" && <Badge variant="secondary" className="text-[10px] capitalize">{p.authorRole}</Badge>}
                  {p.isPinned && <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20"><Pin className="h-2.5 w-2.5 mr-0.5" />Pinned</Badge>}
                  {p.isSolved && <Badge className="text-[10px] bg-green-50 text-green-600 border-green-200"><BadgeCheck className="h-2.5 w-2.5 mr-0.5" />Solved</Badge>}
                  <span className="text-[11px] text-muted-foreground">{timeAgo(p.createdAt)}</span>
                </div>
                <p className="text-sm text-foreground mt-1.5 whitespace-pre-wrap">{p.body}</p>
                <div className="flex items-center gap-3 mt-2.5">
                  <button onClick={() => likePost.mutate(p.id)} className={`flex items-center gap-1 text-xs transition-colors ${p.liked ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                    <ThumbsUp className={`h-3.5 w-3.5 ${p.liked ? "fill-current" : ""}`} />{p.likeCount}
                  </button>
                  {isModerator && (
                    <>
                      <button onClick={() => moderate.mutate({ postId: p.id, patch: { isPinned: !p.isPinned } })} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                        <Pin className="h-3.5 w-3.5" />{p.isPinned ? "Unpin" : "Pin"}
                      </button>
                      <button onClick={() => moderate.mutate({ postId: p.id, patch: { isSolved: !p.isSolved } })} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                        <BadgeCheck className="h-3.5 w-3.5" />{p.isSolved ? "Unsolve" : "Mark solved"}
                      </button>
                    </>
                  )}
                </div>

                {/* Comments */}
                {p.comments?.length > 0 && (
                  <div className="mt-3 space-y-2.5 border-l-2 border-border/40 pl-3">
                    {p.comments.map((c: any) => (
                      <div key={c.id} className="flex items-start gap-2">
                        <Avatar className="h-6 w-6"><AvatarFallback className="text-[10px] bg-muted">{initials(c.authorName)}</AvatarFallback></Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-foreground">{c.authorName ?? "User"}</span>
                            {c.authorRole && c.authorRole !== "student" && <Badge variant="secondary" className="text-[9px] capitalize px-1 py-0">{c.authorRole}</Badge>}
                            {c.isAcceptedAnswer && <Badge className="text-[9px] bg-green-50 text-green-600 border-green-200 px-1 py-0">Answer</Badge>}
                            <span className="text-[10px] text-muted-foreground">{timeAgo(c.createdAt)}</span>
                          </div>
                          <p className="text-xs text-foreground mt-0.5 whitespace-pre-wrap">{c.body}</p>
                          <button onClick={() => likeComment.mutate(c.id)} className={`flex items-center gap-1 text-[11px] mt-1 ${c.liked ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                            <ThumbsUp className={`h-3 w-3 ${c.liked ? "fill-current" : ""}`} />{c.likeCount}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add comment */}
                <div className="flex items-center gap-2 mt-3">
                  <input
                    value={commentDrafts[p.id] ?? ""}
                    onChange={(e) => setCommentDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter" && (commentDrafts[p.id] ?? "").trim()) createComment.mutate({ postId: p.id, body: commentDrafts[p.id] }); }}
                    placeholder="Reply..."
                    className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-border/60 bg-background focus:outline-none focus:border-primary"
                  />
                  <Button size="sm" variant="ghost" className="h-7 px-2" disabled={!(commentDrafts[p.id] ?? "").trim()} onClick={() => createComment.mutate({ postId: p.id, body: commentDrafts[p.id] })}>
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ── Notes ────────────────────────────────────────────────────────────────────
function Notes({ lessonId, initial }: { lessonId: number; initial: any }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [content, setContent] = useState(initial?.content ?? "");
  const [dirty, setDirty] = useState(false);

  const save = useMutation({
    mutationFn: () => apiFetch(`/api/learning/lessons/${lessonId}/notes`, { method: "PUT", body: JSON.stringify({ content }) }),
    onSuccess: () => { setDirty(false); qc.invalidateQueries({ queryKey: ["lesson", lessonId] }); toast({ title: "Notes saved" }); },
  });

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-foreground flex items-center gap-2"><StickyNote className="h-4 w-4 text-amber-500" />My Notes</p>
        <Button size="sm" disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Save
        </Button>
      </div>
      <Textarea
        value={content}
        onChange={(e) => { setContent(e.target.value); setDirty(true); }}
        placeholder="Jot down key takeaways, commands, or questions for this lesson..."
        className="min-h-[260px] font-mono text-sm resize-y"
      />
      <p className="text-[11px] text-muted-foreground mt-2">Private to you. Saved across sessions.</p>
    </div>
  );
}

// ── AI Explain ────────────────────────────────────────────────────────────────
function AiExplain({ lessonId, lessonTitle }: { lessonId: number; lessonTitle: string }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");

  const ask = useMutation({
    mutationFn: (q: string) =>
      apiFetch<{ answer: string }>(`/api/learning/lessons/${lessonId}/ai-explain`, { method: "POST", body: JSON.stringify({ question: q }) }),
    onSuccess: (d) => { setAnswer(d.answer); setError(""); },
    onError: (e: any) => setError(e?.message ?? "AI explanation is unavailable right now."),
  });

  const prompts = [
    `Explain "${lessonTitle}" in simple terms`,
    "Give me a real-world example",
    "What are the key takeaways?",
    "How is this tested in interviews?",
  ];

  const run = (q: string) => { setQuestion(q); setAnswer(""); setError(""); ask.mutate(q); };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/[0.04] to-transparent p-4">
        <p className="text-sm font-semibold text-foreground flex items-center gap-2 mb-1"><Sparkles className="h-4 w-4 text-primary" />AI Explain</p>
        <p className="text-xs text-muted-foreground">Ask the AI tutor anything about this lesson. Answers are tailored to "{lessonTitle}".</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {prompts.map((p) => (
          <Button key={p} variant="outline" size="sm" className="text-xs h-7" disabled={ask.isPending} onClick={() => run(p)}>{p}</Button>
        ))}
      </div>

      <div className="flex items-start gap-2">
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Type your own question..."
          className="min-h-[60px] resize-none"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && question.trim()) { e.preventDefault(); run(question); } }}
        />
        <Button disabled={!question.trim() || ask.isPending} onClick={() => run(question)}>
          {ask.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>

      {ask.isPending && (
        <div className="rounded-xl border border-border/60 bg-card p-4 flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />Thinking through "{lessonTitle}"...
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-700 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /><span>{error}</span>
        </div>
      )}
      {answer && !ask.isPending && (
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <div className="prose prose-sm max-w-none prose-headings:font-heading prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-code:text-primary">
            <ReactMarkdown>{answer}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LessonPlayerPage() {
  const [, params] = useRoute("/learning/:moduleId/:lessonId");
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const moduleId = params?.moduleId;
  const lessonId = params ? parseInt(params.lessonId, 10) : NaN;
  const [tab, setTab] = useState("overview");

  const { data, isLoading, error } = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: () => apiFetch<any>(`/api/learning/lessons/${lessonId}`),
    enabled: !isNaN(lessonId),
  });

  const complete = useMutation({
    mutationFn: () => apiFetch(`/api/learning/lessons/${lessonId}/complete`, { method: "POST", body: JSON.stringify({}) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["lesson", lessonId] }); qc.invalidateQueries({ queryKey: ["learning/modules"] }); toast({ title: "Lesson completed! 🎉" }); },
  });
  const bookmark = useMutation({
    mutationFn: () => apiFetch<{ bookmarked: boolean }>(`/api/learning/lessons/${lessonId}/bookmark`, { method: "POST", body: JSON.stringify({}) }),
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["lesson", lessonId] }); toast({ title: d.bookmarked ? "Bookmarked" : "Removed bookmark" }); },
  });

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: data?.lesson?.title, url });
      else { await navigator.clipboard.writeText(url); toast({ title: "Link copied to clipboard" }); }
    } catch { /* user cancelled */ }
  };

  if (isLoading) {
    return (
      <div className="p-5 lg:p-8 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    const is403 = String((error as any)?.message ?? "").toLowerCase().includes("track");
    return (
      <div className="p-6">
        <EmptyState
          icon={is403 ? AlertCircle : BookOpen}
          title={is403 ? "Locked for your track" : "Lesson not found"}
          description={is403 ? "This lesson belongs to a different career track than yours." : "We couldn't load this lesson. It may have been removed."}
          action={<Link href="/learning"><Button>Back to Learning</Button></Link>}
        />
      </div>
    );
  }

  const { lesson, module: mod, video, article, resources, quiz, latestAttempt, userNote, videoProgress, discussionCount, nav } = data;

  const goSibling = (sib: any) => { if (sib) { navigate(`/learning/${moduleId}/${sib.id}`); setTab("overview"); } };

  const TAB_DEFS = [
    { v: "overview", label: "Overview", icon: BookOpen },
    { v: "video", label: "Video", icon: PlayCircle, badge: video ? null : "—" },
    { v: "article", label: "Article", icon: FileText, badge: article ? null : "—" },
    { v: "resources", label: "Resources", icon: LinkIcon, badge: resources?.length || null },
    { v: "quiz", label: "Quiz", icon: ClipboardList, badge: quiz ? null : "—" },
    { v: "discussion", label: "Discussion", icon: MessageSquare, badge: discussionCount || null },
    { v: "notes", label: "Notes", icon: StickyNote },
    { v: "ai", label: "AI Explain", icon: Sparkles },
  ];

  return (
    <div className="p-5 lg:p-8 max-w-5xl mx-auto">
      {/* Breadcrumb + actions */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <Link href={`/learning`}>
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />{mod?.title ?? "Learning"}
          </button>
        </Link>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => bookmark.mutate()}>
                <Bookmark className={`h-4 w-4 ${lesson.bookmarked ? "fill-primary text-primary" : ""}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{lesson.bookmarked ? "Remove bookmark" : "Bookmark"}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={share}><Share2 className="h-4 w-4" /></Button>
            </TooltipTrigger>
            <TooltipContent>Share</TooltipContent>
          </Tooltip>
          <Button size="sm" disabled={lesson.completed || complete.isPending} onClick={() => complete.mutate()} className={lesson.completed ? "bg-green-500 hover:bg-green-500" : ""}>
            {lesson.completed ? <><CheckCircle2 className="h-4 w-4 mr-1.5" />Completed</> : "Mark Complete"}
          </Button>
        </div>
      </div>

      {/* Title */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1.5">
          <Badge variant="secondary" className="capitalize">{lesson.type}</Badge>
          {lesson.durationMinutes ? <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{lesson.durationMinutes} min</span> : null}
          {nav?.total ? <span className="text-xs text-muted-foreground">Lesson {nav.index + 1} of {nav.total}</span> : null}
        </div>
        <h1 className="font-heading text-2xl font-bold text-foreground">{lesson.title}</h1>
        {lesson.description && <p className="text-sm text-muted-foreground mt-1">{lesson.description}</p>}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {TAB_DEFS.map((t) => (
            <TabsTrigger key={t.v} value={t.v} className="data-[state=active]:bg-card gap-1.5 text-xs">
              <t.icon className="h-3.5 w-3.5" />{t.label}
              {t.badge && <span className="text-[10px] text-muted-foreground">{t.badge}</span>}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-5">
          <TabsContent value="overview">
            <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4">
              <div>
                <h3 className="font-heading font-bold text-foreground mb-2">About this lesson</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{lesson.description || mod?.description || "Work through the content tabs to complete this lesson."}</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Video", on: !!video, icon: PlayCircle },
                  { label: "Article", on: !!article, icon: FileText },
                  { label: "Resources", on: resources?.length > 0, icon: LinkIcon, count: resources?.length },
                  { label: "Quiz", on: !!quiz, icon: ClipboardList },
                ].map((x) => (
                  <button key={x.label} onClick={() => setTab(x.label.toLowerCase())} disabled={!x.on}
                    className={`rounded-lg border p-3 text-left transition-all ${x.on ? "border-border/60 bg-card hover:border-primary hover:shadow-sm" : "border-dashed border-border/40 opacity-50 cursor-not-allowed"}`}>
                    <x.icon className={`h-4 w-4 mb-1.5 ${x.on ? "text-primary" : "text-muted-foreground"}`} />
                    <p className="text-xs font-medium text-foreground">{x.label}{x.count ? ` (${x.count})` : ""}</p>
                    <p className="text-[10px] text-muted-foreground">{x.on ? "Available" : "Not included"}</p>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3 pt-2 border-t border-border/40">
                {mod?.xpReward ? <Badge className="bg-primary/10 text-primary border-primary/20"><Award className="h-3 w-3 mr-1" />{mod.xpReward} XP on completion</Badge> : null}
                {lesson.isFree && <Badge className="bg-green-50 text-green-600 border-green-200">Free preview</Badge>}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="video">
            {video ? <VideoPlayer lessonId={lessonId} video={video} initialProgress={videoProgress} />
              : <EmptyState icon={PlayCircle} title="No video for this lesson" description="This lesson uses other content formats. Check the Article or Resources tabs." />}
          </TabsContent>

          <TabsContent value="article">
            {article?.content ? (
              <div className="rounded-xl border border-border/60 bg-card p-6">
                <div className="prose prose-sm max-w-none prose-headings:font-heading prose-headings:text-foreground prose-p:text-foreground/90 prose-li:text-foreground/90 prose-strong:text-foreground prose-code:text-primary prose-code:bg-primary/5 prose-code:px-1 prose-code:rounded prose-a:text-primary">
                  <ReactMarkdown>{article.content}</ReactMarkdown>
                </div>
              </div>
            ) : <EmptyState icon={FileText} title="No article for this lesson" description="This lesson uses other content formats." />}
          </TabsContent>

          <TabsContent value="resources">
            {resources?.length > 0 ? (
              <div className="space-y-2">
                {resources.map((r: any) => {
                  const Icon = RESOURCE_ICONS[r.type] ?? LinkIcon;
                  return (
                    <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-card hover:border-primary hover:shadow-sm transition-all group">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Icon className="h-4 w-4 text-primary" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{r.title}</p>
                        {r.description && <p className="text-xs text-muted-foreground truncate">{r.description}</p>}
                      </div>
                      <Badge variant="secondary" className="text-[10px] capitalize">{r.type}</Badge>
                      <ExternalLink className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                    </a>
                  );
                })}
              </div>
            ) : <EmptyState icon={LinkIcon} title="No resources" description="No downloadable resources or links for this lesson yet." />}
          </TabsContent>

          <TabsContent value="quiz">
            {quiz ? <QuizRunner lessonId={lessonId} quiz={quiz} latestAttempt={latestAttempt} />
              : <EmptyState icon={ClipboardList} title="No quiz for this lesson" description="This lesson doesn't include a knowledge check." />}
          </TabsContent>

          <TabsContent value="discussion"><Discussion lessonId={lessonId} /></TabsContent>
          <TabsContent value="notes"><Notes lessonId={lessonId} initial={userNote} /></TabsContent>
          <TabsContent value="ai"><AiExplain lessonId={lessonId} lessonTitle={lesson.title} /></TabsContent>
        </div>
      </Tabs>

      {/* Prev / Next */}
      <div className="flex items-center justify-between mt-8 pt-5 border-t border-border/40 gap-3">
        <Button variant="outline" disabled={!nav?.prev} onClick={() => goSibling(nav?.prev)} className="gap-1.5">
          <ChevronLeft className="h-4 w-4" />{nav?.prev ? <span className="max-w-[160px] truncate">{nav.prev.title}</span> : "Previous"}
        </Button>
        <Button disabled={!nav?.next} onClick={() => goSibling(nav?.next)} className="gap-1.5">
          {nav?.next ? <span className="max-w-[160px] truncate">{nav.next.title}</span> : "Next"}<ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
