import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

// ─── Types ──────────────────────────────────────────────────────────────────
export interface RetentionPolicy {
  id: number;
  entityType: string;
  retentionDays: number;
  legalBasis: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RetentionPurgeRun {
  id: number;
  trigger: string;
  triggeredBy: number | null;
  dryRun: boolean;
  status: string;
  summary: Record<string, number> | null;
  totalDeleted: number;
  error: string | null;
  startedAt: string;
  completedAt: string | null;
}

export interface RetentionRunResult {
  runId: number | null;
  dryRun: boolean;
  trigger: string;
  status: "completed" | "failed";
  summary: Record<string, number>;
  totalDeleted: number;
  error?: string;
}

export interface PoliciesResponse {
  policies: RetentionPolicy[];
  knownEntityTypes: string[];
}

// Human-readable labels for the known entity types.
export const ENTITY_TYPE_LABELS: Record<string, string> = {
  audit_logs: "Audit Logs",
  consent_history: "Consent History",
  data_download_requests: "Data Download Requests",
  notifications: "Notifications",
  refresh_tokens: "Refresh Tokens",
  inactive_accounts: "Inactive Accounts",
};

export function entityLabel(entityType: string): string {
  return ENTITY_TYPE_LABELS[entityType] ?? entityType;
}

// ─── Keys ───────────────────────────────────────────────────────────────────
export const retentionKeys = {
  policies: ["/api/admin/retention/policies"] as const,
  runs: ["/api/admin/retention/runs"] as const,
  preview: ["/api/admin/retention/preview"] as const,
};

// ─── Queries ────────────────────────────────────────────────────────────────
export function useRetentionPolicies() {
  return useQuery({
    queryKey: retentionKeys.policies,
    queryFn: () => apiFetch<PoliciesResponse>("/api/admin/retention/policies"),
  });
}

export function useRetentionRuns() {
  return useQuery({
    queryKey: retentionKeys.runs,
    queryFn: () =>
      apiFetch<{ runs: RetentionPurgeRun[] }>("/api/admin/retention/runs"),
  });
}

// ─── Mutations ──────────────────────────────────────────────────────────────
export interface CreatePolicyInput {
  entityType: string;
  retentionDays: number;
  legalBasis: string;
  description?: string;
}

export function useCreatePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePolicyInput) =>
      apiFetch<{ policy: RetentionPolicy }>("/api/admin/retention/policies", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: retentionKeys.policies }),
  });
}

export interface UpdatePolicyInput {
  id: number;
  retentionDays?: number;
  legalBasis?: string;
  description?: string | null;
}

export function useUpdatePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdatePolicyInput) =>
      apiFetch<{ policy: RetentionPolicy }>(
        `/api/admin/retention/policies/${id}`,
        { method: "PUT", body: JSON.stringify(body) }
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: retentionKeys.policies }),
  });
}

export function useDeletePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/admin/retention/policies/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: retentionKeys.policies }),
  });
}

export function usePreviewImpact() {
  return useMutation({
    mutationFn: () =>
      apiFetch<{ result: RetentionRunResult }>(
        "/api/admin/retention/preview"
      ),
  });
}

export function useRunPurge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dryRun: boolean) =>
      apiFetch<{
        run: RetentionPurgeRun;
        result?: RetentionRunResult;
        mode: string;
      }>("/api/admin/retention/purge", {
        method: "POST",
        body: JSON.stringify({ dryRun }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: retentionKeys.runs }),
  });
}
