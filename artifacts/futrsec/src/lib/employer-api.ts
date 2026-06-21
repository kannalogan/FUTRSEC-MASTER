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
export interface EmployerProfile {
  id: number;
  email: string | null;
  fullName: string | null;
  isActive: boolean;
  companyName: string | null;
  industry: string | null;
  companySize: string | null;
  website: string | null;
  linkedinUrl: string | null;
  designation: string | null;
  logoUrl: string | null;
  isVerified: boolean;
  approvalStatus: "pending" | "approved" | "rejected";
  rejectionReason: string | null;
}

export interface EmployerOverview {
  totalJobs: number;
  activeJobs: number;
  applications: number;
  shortlisted: number;
  interviews: number;
  offers: number;
  hired: number;
}

export interface EmployerJob {
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
  applications: number;
}

export interface CreateJobBody {
  title: string;
  description: string;
  type?: string;
  location?: string;
  isRemote?: boolean;
  minSalary?: number | null;
  maxSalary?: number | null;
  experience?: string;
  requiredTracks?: string[];
  applicationDeadline?: string | null;
  skills?: string[];
  status?: string;
}

export interface Candidate {
  application: {
    id: number;
    status: string;
    coverLetter: string | null;
    resumeUrl: string | null;
    appliedAt: string;
  };
  student: {
    id: number;
    fullName: string | null;
    email: string | null;
    careerTrack: string | null;
  } | null;
  profile: Record<string, unknown> | null;
  ftsScore: number;
}

export interface EmployerInterview {
  id: number;
  applicationId: number;
  type: string;
  status: string;
  scheduledAt: string | null;
  meetingUrl: string | null;
  feedback: string | null;
  interviewerNotes: string | null;
  createdAt: string;
  updatedAt: string;
  student: { id: number; fullName: string | null; email: string | null } | null;
  job: { id: number; title: string } | null;
}

export interface EmployerOffer {
  id: number;
  applicationId: number;
  studentId: number;
  jobId: number;
  status: string;
  salary: number | null;
  joiningDate: string | null;
  offerLetterUrl: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  student: { id: number; fullName: string | null; email: string | null } | null;
  job: { id: number; title: string } | null;
}

// ─── Keys ───────────────────────────────────────────────────────────────────
export const employerKeys = {
  me: ["employer", "me"] as const,
  overview: ["employer", "overview"] as const,
  jobs: ["employer", "jobs"] as const,
  candidates: (jobId: number) => ["employer", "candidates", jobId] as const,
  interviews: ["employer", "interviews"] as const,
  offers: ["employer", "offers"] as const,
};

// ─── Queries ────────────────────────────────────────────────────────────────
export function useEmployerMe() {
  return useQuery({
    queryKey: employerKeys.me,
    queryFn: () => apiFetch<{ profile: EmployerProfile }>("/api/employer/me"),
  });
}
export function useEmployerOverview() {
  return useQuery({
    queryKey: employerKeys.overview,
    queryFn: () => apiFetch<EmployerOverview>("/api/employer/overview"),
  });
}
export function useEmployerJobs() {
  return useQuery({
    queryKey: employerKeys.jobs,
    queryFn: () => apiFetch<{ jobs: EmployerJob[] }>("/api/employer/jobs"),
  });
}
export function useJobCandidates(jobId: number | null) {
  return useQuery({
    queryKey: jobId ? employerKeys.candidates(jobId) : ["employer", "candidates", "none"],
    queryFn: () =>
      apiFetch<{ candidates: Candidate[] }>(
        `/api/employer/jobs/${jobId}/candidates`
      ),
    enabled: jobId != null,
  });
}
export function useEmployerInterviews() {
  return useQuery({
    queryKey: employerKeys.interviews,
    queryFn: () =>
      apiFetch<{ interviews: EmployerInterview[] }>("/api/employer/interviews"),
  });
}
export function useEmployerOffers() {
  return useQuery({
    queryKey: employerKeys.offers,
    queryFn: () => apiFetch<{ offers: EmployerOffer[] }>("/api/employer/offers"),
  });
}

// ─── Mutations ──────────────────────────────────────────────────────────────
export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateJobBody) =>
      apiFetch("/api/employer/jobs", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: employerKeys.jobs });
      qc.invalidateQueries({ queryKey: employerKeys.overview });
    },
  });
}
export function useUpdateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<CreateJobBody> }) =>
      apiFetch(`/api/employer/jobs/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: employerKeys.jobs });
      qc.invalidateQueries({ queryKey: employerKeys.overview });
    },
  });
}
export function useUpdateApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      reason,
    }: {
      id: number;
      status: string;
      reason?: string;
    }) =>
      apiFetch(`/api/employer/applications/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, reason }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employer", "candidates"] });
      qc.invalidateQueries({ queryKey: employerKeys.overview });
    },
  });
}
export function useCreateInterview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      applicationId: number;
      type?: string;
      scheduledAt?: string | null;
      meetingUrl?: string;
    }) =>
      apiFetch("/api/employer/interviews", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: employerKeys.interviews });
      qc.invalidateQueries({ queryKey: ["employer", "candidates"] });
      qc.invalidateQueries({ queryKey: employerKeys.overview });
    },
  });
}
export function useUpdateInterview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: number;
      body: {
        status?: string;
        scheduledAt?: string | null;
        meetingUrl?: string;
        feedback?: string;
        interviewerNotes?: string;
      };
    }) =>
      apiFetch(`/api/employer/interviews/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: employerKeys.interviews });
    },
  });
}
export function useCreateOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      applicationId: number;
      salary?: number | null;
      joiningDate?: string;
      offerLetterUrl?: string;
      expiresAt?: string | null;
    }) =>
      apiFetch("/api/employer/offers", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: employerKeys.offers });
      qc.invalidateQueries({ queryKey: ["employer", "candidates"] });
      qc.invalidateQueries({ queryKey: employerKeys.overview });
    },
  });
}
export function useUpdateOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: number;
      body: {
        status?: string;
        salary?: number | null;
        joiningDate?: string;
        offerLetterUrl?: string;
        expiresAt?: string | null;
      };
    }) =>
      apiFetch(`/api/employer/offers/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: employerKeys.offers });
      qc.invalidateQueries({ queryKey: employerKeys.overview });
    },
  });
}
