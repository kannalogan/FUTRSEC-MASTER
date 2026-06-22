import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

// ─── Types (mirror routes/job-agent.ts responses) ────────────────────────────
export interface JobEmployer {
  id: number;
  userId: number;
  companyName: string;
  companySize: string | null;
  industry: string | null;
  website: string | null;
  linkedinUrl: string | null;
  designation: string | null;
  logoUrl: string | null;
  isVerified: boolean;
  approvalStatus: string;
}

export interface JobBase {
  id: number;
  employerId: number;
  title: string;
  description: string;
  type: string;
  location: string | null;
  isRemote: boolean;
  minSalary: number | null;
  maxSalary: number | null;
  experience: string | null;
  requiredTracks: string[];
  status: string;
  applicationDeadline: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MatchComponent {
  score: number;
  weight: number;
  contribution: number;
}

export type MatchBreakdown = Record<string, MatchComponent>;

export interface RecommendedJob extends JobBase {
  skills: string[];
  employer: JobEmployer | null;
  matchScore: number;
  matchReasons: string[];
  matchFactors: unknown;
  matchBreakdown: MatchBreakdown;
  missingSkills: string[];
  recommendations: string[];
  applied: boolean;
  saved: boolean;
}

export interface SavedJob extends JobBase {
  savedAt: string;
  skills: string[];
  employer: JobEmployer | null;
  applied: boolean;
}

export interface JobAgentOverview {
  recommended: number;
  new: number;
  saved: number;
  applied: number;
  interviews: number;
  offers: number;
  placementReadiness: number;
}

export interface AutoApplySettings {
  id?: number;
  studentId: number;
  enabled: boolean;
  minSalary: number | null;
  preferredLocation: string | null;
  workMode: string | null;
  companySize: string | null;
}

export interface AutoApplyEligibility {
  eligible: boolean;
  isPremium: boolean;
  isTrial: boolean;
  cp5Complete: boolean;
  lockReason: string | null;
}

export interface AutoApplyResponse {
  settings: AutoApplySettings;
  eligibility: AutoApplyEligibility;
}

export interface AutoApplyUpdate {
  enabled?: boolean;
  minSalary?: number | null;
  preferredLocation?: string | null;
  workMode?: string | null;
  companySize?: string | null;
}

export interface AutoApplyRunResult {
  applied: { jobId: number; applicationId: number; matchScore: number; title: string }[];
  count: number;
}

// ─── Keys ───────────────────────────────────────────────────────────────────
export const jobAgentKeys = {
  all: ["job-agent"] as const,
  overview: ["job-agent", "overview"] as const,
  recommended: ["job-agent", "recommended"] as const,
  saved: ["job-agent", "saved"] as const,
  autoApply: ["job-agent", "auto-apply"] as const,
};

// ─── Queries ────────────────────────────────────────────────────────────────
export function useJobAgentOverview() {
  return useQuery({
    queryKey: jobAgentKeys.overview,
    queryFn: () => apiFetch<JobAgentOverview>("/api/job-agent/overview"),
  });
}

export function useRecommendedJobs() {
  return useQuery({
    queryKey: jobAgentKeys.recommended,
    queryFn: () => apiFetch<{ jobs: RecommendedJob[] }>("/api/job-agent/recommended"),
  });
}

export function useSavedJobs() {
  return useQuery({
    queryKey: jobAgentKeys.saved,
    queryFn: () => apiFetch<{ jobs: SavedJob[] }>("/api/job-agent/saved"),
  });
}

export function useAutoApply() {
  return useQuery({
    queryKey: jobAgentKeys.autoApply,
    queryFn: () => apiFetch<AutoApplyResponse>("/api/job-agent/auto-apply"),
  });
}

// ─── Mutations ──────────────────────────────────────────────────────────────
export function useSaveJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: number) =>
      apiFetch(`/api/job-agent/jobs/${jobId}/save`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: jobAgentKeys.recommended });
      qc.invalidateQueries({ queryKey: jobAgentKeys.saved });
      qc.invalidateQueries({ queryKey: jobAgentKeys.overview });
    },
  });
}

export function useUnsaveJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: number) =>
      apiFetch<{ success: boolean }>(`/api/job-agent/jobs/${jobId}/save`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: jobAgentKeys.recommended });
      qc.invalidateQueries({ queryKey: jobAgentKeys.saved });
      qc.invalidateQueries({ queryKey: jobAgentKeys.overview });
    },
  });
}

export function useUpdateAutoApply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AutoApplyUpdate) =>
      apiFetch<{ settings: AutoApplySettings }>("/api/job-agent/auto-apply", {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: jobAgentKeys.autoApply });
    },
  });
}

export function useRunAutoApply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<AutoApplyRunResult>("/api/job-agent/auto-apply/run", { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: jobAgentKeys.all });
    },
  });
}
