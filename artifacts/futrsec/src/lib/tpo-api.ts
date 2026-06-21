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
export interface TpoProfile {
  id: number;
  email: string | null;
  fullName: string | null;
  isActive: boolean;
  institution: string | null;
  institutionCode: string | null;
  designation: string | null;
  approvalStatus: "pending" | "approved" | "rejected";
  rejectionReason: string | null;
}

export interface TpoOverview {
  totalStudents: number;
  byTrack: { soc: number; vapt: number; grc: number };
  applications: number;
  interviews: number;
  offers: number;
  placed: number;
  events: number;
}

export interface TpoStudent {
  id: number;
  email: string | null;
  fullName: string | null;
  careerTrack: string | null;
  isActive: boolean;
  createdAt: string;
  college: string | null;
  graduationYear: number | null;
  city: string | null;
  resumeUrl: string | null;
  ftsScore: number;
}

export interface TpoAnalytics {
  trackDistribution: { track: string; count: number }[];
  ftsBuckets: { label: string; count: number }[];
  avgFts: number;
}

export interface TpoPlacements {
  funnel: {
    applied: number;
    shortlisted: number;
    interviewed: number;
    offered: number;
    placed: number;
  };
  offers: {
    id: number;
    status: string;
    salary: number | null;
    joiningDate: string | null;
    createdAt: string;
    student: { id: number; fullName: string | null; email: string | null } | null;
    job: { id: number; title: string } | null;
  }[];
}

export interface TpoTrackReport {
  track: string;
  students: number;
  applications: number;
  offers: number;
  placed: number;
  avgFts: number;
}

export interface TpoEvent {
  id: number;
  tpoId: number;
  title: string;
  description: string | null;
  type: string;
  location: string | null;
  isOnline: boolean;
  meetingUrl: string | null;
  careerTrack: string | null;
  startsAt: string | null;
  endsAt: string | null;
  maxAttendees: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  registrations: number;
}

export interface CreateEventBody {
  title: string;
  description?: string;
  type?: string;
  location?: string;
  isOnline?: boolean;
  meetingUrl?: string;
  careerTrack?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  maxAttendees?: number | null;
  status?: string;
}

// ─── Keys ───────────────────────────────────────────────────────────────────
export const tpoKeys = {
  me: ["tpo", "me"] as const,
  overview: ["tpo", "overview"] as const,
  students: ["tpo", "students"] as const,
  analytics: ["tpo", "analytics"] as const,
  placements: ["tpo", "placements"] as const,
  reports: ["tpo", "reports"] as const,
  events: ["tpo", "events"] as const,
};

// ─── Queries ────────────────────────────────────────────────────────────────
export function useTpoMe() {
  return useQuery({
    queryKey: tpoKeys.me,
    queryFn: () => apiFetch<{ profile: TpoProfile }>("/api/tpo/me"),
  });
}
export function useTpoOverview() {
  return useQuery({
    queryKey: tpoKeys.overview,
    queryFn: () => apiFetch<TpoOverview>("/api/tpo/overview"),
  });
}
export function useTpoStudents(params?: { track?: string; search?: string }) {
  const qs = new URLSearchParams();
  if (params?.track) qs.set("track", params.track);
  if (params?.search) qs.set("search", params.search);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return useQuery({
    queryKey: [...tpoKeys.students, params?.track ?? "", params?.search ?? ""],
    queryFn: () =>
      apiFetch<{ students: TpoStudent[] }>(`/api/tpo/students${suffix}`),
  });
}
export function useTpoAnalytics() {
  return useQuery({
    queryKey: tpoKeys.analytics,
    queryFn: () => apiFetch<TpoAnalytics>("/api/tpo/analytics"),
  });
}
export function useTpoPlacements() {
  return useQuery({
    queryKey: tpoKeys.placements,
    queryFn: () => apiFetch<TpoPlacements>("/api/tpo/placements"),
  });
}
export function useTpoTrackReports() {
  return useQuery({
    queryKey: tpoKeys.reports,
    queryFn: () =>
      apiFetch<{ rows: TpoTrackReport[] }>("/api/tpo/reports/tracks"),
  });
}
export function useTpoEvents() {
  return useQuery({
    queryKey: tpoKeys.events,
    queryFn: () => apiFetch<{ events: TpoEvent[] }>("/api/tpo/events"),
  });
}

// ─── Mutations ──────────────────────────────────────────────────────────────
export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateEventBody) =>
      apiFetch("/api/tpo/events", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tpoKeys.events });
      qc.invalidateQueries({ queryKey: tpoKeys.overview });
    },
  });
}
export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<CreateEventBody> }) =>
      apiFetch(`/api/tpo/events/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tpoKeys.events });
    },
  });
}
export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/tpo/events/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tpoKeys.events });
      qc.invalidateQueries({ queryKey: tpoKeys.overview });
    },
  });
}
