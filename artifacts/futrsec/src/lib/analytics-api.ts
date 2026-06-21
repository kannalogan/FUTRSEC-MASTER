import { useQuery } from "@tanstack/react-query";
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

export interface TrackCount {
  track: string;
  count: number;
}

// ─── Student ─────────────────────────────────────────────────────────────────
export interface StudentAnalytics {
  learningHours: number;
  ftsScore: number;
  checkpointProgress: number;
  labCompletion: number;
  jobReadiness: number;
}

// ─── TPO ─────────────────────────────────────────────────────────────────────
export interface TpoAnalytics {
  placementRate: number;
  activeStudents: number;
  trackDistribution: TrackCount[];
  selectedStudents: number;
  interviewStats: { total: number; completed: number; scheduled: number };
}

// ─── Employer ────────────────────────────────────────────────────────────────
export interface EmployerAnalytics {
  applications: number;
  shortlisted: number;
  hired: number;
  trackDistribution: TrackCount[];
  avgScores: number;
}

// ─── Admin ───────────────────────────────────────────────────────────────────
export interface AdminAnalytics {
  totalPlacements: number;
  placementRate: number;
  avgPackage: number;
  highestPackage: number;
  trackWisePlacement: TrackCount[];
  collegeWisePlacement: { college: string; count: number }[];
  topColleges: { college: string; count: number }[];
  revenue: number;
  monthlyRevenue: { month: string; amount: number }[];
  subscriptions: number;
  trialConversions: number;
  dau: number;
  mau: number;
}

// ─── Keys ───────────────────────────────────────────────────────────────────
export const analyticsKeys = {
  student: ["analytics", "student"] as const,
  tpo: ["analytics", "tpo"] as const,
  employer: ["analytics", "employer"] as const,
  admin: ["analytics", "admin"] as const,
};

// ─── Queries ────────────────────────────────────────────────────────────────
export function useStudentAnalytics() {
  return useQuery({
    queryKey: analyticsKeys.student,
    queryFn: () => apiFetch<StudentAnalytics>("/api/analytics/student"),
  });
}

export function useTpoAnalytics() {
  return useQuery({
    queryKey: analyticsKeys.tpo,
    queryFn: () => apiFetch<TpoAnalytics>("/api/analytics/tpo"),
  });
}

export function useEmployerAnalytics() {
  return useQuery({
    queryKey: analyticsKeys.employer,
    queryFn: () => apiFetch<EmployerAnalytics>("/api/analytics/employer"),
  });
}

export function useAdminAnalytics() {
  return useQuery({
    queryKey: analyticsKeys.admin,
    queryFn: () => apiFetch<AdminAnalytics>("/api/analytics/admin"),
  });
}
