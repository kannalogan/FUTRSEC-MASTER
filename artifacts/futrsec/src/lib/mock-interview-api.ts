import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

// ─── Constants ──────────────────────────────────────────────────────────────
export const MI_TRACK_LABELS: Record<string, string> = {
  soc: "SOC Analyst",
  vapt: "VAPT Professional",
  grc: "GRC Specialist",
};
export const MI_TRACKS = ["soc", "vapt", "grc"] as const;
export const MI_TYPES = ["technical", "hr", "scenario", "practical", "viva", "mixed"] as const;
export const MI_TYPE_LABELS: Record<string, string> = {
  technical: "Technical",
  hr: "HR / Behavioral",
  scenario: "Scenario",
  practical: "Practical",
  viva: "Viva",
  mixed: "Mixed",
};
export const MI_DIFFICULTIES = ["beginner", "intermediate", "advanced", "expert"] as const;
export const MI_STATUSES = ["draft", "published", "archived"] as const;
export const MI_SOURCES = ["ai", "bank", "custom"] as const;
export const MI_SOURCE_LABELS: Record<string, string> = {
  ai: "AI Generated",
  bank: "Question Bank",
  custom: "Custom",
};

// ─── Types ──────────────────────────────────────────────────────────────────
export interface MICustomQuestion {
  index: number;
  question: string;
}

export interface MITemplateStats {
  total: number;
  completed: number;
  avgScore: number | null;
}

export interface MITemplate {
  id: number;
  createdBy: number;
  title: string;
  description: string | null;
  careerTrack: string;
  interviewType: string;
  difficulty: string;
  status: string;
  totalQuestions: number;
  durationMin: number;
  rounds: number;
  passingScore: number;
  allowVoice: boolean;
  questionSource: string;
  questionBankIds: number[];
  customQuestions: MICustomQuestion[] | null;
  focusSkills: string[];
  instructions: string | null;
  scheduledAt: string | null;
  deadline: string | null;
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  stats?: MITemplateStats;
}

export interface MITemplateBody {
  title: string;
  description?: string;
  careerTrack: string;
  interviewType?: string;
  difficulty?: string;
  totalQuestions?: number;
  durationMin?: number;
  rounds?: number;
  passingScore?: number;
  allowVoice?: boolean;
  questionSource?: string;
  questionBankIds?: number[];
  customQuestions?: MICustomQuestion[];
  focusSkills?: string[];
  instructions?: string;
  scheduledAt?: string;
  deadline?: string;
}

export interface MIAnalytics {
  totalTemplates: number;
  publishedTemplates: number;
  totalAssignments: number;
  completedAssignments: number;
  completionRate: number;
  averageScore: number | null;
  byStatus: Record<string, number>;
  byTrack: Record<string, { templates: number; assignments: number }>;
}

export interface MIEvaluation {
  scores: { technical: number; grammar: number; communication: number; confidence: number; thinking: number; quality: number };
  overall: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  perQuestion: Array<{ question: string; answer: string; score: number; feedback: string }>;
}

export interface MIResultRow {
  assignmentId: number;
  studentId: number;
  studentName: string | null;
  studentEmail: string | null;
  status: string;
  score: number | null;
  dueAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  interviewId: number | null;
  evaluation: MIEvaluation | null;
  transcript: { questions: MICustomQuestion[]; answers: string[] } | null;
}

export interface MIResults {
  template: MITemplate;
  results: MIResultRow[];
}

export interface MIAssignResult {
  assigned: number;
  alreadyAssigned: number;
  skippedTrackMismatch: number;
}

export interface MIAssignBody {
  mode: "students" | "batches" | "all" | "track";
  studentIds?: number[];
  batchIds?: number[];
  dueAt?: string;
}

export interface MIAIGenerated {
  provider: string;
  count: number;
  questions: MICustomQuestion[];
}

