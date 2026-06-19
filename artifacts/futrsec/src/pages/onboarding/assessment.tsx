import { useState } from "react";
import { useGetPreAssessment, useSubmitPreAssessment } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, Clock, Target } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Assessment() {
  const [_, setLocation] = useLocation();
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number[]>>({});
  const [started, setStarted] = useState(false);

  const { data: assessment, isLoading } = useGetPreAssessment();
  const submitAssessment = useSubmitPreAssessment();

  const questions = assessment?.questions ?? [];
  const total = questions.length;
  const progress = total > 0 ? ((currentQ + 1) / total) * 100 : 0;
  const currentQuestion = questions[currentQ];

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
    if (currentQ < total - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const formattedAnswers = Object.entries(answers).map(([questionId, optionIds]) => ({
      questionId: parseInt(questionId),
      selectedOptionIds: optionIds,
    }));

    submitAssessment.mutate(
      { data: { assessmentId: assessment!.id, answers: formattedAnswers } },
      {
        onSuccess: () => {
          setLocation("/onboarding/complete");
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!started) {
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
            Pre-Assessment
          </h1>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            This quick {total}-question assessment helps us tailor your learning path. 
            There's no pressure — we just want to know where you're starting from.
          </p>
          <div className="flex items-center justify-center gap-6 mb-8 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              {total} Questions
            </span>
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              ~{assessment?.durationMinutes ?? 10} min
            </span>
          </div>
          <Button size="lg" className="w-full h-12 text-base" onClick={() => setStarted(true)}>
            Start Assessment
          </Button>
          <button
            className="mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setLocation("/onboarding/complete")}
          >
            Skip for now
          </button>
        </motion.div>
      </div>
    );
  }

  const selected = answers[currentQuestion?.id] ?? [];
  const hasAnswer = selected.length > 0;

  return (
    <div className="min-h-screen bg-background p-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2 text-sm text-muted-foreground">
            <span>Question {currentQ + 1} of {total}</span>
            <Badge variant="outline">{currentQuestion?.type === "multi_select" ? "Select all that apply" : "Single choice"}</Badge>
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
          <Button
            onClick={handleNext}
            disabled={!hasAnswer || submitAssessment.isPending}
          >
            {submitAssessment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {currentQ === total - 1 ? "Submit" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
}
