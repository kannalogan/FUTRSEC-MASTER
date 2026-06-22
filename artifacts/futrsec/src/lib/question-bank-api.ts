import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export const QB_TRACK_LABELS: Record<string, string> = {
  soc: "SOC Analyst",
  vapt: "VAPT Professional",
  grc: "GRC Specialist",
};
export const QB_TRACKS = ["soc", "vapt", "grc"] as const;
export const QB_TYPES = ["mcq", "multi_select", "true_false", "code", "practical", "scenario"] as const;
export const QB_TYPE_LABELS: Record<string, string> = {
  mcq: "Multiple Choice",
  multi_select: "Multi-Select",
  true_false: "True / False",
  code: "Code",
  practical: "Practical",
  scenario: "Scenario",
};
export const QB_DIFFICULTIES = ["beginner", "intermediate", "advanced", "expert"] as const;
export const QB_STATUSES = ["draft", "pending", "approved", "rejected", "archived"] as const;
export const CHOICE_TYPES = new Set(["mcq", "multi_select", "true_false"]);

export interface QBOption {
  id?: number;
  optionText: string;
  isCorrect?: boolean;
  order?: number;
}

export interface QBQuestion {
  id: number;
  questionText: string;
  questionType: string;
  careerTrack: string;
  difficulty: string;
  status: string;
  createdBy: number;
  creatorRole: string;
  approvedBy: number | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  isShared: boolean;
  version: number;
  topic: string | null;
  bloomLevel: string | null;
  estimatedTimeMin: number | null;
  marks: number;
  negativeMarks: number;
  skills: string[];
  keywords: string[];
  explanation: string | null;
  codeLanguage: string | null;
  codeTemplate: string | null;
  expectedOutput: string | null;
  scenarioContext: string | null;
  usageCount: number;
  aiQualityScore: number | null;
  aiGenerated: boolean;
  createdAt: string;
  updatedAt: string;
  options: QBOption[];
  editable?: boolean;
  versions?: { version: number; changeNote: string | null; createdAt: string }[];
}

export interface QBListResponse {
  items: QBQuestion[];
  total: number;
  page: number;
  pageSize: number;
}

export interface QBAnalytics {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  byDifficulty: Record<string, number>;
  byTrack: Record<string, number>;
  totalUsage: number;
  avgQuality: number | null;
  tracks: string[];
}

export interface QBBody {
  questionText: string;
  questionType: string;
  careerTrack: string;
  difficulty: string;
  topic?: string;
  bloomLevel?: string;
  estimatedTimeMin?: number;
  marks?: number;
  negativeMarks?: number;
  skills?: string[];
  keywords?: string[];
  explanation?: string;
  codeLanguage?: string;
  codeTemplate?: string;
  expectedOutput?: string;
  scenarioContext?: string;
  isShared?: boolean;
  batchIds?: number[];
  options?: QBOption[];
  aiGenerated?: boolean;
  changeNote?: string;
}

function qs(params: QBFilters): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "" && v !== "all") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

// ─── Mentor ───────────────────────────────────────────────────────────────
export const qbKeys = {
  list: (f: QBFilters) => ["qb", "mentor", "list", f] as const,
  one: (id: number) => ["qb", "mentor", "one", id] as const,
  analytics: ["qb", "mentor", "analytics"] as const,
  adminList: (f: QBFilters) => ["qb", "admin", "list", f] as const,
  adminPending: ["qb", "admin", "pending"] as const,
  adminOne: (id: number) => ["qb", "admin", "one", id] as const,
  adminAnalytics: ["qb", "admin", "analytics"] as const,
};

export interface QBFilters {
  view?: string;
  track?: string;
  type?: string;
  difficulty?: string;
  status?: string;
  topic?: string;
  skill?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export function useMentorQuestions(filters: QBFilters) {
  return useQuery({
    queryKey: qbKeys.list(filters),
    queryFn: () => apiFetch<QBListResponse>(`/api/mentor/question-bank${qs(filters)}`),
  });
}
export function useMentorQuestion(id: number | null) {
  return useQuery({
    queryKey: qbKeys.one(id ?? 0),
    queryFn: () => apiFetch<QBQuestion>(`/api/mentor/question-bank/${id}`),
    enabled: id !== null,
  });
}
export function useMentorQBAnalytics() {
  return useQuery({
    queryKey: qbKeys.analytics,
    queryFn: () => apiFetch<QBAnalytics>("/api/mentor/question-bank/analytics"),
  });
}

function invalidateMentor(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["qb", "mentor"] });
}

export function useCreateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: QBBody) => apiFetch<QBQuestion>("/api/mentor/question-bank", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => invalidateMentor(qc),
  });
}
export function useUpdateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: QBBody }) => apiFetch<QBQuestion>(`/api/mentor/question-bank/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => invalidateMentor(qc),
  });
}
export function useDeleteQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<{ ok: boolean }>(`/api/mentor/question-bank/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidateMentor(qc),
  });
}
export function useSubmitQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<{ ok: boolean; status: string }>(`/api/mentor/question-bank/${id}/submit`, { method: "POST" }),
    onSuccess: () => invalidateMentor(qc),
  });
}
export function useDuplicateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<QBQuestion>(`/api/mentor/question-bank/${id}/duplicate`, { method: "POST" }),
    onSuccess: () => invalidateMentor(qc),
  });
}

