import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

// ─── Constants ──────────────────────────────────────────────────────────────
export const LB_TRACK_LABELS: Record<string, string> = {
  soc: "SOC Analyst",
  vapt: "VAPT Professional",
  grc: "GRC Specialist",
};
export const LB_DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;
export const LB_STATUSES = ["draft", "published", "archived"] as const;
export const LB_TYPES = ["ctf", "guided", "sandbox", "simulation"] as const;
export const LB_ASSET_KINDS = [
  "pdf",
  "video",
  "pcap",
  "script",
  "challenge",
  "image",
  "link",
] as const;
export const LB_AUDIENCES = ["student", "track", "cohort"] as const;

// ─── Types ──────────────────────────────────────────────────────────────────
export interface LabListItem {
  id: number;
  trackId: number | null;
  title: string;
  slug: string;
  description: string;
  difficulty: string;
  type: string;
  tags: string[];
  totalPoints: number;
  estimatedMinutes: number;
  isActive: boolean;
  authorId: number | null;
  authorRole: string | null;
  status: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  trackName: string | null;
  moduleCount: number;
  assignmentCount: number;
}

export interface LabDetail {
  id: number;
  trackId: number | null;
  title: string;
  slug: string;
  description: string;
  difficulty: string;
  type: string;
  tags: string[];
  totalPoints: number;
  estimatedMinutes: number;
  isActive: boolean;
  authorId: number | null;
  authorRole: string | null;
  status: string;
  version: number;
  learningObjectives: string[];
  walkthrough: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LabHint {
  id: number;
  labModuleId: number;
  order: number;
  content: string;
  penaltyPoints: number;
  createdAt: string;
}

/** Objective spec for command-validated modules (authoring side, server-mirrored). */
export interface CommandSpec {
  tool: string;
  toolAliases?: string[];
  /** Each inner array is one requirement satisfied by ANY of its flag forms. */
  requiredFlags?: string[][];
  forbiddenFlags?: string[];
  requiredArgs?: { pattern: string; isRegex?: boolean; label?: string }[];
  intentKeywords?: string[];
  caseSensitive?: boolean;
}

export type ValidationType = "flag" | "command";

export interface LabModule {
  id: number;
  labId: number;
  title: string;
  order: number;
  taskDescription: string;
  hint: string | null;
  flag: string | null;
  flagFormat: string | null;
  validationType: ValidationType;
  commandSpec: CommandSpec | null;
  solutionExplanation: string | null;
  walkthrough: string | null;
  points: number;
  createdAt: string;
  hints: LabHint[];
}

export interface LabAsset {
  id: number;
  labId: number;
  kind: string;
  title: string;
  url: string;
  storageKey: string | null;
  sizeBytes: number | null;
  uploadedBy: number;
  createdAt: string;
}

export interface LabVersionRef {
  id: number;
  labId: number;
  version: number;
  note: string | null;
  createdBy: number;
  createdAt: string;
  createdByName?: string | null;
}

export interface LabFullDetail {
  lab: LabDetail;
  modules: LabModule[];
  assets: LabAsset[];
  versions: LabVersionRef[];
}

export interface LabAssignment {
  id: number;
  labId: number;
  assignedBy: number;
  audienceType: string;
  studentId: number | null;
  batchId: number | null;
  trackId: number | null;
  dueAt: string | null;
  note: string | null;
  createdAt: string;
  studentName: string | null;
  studentEmail: string | null;
  trackName: string | null;
}

export interface LabAnalytics {
  labId: number;
  title: string;
  assigned: number;
  started: number;
  completed: number;
  completionRate: number;
  avgTimeMinutes: number;
  totalAttempts: number;
  retryCount: number;
  failureCount: number;
  topStudents: {
    studentId: number;
    fullName: string | null;
    email: string | null;
    score: number;
    completed: boolean;
  }[];
  moduleStats: {
    moduleId: number;
    title: string;
    order: number;
    points: number;
    solvedBy: number;
  }[];
  difficultyDistribution: { label: string; count: number }[];
}

export interface LabOverviewAnalytics {
  totalLabs: number;
  byStatus: Record<string, number>;
  byDifficulty: Record<string, number>;
  totalAssignments: number;
  assignedStudents: number;
  completedStudents: number;
  aggregateCompletionRate: number;
}

export interface TrackOption {
  id: number;
  name: string;
  slug: string;
  domain: string;
}

// ─── Bodies ─────────────────────────────────────────────────────────────────
export interface CreateLabBody {
  title: string;
  slug: string;
  description: string;
  trackId?: number | null;
  difficulty?: string;
  type?: string;
  tags?: string[];
  estimatedMinutes?: number;
  totalPoints?: number;
  learningObjectives?: string[];
  walkthrough?: string | null;
}

export type UpdateLabBody = Partial<Omit<CreateLabBody, "slug">>;

export interface ModuleBody {
  title: string;
  order: number;
  taskDescription: string;
  hint?: string;
  flag?: string;
  flagFormat?: string;
  validationType?: ValidationType;
  commandSpec?: CommandSpec | null;
  solutionExplanation?: string;
  walkthrough?: string;
  points?: number;
}

export interface HintBody {
  order?: number;
  content: string;
  penaltyPoints?: number;
}

export interface AssetBody {
  kind: string;
  title: string;
  url: string;
  storageKey?: string;
  sizeBytes?: number;
}

export interface AssignmentBody {
  audienceType: string;
  studentId?: number;
  trackId?: number;
  dueAt?: string;
  note?: string;
}

// ─── Keys ───────────────────────────────────────────────────────────────────
export const labBuilderKeys = {
  labs: ["/api/lab-builder/labs"] as const,
  lab: (id: number) => [`/api/lab-builder/labs/${id}`] as const,
  assignments: (id: number) =>
    [`/api/lab-builder/labs/${id}/assignments`] as const,
  versions: (id: number) => [`/api/lab-builder/labs/${id}/versions`] as const,
  analytics: (id: number) => [`/api/lab-builder/labs/${id}/analytics`] as const,
  overview: ["/api/lab-builder/analytics/overview"] as const,
  tracks: ["/api/tracks"] as const,
};

// ─── Queries ────────────────────────────────────────────────────────────────
export function useLabBuilderLabs() {
  return useQuery({
    queryKey: labBuilderKeys.labs,
    queryFn: () =>
      apiFetch<{ labs: LabListItem[] }>("/api/lab-builder/labs"),
  });
}

export function useLabBuilderLab(id: number | null) {
  return useQuery({
    queryKey: labBuilderKeys.lab(id ?? 0),
    queryFn: () => apiFetch<LabFullDetail>(`/api/lab-builder/labs/${id}`),
    enabled: id !== null,
  });
}

export function useLabAssignments(id: number | null) {
  return useQuery({
    queryKey: labBuilderKeys.assignments(id ?? 0),
    queryFn: () =>
      apiFetch<{ assignments: LabAssignment[] }>(
        `/api/lab-builder/labs/${id}/assignments`
      ),
    enabled: id !== null,
  });
}

export function useLabVersions(id: number | null) {
  return useQuery({
    queryKey: labBuilderKeys.versions(id ?? 0),
    queryFn: () =>
      apiFetch<{ versions: LabVersionRef[] }>(
        `/api/lab-builder/labs/${id}/versions`
      ),
    enabled: id !== null,
  });
}

export function useLabAnalytics(id: number | null) {
  return useQuery({
    queryKey: labBuilderKeys.analytics(id ?? 0),
    queryFn: () =>
      apiFetch<LabAnalytics>(`/api/lab-builder/labs/${id}/analytics`),
    enabled: id !== null,
  });
}

export function useLabOverviewAnalytics() {
  return useQuery({
    queryKey: labBuilderKeys.overview,
    queryFn: () =>
      apiFetch<LabOverviewAnalytics>("/api/lab-builder/analytics/overview"),
  });
}

export function useTrackOptions() {
  return useQuery({
    queryKey: labBuilderKeys.tracks,
    queryFn: () => apiFetch<TrackOption[]>("/api/tracks"),
  });
}

// ─── Mutations ──────────────────────────────────────────────────────────────
function invalidateLab(qc: ReturnType<typeof useQueryClient>, id: number) {
  qc.invalidateQueries({ queryKey: labBuilderKeys.lab(id) });
  qc.invalidateQueries({ queryKey: labBuilderKeys.labs });
}

export function useCreateLab() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateLabBody) =>
      apiFetch<{ lab: LabListItem }>("/api/lab-builder/labs", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: labBuilderKeys.labs }),
  });
}

