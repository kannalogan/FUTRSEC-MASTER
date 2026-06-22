import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

// ─── Constants ────────────────────────────────────────────────────────────────
export const TICKET_CATEGORIES = [
  "technical",
  "billing",
  "account",
  "content",
  "placement",
  "other",
] as const;
export const TICKET_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export const TICKET_STATUSES = [
  "open",
  "in_progress",
  "pending",
  "resolved",
  "closed",
] as const;

export type TicketCategory = (typeof TICKET_CATEGORIES)[number];
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const CATEGORY_LABELS: Record<string, string> = {
  technical: "Technical",
  billing: "Billing",
  account: "Account",
  content: "Content",
  placement: "Placement",
  other: "Other",
};
export const PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};
export const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  pending: "Pending",
  resolved: "Resolved",
  closed: "Closed",
};

// ─── Types ────────────────────────────────────────────────────────────────────
export interface TicketAttachment {
  name: string;
  url: string;
}

export interface SupportTicket {
  id: number;
  ticketUid: string;
  category: string;
  priority: string;
  subject: string;
  description: string;
  status: string;
  attachments: TicketAttachment[];
  createdBy: number;
  assignedTo: number | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

export interface TicketListItem extends SupportTicket {
  createdByName: string | null;
  createdByEmail: string | null;
  assignedToName: string | null;
  replyCount: number;
}

export interface TicketDetail extends SupportTicket {
  createdByName: string | null;
  createdByEmail: string | null;
  assignedToName: string | null;
}

export interface TicketReply {
  id: number;
  ticketId: number;
  authorId: number;
  message: string;
  attachments: TicketAttachment[];
  authorName: string | null;
  createdAt: string;
}

export interface TicketDetailResponse {
  ticket: TicketDetail;
  replies: TicketReply[];
}

export interface TicketStats {
  total: number;
  open: number;
  resolved: number;
  avgResolutionHours: number | null;
  byStatus: { status: string; count: number }[];
  byPriority: { priority: string; count: number }[];
  byCategory: { category: string; count: number }[];
}

export interface Assignee {
  id: number;
  fullName: string | null;
  email: string | null;
  role: string;
}

// ─── Request bodies ───────────────────────────────────────────────────────────
export interface CreateTicketBody {
  category: TicketCategory;
  priority: TicketPriority;
  subject: string;
  description: string;
  attachments?: TicketAttachment[];
}

export interface CreateReplyBody {
  message: string;
  attachments?: TicketAttachment[];
}

export interface TicketFilters {
  status?: string;
  priority?: string;
  category?: string;
  assignedTo?: number | null;
  q?: string;
}

// ─── Keys ─────────────────────────────────────────────────────────────────────
export const supportKeys = {
  tickets: (filters?: TicketFilters) =>
    ["/api/support/tickets", filters ?? {}] as const,
  ticket: (uid: string) => ["/api/support/tickets", uid] as const,
  stats: ["/api/support/tickets/stats/summary"] as const,
  assignees: ["/api/support/assignees"] as const,
};

function buildQuery(filters?: TicketFilters): string {
  if (!filters) return "";
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.category) params.set("category", filters.category);
  if (filters.assignedTo != null)
    params.set("assignedTo", String(filters.assignedTo));
  if (filters.q && filters.q.trim()) params.set("q", filters.q.trim());
  const s = params.toString();
  return s ? `?${s}` : "";
}

// ─── Queries ──────────────────────────────────────────────────────────────────
export function useTickets(filters?: TicketFilters) {
  return useQuery({
    queryKey: supportKeys.tickets(filters),
    queryFn: () =>
      apiFetch<{ tickets: TicketListItem[] }>(
        `/api/support/tickets${buildQuery(filters)}`
      ),
  });
}

export function useTicket(uid: string) {
  return useQuery({
    queryKey: supportKeys.ticket(uid),
    queryFn: () =>
      apiFetch<TicketDetailResponse>(`/api/support/tickets/${uid}`),
    enabled: !!uid,
  });
}

export function useTicketStats() {
  return useQuery({
    queryKey: supportKeys.stats,
    queryFn: () =>
      apiFetch<TicketStats>("/api/support/tickets/stats/summary"),
  });
}

export function useAssignees() {
  return useQuery({
    queryKey: supportKeys.assignees,
    queryFn: () =>
      apiFetch<{ assignees: Assignee[] }>("/api/support/assignees"),
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────
export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTicketBody) =>
      apiFetch<{ ticket: SupportTicket }>("/api/support/tickets", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/support/tickets"] });
      qc.invalidateQueries({ queryKey: supportKeys.stats });
    },
  });
}

export function useCreateReply(uid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateReplyBody) =>
      apiFetch<{ reply: TicketReply }>(`/api/support/tickets/${uid}/replies`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: supportKeys.ticket(uid) });
      qc.invalidateQueries({ queryKey: ["/api/support/tickets"] });
    },
  });
}

export function useUpdateTicketStatus(uid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: TicketStatus) =>
      apiFetch<{ ticket: SupportTicket }>(`/api/support/tickets/${uid}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: supportKeys.ticket(uid) });
      qc.invalidateQueries({ queryKey: ["/api/support/tickets"] });
      qc.invalidateQueries({ queryKey: supportKeys.stats });
    },
  });
}

export function useAssignTicket(uid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assignedTo: number | null) =>
      apiFetch<{ ticket: SupportTicket }>(`/api/support/tickets/${uid}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ assignedTo }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: supportKeys.ticket(uid) });
      qc.invalidateQueries({ queryKey: ["/api/support/tickets"] });
      qc.invalidateQueries({ queryKey: supportKeys.stats });
    },
  });
}

// ─── UI helpers ───────────────────────────────────────────────────────────────
export function statusBadgeClass(status: string): string {
  switch (status) {
    case "open":
      return "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30";
    case "in_progress":
      return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
    case "pending":
      return "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30";
    case "resolved":
      return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
    case "closed":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function priorityBadgeClass(priority: string): string {
  switch (priority) {
    case "low":
      return "bg-muted text-muted-foreground border-border";
    case "medium":
      return "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30";
    case "high":
      return "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30";
    case "urgent":
      return "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}
