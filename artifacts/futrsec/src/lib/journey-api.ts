import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export const JOURNEY_TRACKS = ["soc", "vapt", "grc"] as const;
export type JourneyTrack = (typeof JOURNEY_TRACKS)[number];

export const JOURNEY_TRACK_LABELS: Record<string, string> = {
  soc: "SOC Analyst",
  vapt: "VAPT Professional",
  grc: "GRC Specialist",
};

export const JOURNEY_ITEM_TYPES = [
  "course",
  "assessment",
  "lab",
  "assignment",
  "resource",
  "declaration",
  "mentor_review",
  "mock_interview",
  "certificate",
] as const;
export type JourneyItemType = (typeof JOURNEY_ITEM_TYPES)[number];

export const JOURNEY_ITEM_LABELS: Record<JourneyItemType, string> = {
  course: "Course",
  assessment: "Assessment",
  lab: "Lab",
  assignment: "Assignment",
  resource: "Resource",
  declaration: "Declaration",
  mentor_review: "Mentor Review",
  mock_interview: "Mock Interview",
  certificate: "Certificate",
};

/** Item types that require a refId pointing to an existing entity. */
export const ITEM_REQUIRES_REF: Record<JourneyItemType, boolean> = {
  course: true,
  assessment: true,
  lab: true,
  assignment: true,
  resource: true,
  declaration: true,
  mentor_review: false,
  mock_interview: true,
  certificate: true,
};

/** Human hint describing what entity an item's refId points to. */
export const ITEM_REF_HINT: Record<JourneyItemType, string> = {
  course: "Learning module ID",
  assessment: "Assessment ID",
  lab: "Lab ID",
  assignment: "Mentor task ID (type: assignment)",
  resource: "Mentor task ID (type: resource)",
  declaration: "Mentor task ID (type: declaration)",
  mentor_review: "No reference required",
  mock_interview: "Mock interview template ID",
  certificate: "Certificate template ID",
};

export type JourneyStatus = "draft" | "published" | "archived";

export interface Journey {
  id: number;
  careerTrack: string;
  title: string;
  description: string | null;
  status: JourneyStatus;
  totalDays: number;
  createdBy: number | null;
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JourneyDayItem {
  id: number;
  dayId: number;
  journeyId: number;
  type: JourneyItemType;
  refId: number | null;
  title: string;
  description: string | null;
  order: number;
  isRequired: boolean;
  xpReward: number;
}

export interface JourneyDay {
  id: number;
  journeyId: number;
  offset: number;
  title: string;
  description: string | null;
  items: JourneyDayItem[];
}

export interface JourneyTree extends Journey {
  days: JourneyDay[];
}

// ─── Admin / Mentor builder ───────────────────────────────────────────────────
export const journeyKeys = {
  all: ["journeys"] as const,
  detail: (id: number) => ["journeys", id] as const,
};

export function useJourneys() {
  return useQuery({
    queryKey: journeyKeys.all,
    queryFn: () => apiFetch<{ journeys: Journey[] }>("/api/journeys"),
  });
}

export function useJourney(id: number | null) {
  return useQuery({
    queryKey: id ? journeyKeys.detail(id) : ["journeys", "none"],
    queryFn: () => apiFetch<{ journey: JourneyTree }>(`/api/journeys/${id}`),
    enabled: id != null,
  });
}

export function useCreateJourney() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { careerTrack: string; title: string; description?: string }) =>
      apiFetch<{ journey: Journey }>("/api/journeys", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: journeyKeys.all }),
  });
}

export function useUpdateJourney() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; title?: string; description?: string | null }) =>
      apiFetch(`/api/journeys/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: journeyKeys.all });
      qc.invalidateQueries({ queryKey: journeyKeys.detail(v.id) });
    },
  });
}

export function useDeleteJourney() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/api/journeys/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: journeyKeys.all }),
  });
}

export function usePublishJourney() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/api/journeys/${id}/publish`, { method: "POST" }),
    onSuccess: (_r, id) => {
      qc.invalidateQueries({ queryKey: journeyKeys.all });
      qc.invalidateQueries({ queryKey: journeyKeys.detail(id) });
    },
  });
}