// ─── Query keys ─────────────────────────────────────────────────────────────
export const miKeys = {
  list: (f: { status?: string; track?: string }) => ["mi", "mentor", "list", f] as const,
  one: (id: number) => ["mi", "mentor", "one", id] as const,
  results: (id: number) => ["mi", "mentor", "results", id] as const,
  analytics: ["mi", "mentor", "analytics"] as const,
  student: ["mi", "student", "list"] as const,
};

function qs(params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "" && v !== "all") sp.set(k, v);
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

// ─── Mentor queries ─────────────────────────────────────────────────────────
export function useMITemplates(filters: { status?: string; track?: string }) {
  return useQuery({
    queryKey: miKeys.list(filters),
    queryFn: () => apiFetch<MITemplate[]>(`/api/mentor/mock-interviews${qs(filters)}`),
  });
}
export function useMITemplate(id: number | null) {
  return useQuery({
    queryKey: miKeys.one(id ?? 0),
    queryFn: () => apiFetch<MITemplate>(`/api/mentor/mock-interviews/${id}`),
    enabled: id !== null,
  });
}
export function useMIAnalytics() {
  return useQuery({
    queryKey: miKeys.analytics,
    queryFn: () => apiFetch<MIAnalytics>("/api/mentor/mock-interviews/analytics"),
  });
}
export function useMIResults(id: number | null) {
  return useQuery({
    queryKey: miKeys.results(id ?? 0),
    queryFn: () => apiFetch<MIResults>(`/api/mentor/mock-interviews/${id}/results`),
    enabled: id !== null,
  });
}

function invalidateMentor(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["mi", "mentor"] });
}

// ─── Mentor mutations ───────────────────────────────────────────────────────
export function useCreateMITemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: MITemplateBody) =>
      apiFetch<MITemplate>("/api/mentor/mock-interviews", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => invalidateMentor(qc),
  });
}
export function useUpdateMITemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<MITemplateBody> }) =>
      apiFetch<MITemplate>(`/api/mentor/mock-interviews/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => invalidateMentor(qc),
  });
}
export function usePublishMITemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<MITemplate>(`/api/mentor/mock-interviews/${id}/publish`, { method: "POST" }),
    onSuccess: () => invalidateMentor(qc),
  });
}
export function useDeleteMITemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ deleted?: boolean; archived?: boolean }>(`/api/mentor/mock-interviews/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidateMentor(qc),
  });
}
export function useAssignMITemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: MIAssignBody }) =>
      apiFetch<MIAssignResult>(`/api/mentor/mock-interviews/${id}/assign`, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => invalidateMentor(qc),
  });
}
export function useMIGenerateQuestions() {
  return useMutation({
    mutationFn: (body: { careerTrack: string; interviewType?: string; difficulty?: string; count?: number; focusSkills?: string[] }) =>
      apiFetch<MIAIGenerated>("/api/mentor/mock-interviews/ai/generate-questions", { method: "POST", body: JSON.stringify(body) }),
  });
}

// ─── Student side ───────────────────────────────────────────────────────────
export interface MIStudentAssignment {
  assignmentId: number;
  templateId: number;
  title: string;
  description: string | null;
  careerTrack: string | null;
  interviewType: string | null;
  difficulty: string | null;
  totalQuestions: number | null;
  durationMin: number | null;
  allowVoice: boolean;
  instructions: string | null;
  status: string;
  score: number | null;
  dueAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  interviewId: number | null;
}

export interface MIStartResult {
  interviewId: number;
  resumed: boolean;
  status: string;
  totalQuestions: number;
  trackName?: string;
  index: number | null;
  question: string | null;
}

export function useStudentAssignedInterviews() {
  return useQuery({
    queryKey: miKeys.student,
    queryFn: () => apiFetch<MIStudentAssignment[]>("/api/student/mock-interviews"),
  });
}
export function useStartAssignedInterview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: number) =>
      apiFetch<MIStartResult>(`/api/student/mock-interviews/${assignmentId}/start`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: miKeys.student }),
  });
}
