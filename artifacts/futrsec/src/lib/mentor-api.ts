import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export const TRACK_LABELS: Record<string, string> = {
  soc: "SOC Analyst",
  vapt: "VAPT Professional",
  grc: "GRC Specialist",
};
export const TRACK_COLORS: Record<string, string> = {
  soc: "#2563EB",
  vapt: "#F97316",
  grc: "#10B981",
};
export const TRACKS = ["soc", "vapt", "grc"] as const;

// ─── Types ──────────────────────────────────────────────────────────────────
export interface MentorOverview {
  totalStudents: number;
  trialStudents: number;
  totalBatches: number;
  activeBatches: number;
  atRiskStudents: number;
  avgFts: number;
  draftTasks: number;
  publishedTasks: number;
  scheduledTasks: number;
}

export interface MentorStudent {
  id: number;
  email: string | null;
  fullName: string | null;
  careerTrack: string | null;
  isActive: boolean;
  isTrial: boolean;
  batchId: number | null;
  assignedAt: string;
  learningHours: number;
  lessonsCompleted: number;
  ftsTotal: number;
  avgModuleProgress: number;
  lastActivityAt: string | null;
  riskLevel: "low" | "medium" | "high";
  riskScore: number;
}

export interface MentorBatch {
  id: number;
  name: string;
  code: string | null;
  careerTrack: string;
  status: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  studentCount: number;
}

export interface MentorAnalytics {
  cohortSize: number;
  learningHours: number;
  avgLearningHours: number;
  lessonsCompleted: number;
  avgCompletion: number;
  avgFts: number;
  ftsDistribution: { low: number; mid: number; high: number };
  labPoints: number;
  labsCompleted: number;
  assessmentsTaken: number;
  assessmentPassRate: number;
  assignmentsSubmitted: number;
  activeStudentsLast14: number;
  activityHeatmap: { date: string; count: number }[];
}

export interface AtRiskStudent {
  studentId: number;
  fullName: string | null;
  email: string | null;
  careerTrack: string | null;
  riskScore: number;
  riskLevel: "low" | "medium" | "high";
  signals: string[];
  recommendations: string[];
  ftsTotal: number;
  lessonsLast14: number;
  missedTasks: number;
  lastActivityAt: string | null;
}

export interface MentorBroadcast {
  id: number;
  title: string;
  content: string;
  targetTrackIds: number[];
  status: string;
  publishedAt: string | null;
  createdAt: string;
}

export type MentorTaskType =
  | "assessment"
  | "resource"
  | "assignment"
  | "declaration";
export type MentorTaskAudience =
  | "all_students"
  | "trial_students"
  | "all_batches"
  | "specific_batches"
  | "future_batches";

export interface MentorTask {
  id: number;
  type: MentorTaskType;
  title: string;
  description: string | null;
  contentUrl: string | null;
  refId: number | null;
  maxAttempts: number | null;
  points: number | null;
  careerTrack: string;
  status: string;
  audience: MentorTaskAudience;
  startDate: string | null;
  endDate: string | null;
  scheduledAt: string | null;
  publishedAt: string | null;
  assignedCount: number;
  createdAt: string;
}

export interface MentorAssessmentOption {
  id: number;
  title: string;
  type: string;
  totalQuestions: number;
  passingScore: number;
  durationMinutes: number;
}

export interface TaskSubmission {
  assignmentId: number;
  studentId: number;
  studentName: string | null;
  studentEmail: string | null;
  status: string;
  submissionText: string | null;
  fileUrl: string | null;
  fileName: string | null;
  submittedAt: string | null;
  reviewStatus: "pending" | "approved" | "rejected" | "changes_requested" | null;
  reviewNotes: string | null;
  score: number | null;
  reviewedAt: string | null;
}