export function useUpdateLab(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateLabBody) =>
      apiFetch<{ lab: LabDetail }>(`/api/lab-builder/labs/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: () => invalidateLab(qc, id),
  });
}

export function usePublishLab() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ lab: LabDetail }>(`/api/lab-builder/labs/${id}/publish`, {
        method: "POST",
      }),
    onSuccess: (_d, id) => invalidateLab(qc, id),
  });
}

export function useArchiveLab() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ lab: LabDetail }>(`/api/lab-builder/labs/${id}/archive`, {
        method: "POST",
      }),
    onSuccess: (_d, id) => invalidateLab(qc, id),
  });
}

export function useCloneLab() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ lab: LabDetail }>(`/api/lab-builder/labs/${id}/clone`, {
        method: "POST",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: labBuilderKeys.labs }),
  });
}

export function useCreateModule(labId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ModuleBody) =>
      apiFetch<{ module: LabModule }>(
        `/api/lab-builder/labs/${labId}/modules`,
        { method: "POST", body: JSON.stringify(body) }
      ),
    onSuccess: () => invalidateLab(qc, labId),
  });
}

export function useUpdateModule(labId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      moduleId,
      body,
    }: {
      moduleId: number;
      body: Partial<ModuleBody>;
    }) =>
      apiFetch<{ module: LabModule }>(
        `/api/lab-builder/modules/${moduleId}`,
        { method: "PUT", body: JSON.stringify(body) }
      ),
    onSuccess: () => invalidateLab(qc, labId),
  });
}

export function useDeleteModule(labId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (moduleId: number) =>
      apiFetch(`/api/lab-builder/modules/${moduleId}`, { method: "DELETE" }),
    onSuccess: () => invalidateLab(qc, labId),
  });
}

export function useCreateHint(labId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ moduleId, body }: { moduleId: number; body: HintBody }) =>
      apiFetch<{ hint: LabHint }>(
        `/api/lab-builder/modules/${moduleId}/hints`,
        { method: "POST", body: JSON.stringify(body) }
      ),
    onSuccess: () => invalidateLab(qc, labId),
  });
}

export function useDeleteHint(labId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (hintId: number) =>
      apiFetch(`/api/lab-builder/hints/${hintId}`, { method: "DELETE" }),
    onSuccess: () => invalidateLab(qc, labId),
  });
}

export function useCreateAsset(labId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AssetBody) =>
      apiFetch<{ asset: LabAsset }>(`/api/lab-builder/labs/${labId}/assets`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => invalidateLab(qc, labId),
  });
}

export function useDeleteAsset(labId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assetId: number) =>
      apiFetch(`/api/lab-builder/assets/${assetId}`, { method: "DELETE" }),
    onSuccess: () => invalidateLab(qc, labId),
  });
}

export function useCreateAssignment(labId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AssignmentBody) =>
      apiFetch<{ assignment: LabAssignment; notified: number }>(
        `/api/lab-builder/labs/${labId}/assignments`,
        { method: "POST", body: JSON.stringify(body) }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: labBuilderKeys.assignments(labId) });
      qc.invalidateQueries({ queryKey: labBuilderKeys.labs });
    },
  });
}

export function useDeleteAssignment(labId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: number) =>
      apiFetch(`/api/lab-builder/assignments/${assignmentId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: labBuilderKeys.assignments(labId) });
      qc.invalidateQueries({ queryKey: labBuilderKeys.labs });
    },
  });
}

export function useRestoreVersion(labId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (version: number) =>
      apiFetch<{ lab: LabDetail }>(
        `/api/lab-builder/labs/${labId}/restore/${version}`,
        { method: "POST" }
      ),
    onSuccess: () => {
      invalidateLab(qc, labId);
      qc.invalidateQueries({ queryKey: labBuilderKeys.versions(labId) });
    },
  });
}
