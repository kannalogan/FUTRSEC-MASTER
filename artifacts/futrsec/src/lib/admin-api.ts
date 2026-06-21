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

interface UserRef {
  id: number;
  fullName: string | null;
  email: string | null;
}

// ─── Types ──────────────────────────────────────────────────────────────────
export interface AdminOverview {
  totalStudents: number;
  byTrack: { soc: number; vapt: number; grc: number };
  mentors: number;
  tpos: number;
  companies: number;
  jobs: number;
  applications: number;
  placements: number;
  revenue: number;
  subscriptions: number;
  dailyActiveUsers: number;
  monthlyActiveUsers: number;
  aiUsage: number;
}

export interface AdminTrackRow {
  track: string;
  students: number;
  applications: number;
  placements: number;
}

export interface AdminTpo {
  userId: number;
  email: string | null;
  fullName: string | null;
  isActive: boolean;
  createdAt: string;
  institution: string | null;
  designation: string | null;
  approvalStatus: string;
  rejectionReason: string | null;
}

export interface AdminCompany {
  userId: number;
  email: string | null;
  fullName: string | null;
  isActive: boolean;
  createdAt: string;
  companyName: string | null;
  industry: string | null;
  companySize: string | null;
  website: string | null;
  isVerified: boolean;
  approvalStatus: string;
  rejectionReason: string | null;
}

export interface AdminJob {
  id: number;
  title: string;
  status: string;
  type: string;
  location: string | null;
  requiredTracks: string[];
  createdAt: string;
  companyName: string | null;
}

export interface AdminApplication {
  id: number;
  status: string;
  appliedAt: string;
  job: { id: number; title: string } | null;
  student: UserRef | null;
}

export interface AdminPlacement {
  id: number;
  status: string;
  salary: number | null;
  joiningDate: string | null;
  createdAt: string;
  job: { id: number; title: string; employerId: number } | null;
  student: UserRef | null;
}

export interface AdminSubscription {
  id: number;
  plan: string;
  status: string;
  user: UserRef | null;
}

export interface AdminPayment {
  id: number;
  amount: number;
  status: string;
  gateway: string;
  user: UserRef | null;
}

export interface AdminAiUsage {
  totalInteractions: number;
  totalTokens: number;
  byModel: { model: string; count: number }[];
  recent: {
    id: number;
    model: string | null;
    tokens: number | null;
    createdAt: string | null;
    user: UserRef | null;
  }[];
}

export interface AdminConsent {
  id: number;
  marketing: boolean;
  analytics: boolean;
  dataProcessing: boolean;
  thirdParty: boolean;
  updatedAt: string;
  user: UserRef | null;
}

export interface AdminAuditLog {
  id: number;
  action: string;
  entityType: string | null;
  entityId: string | null;
  ipAddress: string | null;
  metadata: string | null;
  createdAt: string;
  user: UserRef | null;
}

// ─── Keys ───────────────────────────────────────────────────────────────────
export const adminKeys = {
  overview: ["admin", "overview"] as const,
  trackAnalytics: ["admin", "track-analytics"] as const,
  tpos: ["admin", "tpos"] as const,
  companies: ["admin", "companies"] as const,
  jobs: ["admin", "jobs"] as const,
  applications: ["admin", "applications"] as const,
  placements: ["admin", "placements"] as const,
  subscriptions: ["admin", "subscriptions"] as const,
  payments: ["admin", "payments"] as const,
  aiUsage: ["admin", "ai-usage"] as const,
  consent: ["admin", "consent-logs"] as const,
  audit: ["admin", "audit-logs"] as const,
};

// ─── Queries ────────────────────────────────────────────────────────────────
export function useAdminOverview() {
  return useQuery({
    queryKey: adminKeys.overview,
    queryFn: () => apiFetch<AdminOverview>("/api/admin/overview"),
  });
}
export function useAdminTrackAnalytics() {
  return useQuery({
    queryKey: adminKeys.trackAnalytics,
    queryFn: () =>
      apiFetch<{ rows: AdminTrackRow[] }>("/api/admin/track-analytics"),
  });
}
export function useAdminTpos(status?: string) {
  const suffix = status ? `?status=${status}` : "";
  return useQuery({
    queryKey: [...adminKeys.tpos, status ?? ""],
    queryFn: () => apiFetch<{ tpos: AdminTpo[] }>(`/api/admin/tpos${suffix}`),
  });
}
export function useAdminCompanies(status?: string) {
  const suffix = status ? `?status=${status}` : "";
  return useQuery({
    queryKey: [...adminKeys.companies, status ?? ""],
    queryFn: () =>
      apiFetch<{ companies: AdminCompany[] }>(`/api/admin/companies${suffix}`),
  });
}
export function useAdminJobs() {
  return useQuery({
    queryKey: adminKeys.jobs,
    queryFn: () => apiFetch<{ jobs: AdminJob[] }>("/api/admin/jobs"),
  });
}
export function useAdminApplications() {
  return useQuery({
    queryKey: adminKeys.applications,
    queryFn: () =>
      apiFetch<{ applications: AdminApplication[] }>("/api/admin/applications"),
  });
}
export function useAdminPlacements() {
  return useQuery({
    queryKey: adminKeys.placements,
    queryFn: () =>
      apiFetch<{ placements: AdminPlacement[] }>("/api/admin/placements"),
  });
}
export function useAdminSubscriptions() {
  return useQuery({
    queryKey: adminKeys.subscriptions,
    queryFn: () =>
      apiFetch<{ subscriptions: AdminSubscription[] }>(
        "/api/admin/subscriptions"
      ),
  });
}
export function useAdminPayments() {
  return useQuery({
    queryKey: adminKeys.payments,
    queryFn: () => apiFetch<{ payments: AdminPayment[] }>("/api/admin/payments"),
  });
}
export function useAdminAiUsage() {
  return useQuery({
    queryKey: adminKeys.aiUsage,
    queryFn: () => apiFetch<AdminAiUsage>("/api/admin/ai-usage"),
  });
}
export function useAdminConsentLogs() {
  return useQuery({
    queryKey: adminKeys.consent,
    queryFn: () =>
      apiFetch<{ consents: AdminConsent[] }>("/api/admin/consent-logs"),
  });
}
export function useAdminAuditLogs(action?: string) {
  const suffix = action ? `?action=${encodeURIComponent(action)}` : "";
  return useQuery({
    queryKey: [...adminKeys.audit, action ?? ""],
    queryFn: () =>
      apiFetch<{ logs: AdminAuditLog[] }>(`/api/admin/audit-logs${suffix}`),
  });
}

// ─── Mutations ──────────────────────────────────────────────────────────────
export function useReviewTpo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      decision,
      reason,
    }: {
      userId: number;
      decision: "approve" | "reject";
      reason?: string;
    }) =>
      apiFetch(`/api/admin/tpos/${userId}/${decision}`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.tpos });
      qc.invalidateQueries({ queryKey: adminKeys.overview });
    },
  });
}
export function useReviewCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      decision,
      reason,
    }: {
      userId: number;
      decision: "approve" | "reject";
      reason?: string;
    }) =>
      apiFetch(`/api/admin/companies/${userId}/${decision}`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.companies });
      qc.invalidateQueries({ queryKey: adminKeys.overview });
    },
  });
}
