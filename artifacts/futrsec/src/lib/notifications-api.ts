import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

// ─── Types (mirror routes/notifications.ts + notificationsTable) ──────────────
export interface AppNotification {
  id: number;
  userId: number;
  role: string | null;
  title: string;
  message: string;
  type: string;
  channel: string;
  entityType: string | null;
  entityId: number | null;
  link: string | null;
  isRead: boolean;
  isArchived: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: AppNotification[];
  unreadCount: number;
}

// ─── Keys ───────────────────────────────────────────────────────────────────
export const notificationKeys = {
  all: ["notifications"] as const,
  list: (type?: string) => ["notifications", "list", type ?? ""] as const,
};

// ─── Queries ────────────────────────────────────────────────────────────────
export function useNotifications(type?: string) {
  const suffix = type ? `?type=${encodeURIComponent(type)}` : "";
  return useQuery({
    queryKey: notificationKeys.list(type),
    queryFn: () => apiFetch<NotificationsResponse>(`/api/notifications${suffix}`),
  });
}

/** Lightweight poll used to drive the sidebar unread badge. */
export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: [...notificationKeys.all, "unread"] as const,
    queryFn: async () => {
      const res = await apiFetch<NotificationsResponse>("/api/notifications");
      return res.unreadCount;
    },
    refetchInterval: 60_000,
  });
}

// ─── Mutations ──────────────────────────────────────────────────────────────
export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<AppNotification>(`/api/notifications/${id}/read`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ success: boolean }>("/api/notifications/read-all", { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useArchiveNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<AppNotification>(`/api/notifications/${id}/archive`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