export interface MentorAuditLog {
  id: number;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface MentorReportRow {
  studentId: number;
  fullName: string | null;
  email: string | null;
  careerTrack: string | null;
  learningHours: number;
  lessonsCompleted: number;
  avgModuleProgress: number;
  ftsTotal: number;
  labsCompleted: number;
  assessmentsTaken: number;
  assessmentsPassed: number;
  assignmentsSubmitted: number;
  missedTasks: number;
  riskLevel: string;
  riskScore: number;
}

export interface MentorSettings {
  email: string | null;
  fullName: string | null;
  phone: string | null;
  careerTrack: string | null;
  specialization: string | null;
  company: string | null;
  designation: string | null;
  linkedinUrl: string | null;
  calendlyUrl: string | null;
  bio: string | null;
  isAvailable: boolean;
}

// ─── Queries ────────────────────────────────────────────────────────────────
export const mentorKeys = {
  overview: ["mentor", "overview"] as const,
  students: ["mentor", "students"] as const,
  batches: ["mentor", "batches"] as const,
  analytics: ["mentor", "analytics"] as const,
  atRisk: ["mentor", "at-risk"] as const,
  broadcasts: ["mentor", "broadcasts"] as const,
  tasks: ["mentor", "tasks"] as const,
  auditLogs: ["mentor", "audit-logs"] as const,
  reports: ["mentor", "reports"] as const,
  settings: ["mentor", "settings"] as const,
};

export function useMentorOverview() {
  return useQuery({
    queryKey: mentorKeys.overview,
    queryFn: () => apiFetch<MentorOverview>("/api/mentor/overview"),
  });
}
export function useMentorStudents() {
  return useQuery({
    queryKey: mentorKeys.students,
    queryFn: () =>
      apiFetch<{ students: MentorStudent[] }>("/api/mentor/students"),
  });
}
export function useMentorBatches() {
  return useQuery({
    queryKey: mentorKeys.batches,
    queryFn: () => apiFetch<{ batches: MentorBatch[] }>("/api/mentor/batches"),
  });
}
export function useMentorAnalytics() {
  return useQuery({
    queryKey: mentorKeys.analytics,
    queryFn: () => apiFetch<MentorAnalytics>("/api/mentor/analytics"),
  });
}
export function useMentorAtRisk() {
  return useQuery({
    queryKey: mentorKeys.atRisk,
    queryFn: () =>
      apiFetch<{ students: AtRiskStudent[] }>("/api/mentor/at-risk"),
  });
}
export function useMentorBroadcasts() {
  return useQuery({
    queryKey: mentorKeys.broadcasts,
    queryFn: () =>
      apiFetch<{ broadcasts: MentorBroadcast[] }>("/api/mentor/broadcasts"),
  });
}
export function useMentorTasks() {
  return useQuery({
    queryKey: mentorKeys.tasks,
    queryFn: () => apiFetch<{ tasks: MentorTask[] }>("/api/mentor/tasks"),
  });
}
export function useMentorAuditLogs() {
  return useQuery({
    queryKey: mentorKeys.auditLogs,
    queryFn: () =>
      apiFetch<{ logs: MentorAuditLog[] }>("/api/mentor/audit-logs"),
  });
}
export function useMentorReports() {
  return useQuery({
    queryKey: mentorKeys.reports,
    queryFn: () =>
      apiFetch<{ generatedAt: string; rows: MentorReportRow[] }>(
        "/api/mentor/reports"
      ),
  });
}
export function useMentorSettings() {
  return useQuery({
    queryKey: mentorKeys.settings,
    queryFn: () =>
      apiFetch<{ profile: MentorSettings }>("/api/mentor/settings"),
  });
}

// ─── Mutations ──────────────────────────────────────────────────────────────
export function useCreateBroadcast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      title: string;
      content: string;
      publish?: boolean;
    }) =>
      apiFetch("/api/mentor/broadcasts", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mentorKeys.broadcasts });
      qc.invalidateQueries({ queryKey: mentorKeys.auditLogs });
    },
  });
}
export function useUpdateBroadcast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiFetch(`/api/mentor/broadcasts/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mentorKeys.broadcasts });
      qc.invalidateQueries({ queryKey: mentorKeys.auditLogs });
    },
  });
}

export interface CreateTaskBody {
  type: MentorTaskType;
  title: string;
  description?: string;
  contentUrl?: string;
  refId?: number;
  maxAttempts?: number;
  points?: number;
  careerTrack: string;
  audience: MentorTaskAudience;
  batchIds?: number[];
  startDate?: string;
  endDate?: string;
  scheduledAt?: string;
  action: "draft" | "publish" | "schedule";
}

export function useMentorAssessments() {
  return useQuery({
    queryKey: ["mentor", "assessments"] as const,
    queryFn: () =>
      apiFetch<{ assessments: MentorAssessmentOption[] }>(
        "/api/mentor/assessments"
      ),
  });
}

export function useTaskSubmissions(taskId: number | null) {
  return useQuery({
    queryKey: ["mentor", "task-submissions", taskId] as const,
    queryFn: () =>
      apiFetch<{
        task: { id: number; title: string; points: number | null };
        submissions: TaskSubmission[];
      }>(`/api/mentor/tasks/${taskId}/submissions`),
    enabled: taskId != null,
  });
}

export function useReviewSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      assignmentId,
      reviewStatus,
      reviewNotes,
      score,
    }: {
      assignmentId: number;
      reviewStatus: "approved" | "rejected" | "changes_requested";
      reviewNotes?: string;
      score?: number;
    }) =>
      apiFetch(`/api/mentor/task-submissions/${assignmentId}/review`, {
        method: "POST",
        body: JSON.stringify({ reviewStatus, reviewNotes, score }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mentor", "task-submissions"] });
      qc.invalidateQueries({ queryKey: mentorKeys.auditLogs });
    },
  });
}

export function fetchSubmissionFileUrl(assignmentId: number) {
  return apiFetch<{ url: string; fileName: string; expiresAt: string }>(
    `/api/mentor/task-submissions/${assignmentId}/file-url`
  );
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTaskBody) =>
      apiFetch("/api/mentor/tasks", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mentorKeys.tasks });
      qc.invalidateQueries({ queryKey: mentorKeys.overview });
      qc.invalidateQueries({ queryKey: mentorKeys.auditLogs });
    },
  });
}
export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      action,
      scheduledAt,
    }: {
      id: number;
      action: "draft" | "publish" | "schedule" | "archive";
      scheduledAt?: string;
    }) =>
      apiFetch(`/api/mentor/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action, scheduledAt }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mentorKeys.tasks });
      qc.invalidateQueries({ queryKey: mentorKeys.overview });
      qc.invalidateQueries({ queryKey: mentorKeys.auditLogs });
    },
  });
}
export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/mentor/tasks/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mentorKeys.tasks });
      qc.invalidateQueries({ queryKey: mentorKeys.overview });
      qc.invalidateQueries({ queryKey: mentorKeys.auditLogs });
    },
  });
}
export function useUpdateMentorSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<MentorSettings>) =>
      apiFetch("/api/mentor/settings", {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mentorKeys.settings });
      qc.invalidateQueries({ queryKey: mentorKeys.auditLogs });
    },
  });
}
