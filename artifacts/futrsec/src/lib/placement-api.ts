import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

// ─── Types (mirror routes/placement.ts responses) ────────────────────────────
export const PLACEMENT_STATUSES = [
  "applied",
  "screening",
  "shortlisted",
  "assessment",
  "interview_scheduled",
  "interviewing",
  "selected",
  "offer_released",
  "offer_accepted",
  "offer_rejected",
  "rejected",
  "hired",
] as const;
export type PlacementStatus = (typeof PLACEMENT_STATUSES)[number];

export const STATUS_LABELS: Record<string, string> = {
  applied: "Applied",
  screening: "Screening",
  shortlisted: "Shortlisted",
  assessment: "Assessment",
  interview_scheduled: "Interview Scheduled",
  interviewing: "Interviewing",
  selected: "Selected",
  offer_released: "Offer Released",
  offer_accepted: "Offer Accepted",
  offer_rejected: "Offer Rejected",
  rejected: "Rejected",
  hired: "Hired",
};

export const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  applied: { bg: "#EFF6FF", text: "#2563EB" },
  screening: { bg: "#EFF6FF", text: "#2563EB" },
  shortlisted: { bg: "#F5F3FF", text: "#7C3AED" },
  assessment: { bg: "#F5F3FF", text: "#7C3AED" },
  interview_scheduled: { bg: "#FFF7ED", text: "#F97316" },
  interviewing: { bg: "#FFF7ED", text: "#F97316" },
  selected: { bg: "#F0FDF4", text: "#10B981" },
  offer_released: { bg: "#F0FDF4", text: "#10B981" },
  offer_accepted: { bg: "#F0FDF4", text: "#059669" },
  offer_rejected: { bg: "#FEF2F2", text: "#EF4444" },
  rejected: { bg: "#FEF2F2", text: "#EF4444" },
  hired: { bg: "#ECFDF5", text: "#059669" },
};

export interface JobRef {
  id: number;
  title: string;
}

export interface PlacementRecord {
  id: number;
  jobId: number | null;
  applicationId: number | null;
  offerId: number | null;
  companyName: string | null;
  careerTrack: string | null;
  packageAmount: number | null;
  status: string;
  placedAt: string;
  job: JobRef | null;
}

export interface PlacementOffer {
  id: number;
  applicationId: number | null;
  jobId: number;
  salary: number | null;
  joiningDate: string | null;
  status: string;
  expiresAt?: string | null;
  createdAt: string;
  job: JobRef | null;
}

export interface PlacementStage {
  applicationId: number;
  jobId: number;
  status: string;
  appliedAt: string;
  job: JobRef | null;
}

export interface PlacementMe {
  isPlaced: boolean;
  placements: PlacementRecord[];
  offers: PlacementOffer[];
  stages: PlacementStage[];
}

export interface TimelineEntry {
  id: number;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  changedBy: number | null;
  createdAt: string;
}

export interface PlacementTimeline {
  applicationId: number;
  currentStatus: string;
  timeline: TimelineEntry[];
}

// ─── Keys ───────────────────────────────────────────────────────────────────
export const placementKeys = {
  all: ["placement"] as const,
  me: ["placement", "me"] as const,
  timeline: (id: number) => ["placement", "timeline", id] as const,
};

// ─── Queries ────────────────────────────────────────────────────────────────
export function usePlacementMe() {
  return useQuery({
    queryKey: placementKeys.me,
    queryFn: () => apiFetch<PlacementMe>("/api/placement/me"),
  });
}

export function usePlacementTimeline(applicationId: number | null) {
  return useQuery({
    queryKey: placementKeys.timeline(applicationId ?? 0),
    queryFn: () =>
      apiFetch<PlacementTimeline>(
        `/api/placement/applications/${applicationId}/timeline`
      ),
    enabled: applicationId != null,
  });
}
