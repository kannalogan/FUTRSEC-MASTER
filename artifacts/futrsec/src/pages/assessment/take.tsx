import { useState, useEffect, useRef, useCallback } from "react";
import { useRoute, useLocation, useSearch } from "wouter";
import {
  useAssessment,
  useStartAssessment,
  useWarnAssessment,
  useSubmitAssessment,
  useAssessmentAttempts,
  type AssessmentSubmitResult,
} from "@/lib/student-tasks-api";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Target,
  ArrowLeft,
  ShieldAlert,
  Lock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function formatClock(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function AssessmentTake() {
  const [, params] = useRoute("/assessment/:id");
  const [, setLocation] = useLocation();
  const search = useSearch();
  const taskId = (() => {
    const v = new URLSearchParams(search).get("taskId");
    return v ? Number(v) : undefined;
  })();
  const assessmentId = params?.id ? Number(params.id) : null;

  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number[]>>({});
  const [started, setStarted] = useState(false);
  const [result, setResult] = useState<AssessmentSubmitResult | null>(null);

  // ── Security / proctoring state ──
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [securityEnabled, setSecurityEnabled] = useState(false);
  const [maxWarnings, setMaxWarnings] = useState(3);
  const [warningCount, setWarningCount] = useState(0);
  const [warningFlash, setWarningFlash] = useState<string | null>(null);
  const [lockedOut, setLockedOut] = useState(false);
  const [deadlineAt, setDeadlineAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const { data: assessment, isLoading, error } = useAssessment(assessmentId);
  const { data: attemptsData } = useAssessmentAttempts(assessmentId);
  const startMutation = useStartAssessment();
  const warn = useWarnAssessment();
  const submit = useSubmitAssessment();

  const questions = assessment?.questions ?? [];
  const total = questions.length;
  const progress = total > 0 ? ((currentQ + 1) / total) * 100 : 0;
  const currentQuestion = questions[currentQ];

  // Refs so event listeners always read live values without re-subscribing.
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const finishedRef = useRef(false);
  const lastWarnAtRef = useRef(0);

  const formatAnswers = useCallback(
    () =>
      Object.entries(answersRef.current).map(([questionId, optionIds]) => ({
        questionId: parseInt(questionId),
        selectedOptionIds: optionIds,
      })),
    []
  );

  const doSubmit = useCallback(
    (reason?: "time_expired") => {
      if (!assessment || finishedRef.current || attemptId == null) return;
      finishedRef.current = true;
      submit.mutate(
        {
          assessmentId: assessment.id,
          answers: formatAnswers(),
          taskId,
          attemptId,
        },
        {
          onSuccess: (res) => setResult(res),
          onError: () => {
            // Allow retry if the submit failed (e.g. transient network error).
            if (reason !== "time_expired") finishedRef.current = false;
          },
        }
      );
    },
    [assessment, attemptId, formatAnswers, submit, taskId]
  );

  // Record a security violation. Debounced so blur + visibilitychange firing
  // together for one tab-switch only counts once.
  const recordViolation = useCallback(
    (reason: string) => {
      if (
        !securityEnabled ||
        attemptId == null ||
        assessmentId == null ||
        finishedRef.current ||
        lockedOut
      ) {
        return;
      }
      const ts = Date.now();
      if (ts - lastWarnAtRef.current < 1200) return;
      lastWarnAtRef.current = ts;
      warn.mutate(
        { assessmentId, attemptId, reason, answers: formatAnswers() },
        {
          onSuccess: (res) => {
            setWarningCount(res.warningCount);
            if (res.locked) {
              finishedRef.current = true;
              setLockedOut(true);
            } else {
              setWarningFlash(
                `Warning ${res.warningCount} of ${res.maxWarnings}: leaving the test is not allowed.`
              );
            }
          },
        }
      );
    },
    [securityEnabled, attemptId, assessmentId, lockedOut, warn, formatAnswers]
  );

  // ── Start the attempt when the user begins ──
  const handleStart = () => {
    if (!assessmentId) return;
    startMutation.mutate(
      { assessmentId, taskId },
      {
        onSuccess: (res) => {
          setAttemptId(res.attemptId);
          setSecurityEnabled(res.securityEnabled);
          setMaxWarnings(res.maxWarnings);
          setWarningCount(res.warningCount);
          setDeadlineAt(new Date(res.deadlineAt).getTime());
          setStarted(true);
        },
      }
    );
  };

  // ── Tab-switch / focus-loss detection ──
  useEffect(() => {
    if (!started || !securityEnabled || lockedOut || result) return;
    const onVisibility = () => {
      if (document.hidden) recordViolation("tab_hidden");
    };
    const onBlur = () => recordViolation("window_blur");
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
    };
  }, [started, securityEnabled, lockedOut, result, recordViolation]);

  // ── Countdown timer + auto-submit on expiry ──
  useEffect(() => {
    if (!started || deadlineAt == null || result || lockedOut) return;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      if (t >= deadlineAt && !finishedRef.current) {
        doSubmit("time_expired");
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [started, deadlineAt, result, lockedOut, doSubmit]);

  // ── Auto-dismiss the warning flash ──
  useEffect(() => {
    if (!warningFlash) return;
    const t = setTimeout(() => setWarningFlash(null), 4000);
    return () => clearTimeout(t);
  }, [warningFlash]);

  const handleAnswer = (optionId: number) => {
    if (!currentQuestion) return;
    const isMulti = currentQuestion.type === "multi_select";
    const prev = answers[currentQuestion.id] ?? [];
    if (isMulti) {
      const newSel = prev.includes(optionId)
        ? prev.filter((id) => id !== optionId)
        : [...prev, optionId];
      setAnswers({ ...answers, [currentQuestion.id]: newSel });
    } else {
      setAnswers({ ...answers, [currentQuestion.id]: [optionId] });
    }
  };

  const handleNext = () => {
    if (currentQ < total - 1) setCurrentQ(currentQ + 1);
    else doSubmit();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !assessment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-heading font-bold mb-2">
            Assessment unavailable
          </h1>
          <p className="text-muted-foreground mb-6">
            {error instanceof Error
              ? error.message
              : "This assessment could not be loaded."}
          </p>
          <Button variant="outline" onClick={() => setLocation("/tasks")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Tasks
          </Button>
        </div>
      </div>
    );
  }

  // ── Locked-out screen ──
  if (lockedOut && !result) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full"
        >
          <Card className="bg-card border-destructive/40">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 bg-destructive/10">
                <Lock className="w-8 h-8 text-destructive" />
              </div>
              <h1 className="text-2xl font-heading font-bold mb-2">
                Assessment locked
              </h1>
              <p className="text-sm text-muted-foreground mb-6">
                Your attempt was ended automatically after {maxWarnings}{" "}
                security warnings. It has been submitted and graded based on the
                answers recorded so far.
              </p>
              <Button className="w-full" onClick={() => setLocation("/tasks")}>
                Back to Tasks
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // ── Result screen ──
  if (result) {
    const terminated = lockedOut;
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full"
        >
          <Card className="bg-card border-border/60">
            <CardContent className="p-8 text-center">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 ${
                  result.passed ? "bg-success/10" : "bg-destructive/10"
                }`}
              >
                {result.passed ? (
                  <CheckCircle2 className="w-8 h-8 text-success" />
                ) : (
                  <XCircle className="w-8 h-8 text-destructive" />
                )}
              </div>
              <h1 className="text-2xl font-heading font-bold mb-1">
                {result.passed ? "Passed" : "Not passed"}
              </h1>
              {terminated && (
                <p className="text-xs text-destructive mb-2">
                  This attempt was ended automatically for security reasons.
                </p>
              )}
              <p className="text-4xl font-heading font-bold text-primary my-4">
                {result.percentage.toFixed(0)}%
              </p>
              <p className="text-sm text-muted-foreground mb-2">
                Score: {result.score} / {result.totalMarks}
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                {result.feedback}
              </p>
              {result.maxAttempts != null && (
                <Badge variant="outline" className="mb-6">
                  Attempts used {result.attemptsUsed} / {result.maxAttempts}
                </Badge>
              )}
              <Button className="w-full" onClick={() => setLocation("/tasks")}>
                Back to Tasks
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // ── Intro screen ──
  if (!started) {
    const attempts = attemptsData?.attempts ?? [];
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Target className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-heading font-bold tracking-tight mb-3">
            {assessment.title}
          </h1>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            Answer all {total} questions. You need {assessment.passingScore}% to
            pass.
          </p>
          <div className="flex items-center justify-center gap-6 mb-8 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              {total} Questions
            </span>
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              {assessment.durationMinutes} min
            </span>
          </div>
          {attempts.length > 0 && (
            <div className="mb-6 text-left space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Previous attempts
              </p>
              {attempts.slice(0, 5).map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between text-sm bg-muted/50 rounded-lg px-3 py-2"
                >
                  <span className="text-muted-foreground">
                    {a.submittedAt
                      ? new Date(a.submittedAt).toLocaleDateString()
                      : "In progress"}
                  </span>
                  {a.percentage != null && (
                    <Badge
                      variant="outline"
                      className={
                        a.passed ? "text-success" : "text-muted-foreground"
                      }
                    >
                      {a.percentage.toFixed(0)}%
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
          {startMutation.isError && (
            <p className="text-sm text-destructive mb-4">
              {startMutation.error instanceof Error
                ? startMutation.error.message
                : "Could not start the assessment."}
            </p>
          )}
          <Button
            size="lg"
            className="w-full h-12 text-base"
            onClick={handleStart}
            disabled={startMutation.isPending}
          >
            {startMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Start Assessment
          </Button>
          <button
            className="mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setLocation("/tasks")}
          >
            Cancel
          </button>
        </motion.div>
      </div>
    );
  }

  const selected = currentQuestion ? (answers[currentQuestion.id] ?? []) : [];
  const hasAnswer = selected.length > 0;
  const timeLeft = deadlineAt != null ? deadlineAt - now : null;
  const lowTime = timeLeft != null && timeLeft <= 60_000;

  return (
    <div
      className={`min-h-screen bg-background p-4 py-8 ${
        securityEnabled ? "select-none" : ""
      }`}
      onCopy={securityEnabled ? (e) => e.preventDefault() : undefined}
      onCut={securityEnabled ? (e) => e.preventDefault() : undefined}
      onPaste={securityEnabled ? (e) => e.preventDefault() : undefined}
      onContextMenu={securityEnabled ? (e) => e.preventDefault() : undefined}
    >
      {/* Warning flash banner */}
      <AnimatePresence>
        {warningFlash && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-lg bg-destructive px-4 py-2.5 text-sm font-medium text-destructive-foreground shadow-lg"
          >
            <ShieldAlert className="h-4 w-4 shrink-0" />
            {warningFlash}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2 text-sm text-muted-foreground">
            <span>
              Question {currentQ + 1} of {total}
            </span>
            <div className="flex items-center gap-3">
              {securityEnabled && (
                <span className="flex items-center gap-1.5 text-xs">
                  <ShieldAlert
                    className={`h-3.5 w-3.5 ${
                      warningCount > 0 ? "text-destructive" : "text-primary"
                    }`}
                  />
                  Warnings {warningCount}/{maxWarnings}
                </span>
              )}
              {timeLeft != null && (
                <span
                  className={`flex items-center gap-1.5 font-medium tabular-nums ${
                    lowTime ? "text-destructive" : ""
                  }`}
                >
                  <Clock className="h-3.5 w-3.5" />
                  {formatClock(timeLeft)}
                </span>
              )}
              <Badge variant="outline">
                {currentQuestion?.type === "multi_select"
                  ? "Select all that apply"
                  : "Single choice"}
              </Badge>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentQ}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <h2 className="text-xl font-heading font-bold mb-6 leading-tight">
              {currentQuestion?.text}
            </h2>
            <div className="space-y-3">
              {currentQuestion?.options?.map((option) => {
                const isSelected = selected.includes(option.id);
                return (
                  <button
                    key={option.id}
                    onClick={() => handleAnswer(option.id)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border hover:border-muted-foreground/50 bg-card"
                    }`}
                  >
                    <span className="font-medium">{option.text}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 flex justify-between">
          <Button
            variant="ghost"
            onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
            disabled={currentQ === 0}
          >
            Back
          </Button>
          <Button onClick={handleNext} disabled={!hasAnswer || submit.isPending}>
            {submit.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {currentQ === total - 1 ? "Submit" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
}
