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

// ─── Types (mirror routes/campus.ts serialized responses) ────────────────────
export interface CampusDrive {
  id: number;
  name: string;
  companyName: string;
  careerTrack: string;
  eligibleColleges: string[];
  eligibleYears: string[];
  eligibilityCriteria: string | null;
  packageDetails: string | null;
  mode: string;
  deadline: string | null;
  status: string;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampusRegistration {
  id: number;
  driveId: number;
  studentId: number;
  status: string;
  attended: boolean;
  result: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminDrive extends CampusDrive {
  registrations: number;
}

export interface StudentDrive extends CampusDrive {
  registered: boolean;
  registration: CampusRegistration | null;
}

export interface MyRegistration extends CampusRegistration {
  drive: CampusDrive | null;
}

export interface DriveRegistrationStudent {
  id: number;
  fullName: string | null;
  email: string | null;
  careerTrack: string | null;
}

export interface EnrichedRegistration extends CampusRegistration {
  student: DriveRegistrationStudent | null;
}

export interface DriveRegistrationsResponse {
  drive: CampusDrive;
  all: EnrichedRegistration[];
  registered: EnrichedRegistration[];
  selected: EnrichedRegistration[];
  rejected: EnrichedRegistration[];
}

export interface CampusReport {
  drive: CampusDrive;
  registered: number;
  attended: number;
  shortlisted: number;
  selected: number;
  rejected: number;
}

export interface CreateDriveBody {
  name: string;
  companyName: string;
  careerTrack: string;
  eligibleColleges?: string[];
  eligibleYears?: string[];
  eligibilityCriteria?: string | null;
  packageDetails?: string | null;
  mode?: string;
  deadline?: string | null;
  status?: string;
}

export interface RegistrationResultBody {
  attended?: boolean;
  result?: string | null;
  notes?: string | null;
  status?: string;
}

// ─── Keys ───────────────────────────────────────────────────────────────────
export const campusKeys = {
  all: ["campus"] as const,
  adminDrives: (track?: string) => ["campus", "admin", "drives", track ?? ""] as const,
  studentDrives: ["campus", "student", "drives"] as const,
  myRegistrations: ["campus", "my-registrations"] as const,
  driveRegistrations: (id: number) => ["campus", "drive", id, "registrations"] as const,
  adminDriveRegistrations: (id: number) =>
    ["campus", "admin", "drive", id, "registrations"] as const,
  reports: ["campus", "reports"] as const,
};

// ─── Admin queries ───────────────────────────────────────────────────────────
export function useAdminDrives(track?: string) {
  const suffix = track ? `?track=${encodeURIComponent(track)}` : "";
  return useQuery({
    queryKey: campusKeys.adminDrives(track),
    queryFn: () => apiFetch<{ drives: AdminDrive[] }>(`/api/campus/drives${suffix}`),
  });
}

export function useAdminDriveRegistrations(driveId: number, enabled = true) {
  return useQuery({
    queryKey: campusKeys.adminDriveRegistrations(driveId),
    queryFn: () =>
      apiFetch<DriveRegistrationsResponse>(
        `/api/campus/admin/drives/${driveId}/registrations`,
      ),
    enabled: enabled && Number.isFinite(driveId) && driveId > 0,
  });
}

// ─── Student queries ─────────────────────────────────────────────────────────
export function useStudentDrives() {
  return useQuery({
    queryKey: campusKeys.studentDrives,
    queryFn: () => apiFetch<{ drives: StudentDrive[] }>("/api/campus/drives"),
  });
}

export function useMyDriveRegistrations() {
  return useQuery({
    queryKey: campusKeys.myRegistrations,
    queryFn: () => apiFetch<{ registrations: MyRegistration[] }>("/api/campus/my-registrations"),
  });
}

// ─── TPO queries ─────────────────────────────────────────────────────────────
export function useDriveRegistrations(driveId: number, enabled = true) {
  return useQuery({
    queryKey: campusKeys.driveRegistrations(driveId),
    queryFn: () =>
      apiFetch<DriveRegistrationsResponse>(`/api/campus/drives/${driveId}/registrations`),
    enabled: enabled && Number.isFinite(driveId) && driveId > 0,
  });
}

export function useCampusReports() {
  return useQuery({
    queryKey: campusKeys.reports,
    queryFn: () => apiFetch<{ reports: CampusReport[] }>("/api/campus/reports"),
  });
}

// ─── Mutations ──────────────────────────────────────────────────────────────
export function useCreateDrive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateDriveBody) =>
      apiFetch<{ drive: CampusDrive }>("/api/campus/drives", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campus", "admin", "drives"] });
    },
  });
}

export function useUpdateDrive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<CreateDriveBody> }) =>
      apiFetch<{ drive: CampusDrive }>(`/api/campus/drives/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campus", "admin", "drives"] });
    },
  });
}

export function useSetRegistrationResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      driveId,
      registrationId,
      body,
    }: {
      driveId: number;
      registrationId: number;
      body: RegistrationResultBody;
    }) =>
      apiFetch<{ registration: CampusRegistration }>(
        `/api/campus/drives/${driveId}/registrations/${registrationId}/result`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: campusKeys.driveRegistrations(vars.driveId) });
      qc.invalidateQueries({ queryKey: campusKeys.adminDriveRegistrations(vars.driveId) });
      qc.invalidateQueries({ queryKey: ["campus", "admin", "drives"] });
    },
  });
}

export function useRegisterForDrive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (driveId: number) =>
      apiFetch<{ registration: CampusRegistration }>(`/api/campus/drives/${driveId}/register`, {
        method: "POST",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: campusKeys.studentDrives });
      qc.invalidateQueries({ queryKey: campusKeys.myRegistrations });
    },
  });
}