export function useArchiveJourney() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/api/journeys/${id}/archive`, { method: "POST" }),
    onSuccess: (_r, id) => {
      qc.invalidateQueries({ queryKey: journeyKeys.all });
      qc.invalidateQueries({ queryKey: journeyKeys.detail(id) });
    },
  });
}

export function useCreateDay(journeyId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { offset: number; title: string; description?: string }) =>
      apiFetch(`/api/journeys/${journeyId}/days`, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      // Adding a day bumps the journey's totalDays, which the list shows.
      qc.invalidateQueries({ queryKey: journeyKeys.all });
      qc.invalidateQueries({ queryKey: journeyKeys.detail(journeyId) });
    },
  });
}

export function useUpdateDay(journeyId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dayId, ...body }: { dayId: number; offset?: number; title?: string; description?: string | null }) =>
      apiFetch(`/api/journeys/days/${dayId}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: journeyKeys.detail(journeyId) }),
  });
}

export function useDeleteDay(journeyId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dayId: number) => apiFetch(`/api/journeys/days/${dayId}`, { method: "DELETE" }),
    onSuccess: () => {
      // Removing a day lowers totalDays, which the list shows.
      qc.invalidateQueries({ queryKey: journeyKeys.all });
      qc.invalidateQueries({ queryKey: journeyKeys.detail(journeyId) });
    },
  });
}

export function useCreateItem(journeyId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      dayId,
      ...body
    }: {
      dayId: number;
      type: JourneyItemType;
      refId?: number | null;
      title?: string;
      description?: string;
      isRequired?: boolean;
      xpReward?: number;
    }) => apiFetch(`/api/journeys/days/${dayId}/items`, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: journeyKeys.detail(journeyId) }),
  });
}

export function useUpdateItem(journeyId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemId,
      ...body
    }: {
      itemId: number;
      title?: string;
      description?: string | null;
      isRequired?: boolean;
      xpReward?: number;
      refId?: number | null;
    }) => apiFetch(`/api/journeys/items/${itemId}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: journeyKeys.detail(journeyId) }),
  });
}

export function useDeleteItem(journeyId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: number) => apiFetch(`/api/journeys/items/${itemId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: journeyKeys.detail(journeyId) }),
  });
}

export function useReorderItems(journeyId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dayId, orderedItemIds }: { dayId: number; orderedItemIds: number[] }) =>
      apiFetch("/api/journeys/items/reorder", {
        method: "POST",
        body: JSON.stringify({ dayId, orderedItemIds }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: journeyKeys.detail(journeyId) }),
  });
}

// ─── Student view ─────────────────────────────────────────────────────────────
export interface StudentJourneyItem {
  id: number;
  type: JourneyItemType;
  refId: number | null;
  title: string;
  description: string | null;
  order: number;
  isRequired: boolean;
  xpReward: number;
  completed: boolean;
}

export interface StudentJourneyDay {
  id: number;
  offset: number;
  dayNumber: number;
  title: string;
  description: string | null;
  unlocked: boolean;
  items: StudentJourneyItem[];
}

export interface StudentJourney {
  id: number;
  title: string;
  description: string | null;
  careerTrack: string;
  totalDays: number;
  startedAt: string;
  status: string;
  daysElapsed: number;
  lockedDayCount: number;
  nextUnlockInDays: number | null;
  days: StudentJourneyDay[];
}

export interface JourneyBadge {
  id: string;
  label: string;
  earned: boolean;
}

export interface JourneyProgress {
  overallPercent: number;
  xp: number;
  completedItems: number;
  totalRequiredItems: number;
  completedDays: number;
  totalDays: number;
  streak: number;
  careerReadiness: number;
  status: string;
  badges: JourneyBadge[];
}

export const studentJourneyKeys = {
  journey: ["student", "journey"] as const,
  progress: ["student", "journey", "progress"] as const,
};

export function useStudentJourney() {
  return useQuery({
    queryKey: studentJourneyKeys.journey,
    queryFn: () => apiFetch<{ journey: StudentJourney | null }>("/api/student/journey"),
  });
}

export function useStudentJourneyProgress() {
  return useQuery({
    queryKey: studentJourneyKeys.progress,
    queryFn: () => apiFetch<{ progress: JourneyProgress | null }>("/api/student/journey/progress"),
  });
}

export function useCompleteJourneyItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: number) =>
      apiFetch<{ ok: boolean; awardedXp: number; dayComplete: boolean; journeyComplete: boolean }>(
        `/api/student/journey/items/${itemId}/complete`,
        { method: "POST" }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studentJourneyKeys.journey });
      qc.invalidateQueries({ queryKey: studentJourneyKeys.progress });
    },
  });
}