// AI
export interface AIGeneratedQuestion {
  questionText: string;
  questionType: string;
  careerTrack: string;
  difficulty: string;
  topic: string | null;
  bloomLevel: string | null;
  estimatedTimeMin: number | null;
  skills: string[];
  keywords: string[];
  explanation: string | null;
  options: QBOption[];
  aiGenerated: boolean;
}
export function useAIGenerate() {
  return useMutation({
    mutationFn: (body: { careerTrack: string; questionType: string; difficulty: string; topic?: string; count: number }) =>
      apiFetch<{ provider: string; generated: AIGeneratedQuestion[] }>("/api/mentor/question-bank/ai/generate", { method: "POST", body: JSON.stringify(body) }),
  });
}
export function useAIDifficulty() {
  return useMutation({
    mutationFn: (body: { questionText: string }) =>
      apiFetch<{ difficulty: string; confidence: number; rationale: string; provider: string }>("/api/mentor/question-bank/ai/difficulty", { method: "POST", body: JSON.stringify(body) }),
  });
}
export function useAIExplain() {
  return useMutation({
    mutationFn: (body: { questionText: string; options?: { optionText: string; isCorrect: boolean }[] }) =>
      apiFetch<{ explanation: string; provider: string }>("/api/mentor/question-bank/ai/explain", { method: "POST", body: JSON.stringify(body) }),
  });
}
export function useAIQuality() {
  return useMutation({
    mutationFn: (body: { questionText: string; questionId?: number }) =>
      apiFetch<{ score: number; issues: string[]; suggestions: string[]; provider: string }>("/api/mentor/question-bank/ai/quality", { method: "POST", body: JSON.stringify(body) }),
  });
}
export function useAIDuplicates() {
  return useMutation({
    mutationFn: (body: { questionText: string }) =>
      apiFetch<{ provider: string; duplicates: { id: number; questionText: string; similarity: number }[] }>("/api/mentor/question-bank/ai/duplicates", { method: "POST", body: JSON.stringify(body) }),
  });
}

// Paper builder
export interface PaperGenBody {
  careerTrack: string;
  totalQuestions: number;
  questionTypes?: string[];
  byDifficulty?: Record<string, number>;
  randomize?: boolean;
  negativeMarking?: boolean;
  timeLimitMin: number;
}
export interface PaperPreview {
  poolSize: number;
  requested: number;
  selectedCount: number;
  totalMarks: number;
  timeLimitMin: number;
  negativeMarking: boolean;
  questions: QBQuestion[];
}
export function useGeneratePaper() {
  return useMutation({
    mutationFn: (body: PaperGenBody) => apiFetch<PaperPreview>("/api/mentor/question-papers/generate", { method: "POST", body: JSON.stringify(body) }),
  });
}
export function usePublishPaper() {
  return useMutation({
    mutationFn: (body: { title: string; questionIds: number[]; timeLimitMin: number; passingScore?: number }) =>
      apiFetch<{ assessmentId: number; title: string; totalQuestions: number }>("/api/mentor/question-papers/publish", { method: "POST", body: JSON.stringify(body) }),
  });
}

// ─── Admin ────────────────────────────────────────────────────────────────
export function useAdminQuestions(filters: QBFilters) {
  return useQuery({
    queryKey: qbKeys.adminList(filters),
    queryFn: () => apiFetch<QBListResponse>(`/api/admin/question-bank${qs(filters)}`),
  });
}
export function useAdminPending() {
  return useQuery({
    queryKey: qbKeys.adminPending,
    queryFn: () => apiFetch<{ items: QBQuestion[] }>("/api/admin/question-bank/pending"),
  });
}
export function useAdminQBAnalytics() {
  return useQuery({
    queryKey: qbKeys.adminAnalytics,
    queryFn: () => apiFetch<{ total: number; byStatus: Record<string, number>; byTrack: Record<string, number>; byType: Record<string, number>; pending: number }>("/api/admin/question-bank/analytics"),
  });
}
function invalidateAdmin(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["qb", "admin"] });
}
export function useApproveQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isShared }: { id: number; isShared?: boolean }) => apiFetch<{ ok: boolean }>(`/api/admin/question-bank/${id}/approve`, { method: "POST", body: JSON.stringify({ isShared }) }),
    onSuccess: () => invalidateAdmin(qc),
  });
}
export function useRejectQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => apiFetch<{ ok: boolean }>(`/api/admin/question-bank/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) }),
    onSuccess: () => invalidateAdmin(qc),
  });
}
export function useAdminDeleteQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<{ ok: boolean }>(`/api/admin/question-bank/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidateAdmin(qc),
  });
}
