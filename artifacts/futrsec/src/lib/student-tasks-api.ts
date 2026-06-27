import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export type StudentTaskType =
  | "assessment"
  | "resource"
  | "assignment"
  | "declaration";

export interface StudentTaskAssessment {
  id: number;
  title: string;
  passingScore: number;
  isActive: boolean;
  attemptsUsed: number;
  attemptsRemaining: number | null;
}

export interface StudentTask {
  assignmentId: number;
  taskId: number;
  type: StudentTaskType;
  title: string;
  description: string | null;
  contentUrl: string | null;
  careerTrack: string;
  refId: number | null;
  points: number | null;
  maxAttempts: number | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  completedAt: string | null;
  submissionText: string | null;
  fileUrl: string | null;
  fileName: string | null;
  submittedAt: string | null;
  reviewStatus: "pending" | "approved" | "rejected" | "changes_requested" | null;
  reviewNotes: string | null;
  score: number | null;
  reviewedAt: string | null;
  acknowledged: boolean;
  signatureName: string | null;
  signedAt: string | null;
  assessment: StudentTaskAssessment | null;
}

export const studentTaskKeys = {
  tasks: ["student", "tasks"] as const,
  assessment: (id: number) => ["student", "assessment", id] as const,
  attempts: (id: number) => ["student", "assessment", id, "attempts"] as const,
};

export function useStudentTasks() {
  return useQuery({
    queryKey: studentTaskKeys.tasks,
    queryFn: () => apiFetch<{ tasks: StudentTask[] }>("/api/student/tasks"),
  });
}

export function useCompleteResourceTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: number) =>
      apiFetch(`/api/student/tasks/${assignmentId}/complete`, {
        method: "POST",
      }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: studentTaskKeys.tasks }),
  });
}

export function useSubmitAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      assignmentId,
      submissionText,
      fileId,
    }: {
      assignmentId: number;
      submissionText?: string;
      fileId?: number;
    }) =>
      apiFetch(`/api/student/tasks/${assignmentId}/submit`, {
        method: "POST",
        body: JSON.stringify({ submissionText, fileId }),
      }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: studentTaskKeys.tasks }),
  });
}

export function useAcknowledgeDeclaration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      assignmentId,
      signatureName,
    }: {
      assignmentId: number;
      signatureName: string;
    }) =>
      apiFetch(`/api/student/tasks/${assignmentId}/acknowledge`, {
        method: "POST",
        body: JSON.stringify({ signatureName, acknowledged: true }),
      }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: studentTaskKeys.tasks }),
  });
}

// ─── Generic assessment taking ────────────────────────────────────────────────
export interface TakeAssessmentOption {
  id: number;
  text: string;
}
export interface TakeAssessmentQuestion {
  id: number;
  text: string;
  type: string;
  options: TakeAssessmentOption[];
}
export interface TakeAssessment {
  id: number;
  title: string;
  type: string;
  totalQuestions: number;
  durationMinutes: number;
  passingScore: number;
  questions: TakeAssessmentQuestion[];
}
export interface AssessmentSubmitResult {
  attemptId: number;
  score: number;
  totalMarks: number;
  percentage: number;
  passed: boolean;
  feedback: string;
  attemptsUsed: number;
  maxAttempts: number | null;
}
export interface AssessmentAttempt {
  id: number;
  status: string;
  startedAt: string;
  submittedAt: string | null;
  score: number | null;
  totalMarks: number | null;
  percentage: number | null;
  passed: boolean | null;
}
export interface AssessmentStartResult {
  attemptId: number;
  securityEnabled: boolean;
  maxWarnings: number;
  warningCount: number;
  durationMinutes: number;
  startedAt: string;
  deadlineAt: string;
}
export interface AssessmentWarnResult {
  warningCount: number;
  maxWarnings: number;
  locked: boolean;
}

export function useAssessment(id: number | null) {
  return useQuery({
    queryKey: id ? studentTaskKeys.assessment(id) : ["student", "assessment", "none"],
    queryFn: () => apiFetch<TakeAssessment>(`/api/assessments/${id}`),
    enabled: id != null,
  });
}

export function useAssessmentAttempts(id: number | null) {
  return useQuery({
    queryKey: id ? studentTaskKeys.attempts(id) : ["student", "attempts", "none"],
    queryFn: () =>
      apiFetch<{ attempts: AssessmentAttempt[] }>(
        `/api/assessments/${id}/attempts`
      ),
    enabled: id != null,
  });
}

export function useStartAssessment() {
  return useMutation({
    mutationFn: ({
      assessmentId,
      taskId,
    }: {
      assessmentId: number;
      taskId?: number;
    }) =>
      apiFetch<AssessmentStartResult>(`/api/assessments/${assessmentId}/start`, {
        method: "POST",
        body: JSON.stringify({ taskId }),
      }),
  });
}

export function useWarnAssessment() {
  return useMutation({
    mutationFn: ({
      assessmentId,
      attemptId,
      reason,
      answers,
    }: {
      assessmentId: number;
      attemptId: number;
      reason?: string;
      answers?: { questionId: number; selectedOptionIds: number[] }[];
    }) =>
      apiFetch<AssessmentWarnResult>(
        `/api/assessments/${assessmentId}/attempts/${attemptId}/warn`,
        {
          method: "POST",
          body: JSON.stringify({ reason, answers }),
        }
      ),
  });
}

export function useSubmitAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      assessmentId,
      answers,
      taskId,
      attemptId,
    }: {
      assessmentId: number;
      answers: { questionId: number; selectedOptionIds: number[] }[];
      taskId?: number;
      attemptId?: number;
    }) =>
      apiFetch<AssessmentSubmitResult>(`/api/assessments/${assessmentId}/submit`, {
        method: "POST",
        body: JSON.stringify({ answers, taskId, attemptId }),
      }),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: studentTaskKeys.tasks });
      qc.invalidateQueries({
        queryKey: studentTaskKeys.attempts(vars.assessmentId),
      });
    },
  });
}
