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

export const DRIVE_MODES = ["onsite", "remote", "hybrid"] as const;
export const ROUND_TYPES = [
  "aptitude",
  "gd",
  "technical",
  "hr",
  "managerial",
  "final",
] as const;
export const ROUND_TYPE_LABELS: Record<string, string> = {
  aptitude: "Aptitude",
  gd: "Group Discussion",
  technical: "Technical",
  hr: "HR",
  managerial: "Managerial",
  final: "Final",
};
export const RESULT_VALUES = [
  "pending",
  "pass",
  "fail",
  "selected",
  "rejected",
  "offer",
  "joined",
] as const;
export const PIPELINE_STAGES = [
  "invited",
  "shortlisted",
  "technical",
  "hr",
  "final",
  "offer",
  "joined",
  "rejected",
  "withdrawn",
] as const;
export const STAGE_LABELS: Record<string, string> = {
  invited: "Invited",
  shortlisted: "Shortlisted",
  technical: "Technical",
  hr: "HR",
  final: "Final",
  offer: "Offer",
  joined: "Joined",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

// ─── Types ──────────────────────────────────────────────────────────────────
export interface UserRef {
  id: number;
  fullName: string | null;
  email: string | null;
  careerTrack?: string | null;
}

export interface Drive {
  id: number;
  tpoId: number;
  companyId: number | null;
  companyName: string;
  role: string;
  careerTrack: string | null;
  packageDetails: string | null;
  mode: string;
  venue: string | null;
  meetingUrl: string | null;
  eligibilityCriteria: string | null;
  minFtsScore: number | null;
  status: string;
  driveDate: string | null;
  createdAt: string;
  updatedAt: string;
  invites: number;
  rounds: number;
}

export interface DriveRound {
  id: number;
  driveId: number;
  name: string;
  type: string;
  sequence: number;
  scheduledAt: string | null;
  durationMinutes: number;
  venue: string | null;
  meetingUrl: string | null;
  interviewerId: number | null;
  interviewerName: string | null;
  capacity: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface DriveDetail {
  drive: Drive;
  rounds: DriveRound[];
  counts: {
    invites: number;
    accepted: number;
    declined: number;
    schedules: number;
    rounds: number;
  };
}

export interface DriveInvite {
  id: number;
  driveId: number;
  studentId: number;
  stage: string;
  status: string;
  invitedBy: number;
  invitedAt: string;
  respondedAt: string | null;
  updatedAt: string;
  student: UserRef | null;
  college: string | null;
  ftsScore: number;
}

export interface Schedule {
  id: number;
  roundId: number;
  driveId: number;
  studentId: number;
  slotStart: string;
  slotEnd: string;
  venue: string | null;
  meetingUrl: string | null;
  status: string;
  result: string;
  attendance: string;
  score: number | null;
  feedback: string | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  student: UserRef | null;
  round: {
    id: number;
    name: string;
    type: string;
    interviewerId: number | null;
    interviewerName: string | null;
  } | null;
}

export interface DriveAnalytics {
  invited: number;
  accepted: number;
  declined: number;
  pending: number;
  attendanceRate: number;
  offers: number;
  joined: number;
  perRound: {
    roundId: number;
    name: string;
    type: string;
    sequence: number;
    scheduled: number;
    completed: number;
    passed: number;
    passRate: number;
  }[];
  funnel: { stage: string; count: number }[];
}

export interface OverviewAnalytics {
  drives: number;
  published: number;
  inProgress: number;
  completed: number;
  totalInvited: number;
  offers: number;
  placed: number;
  placementRate: number;
  byTrack: { track: string; drives: number; placed: number }[];
}

export interface StudentInvite {
  id: number;
  driveId: number;
  studentId: number;
  stage: string;
  status: string;
  invitedAt: string;
  respondedAt: string | null;
  updatedAt: string;
  drive: {
    id: number;
    companyName: string;
    role: string;
    careerTrack: string | null;
    packageDetails: string | null;
    mode: string;
    venue: string | null;
    meetingUrl: string | null;
    status: string;
    driveDate: string | null;
  } | null;
  rounds: {
    id: number;
    name: string;
    type: string;
    sequence: number;
    scheduledAt: string | null;
    durationMinutes: number;
  }[];
}

export interface StudentSchedule {
  id: number;
  roundId: number;
  driveId: number;
  studentId: number;
  slotStart: string;
  slotEnd: string;
  venue: string | null;
  meetingUrl: string | null;
  status: string;
  result: string;
  attendance: string;
  score: number | null;
  feedback: string | null;
  drive: { id: number; companyName: string; role: string } | null;
  round: { id: number; name: string; type: string } | null;
}

export interface Conflict {
  type: "student" | "interviewer";
  scheduleId: number;
  slotStart: string;
  slotEnd: string;
}

// ─── Request bodies ───────────────────────────────────────────────────────────
export interface DriveBody {
  companyId?: number | null;
  companyName: string;
  role: string;
  careerTrack?: string | null;
  packageDetails?: string | null;
  mode?: string;
  venue?: string | null;
  meetingUrl?: string | null;
  eligibilityCriteria?: string | null;
  minFtsScore?: number | null;
  driveDate?: string | null;
}

export interface RoundBody {
  name: string;
  type?: string;
  sequence?: number;
  scheduledAt?: string | null;
  durationMinutes?: number;
  venue?: string | null;
  meetingUrl?: string | null;
  interviewerId?: number | null;
  interviewerName?: string | null;
  capacity?: number | null;
  status?: string;
}

// ─── Keys ───────────────────────────────────────────────────────────────────
export const pdKeys = {
  drives: ["/api/placement-drives"] as const,
  drive: (id: number) => ["/api/placement-drives", id] as const,
  invites: (id: number) => ["/api/placement-drives", id, "invites"] as const,
  schedules: (id: number) => ["/api/placement-drives", id, "schedules"] as const,
  analytics: (id: number) => ["/api/placement-drives", id, "analytics"] as const,
  overview: ["/api/placement-drives/analytics/overview"] as const,
  myInvites: ["/api/placement-drives/my-invites"] as const,
  mySchedule: ["/api/placement-drives/my-schedule"] as const,
};

// ─── TPO Queries ──────────────────────────────────────────────────────────────
export function useDrives() {
  return useQuery({
    queryKey: pdKeys.drives,
    queryFn: () => apiFetch<{ drives: Drive[] }>("/api/placement-drives"),
  });
}
export function useDrive(id: number) {
  return useQuery({
    queryKey: pdKeys.drive(id),
    queryFn: () => apiFetch<DriveDetail>(`/api/placement-drives/${id}`),
    enabled: Number.isFinite(id) && id > 0,
  });
}
export function useDriveInvites(id: number) {
  return useQuery({
    queryKey: pdKeys.invites(id),
    queryFn: () =>
      apiFetch<{ invites: DriveInvite[] }>(`/api/placement-drives/${id}/invites`),
    enabled: Number.isFinite(id) && id > 0,
  });
}
export function useDriveSchedules(id: number) {
  return useQuery({
    queryKey: pdKeys.schedules(id),
    queryFn: () =>
      apiFetch<{ schedules: Schedule[] }>(`/api/placement-drives/${id}/schedules`),
    enabled: Number.isFinite(id) && id > 0,
  });
}
export function useDriveAnalytics(id: number) {
  return useQuery({
    queryKey: pdKeys.analytics(id),
    queryFn: () =>
      apiFetch<DriveAnalytics>(`/api/placement-drives/${id}/analytics`),
    enabled: Number.isFinite(id) && id > 0,
  });
}
export function useOverviewAnalytics() {
  return useQuery({
    queryKey: pdKeys.overview,
    queryFn: () =>
      apiFetch<OverviewAnalytics>("/api/placement-drives/analytics/overview"),
  });
}

export interface DirectoryStudent {
  id: number;
  email: string | null;
  fullName: string | null;
  careerTrack: string | null;
  college: string | null;
  ftsScore: number;
}
export function useTpoStudentDirectory() {
  return useQuery({
    queryKey: ["/api/tpo/students"] as const,
    queryFn: () =>
      apiFetch<{ students: DirectoryStudent[] }>("/api/tpo/students"),
  });
}

// ─── Student Queries ──────────────────────────────────────────────────────────
export function useMyInvites() {
  return useQuery({
    queryKey: pdKeys.myInvites,
    queryFn: () =>
      apiFetch<{ invites: StudentInvite[] }>("/api/placement-drives/my-invites"),
  });
}
export function useMySchedule() {
  return useQuery({
    queryKey: pdKeys.mySchedule,
    queryFn: () =>
      apiFetch<{ schedules: StudentSchedule[] }>(
        "/api/placement-drives/my-schedule"
      ),
  });
}

// ─── Drive Mutations ──────────────────────────────────────────────────────────
export function useCreateDrive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: DriveBody) =>
      apiFetch<{ drive: Drive }>("/api/placement-drives", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pdKeys.drives });
      qc.invalidateQueries({ queryKey: pdKeys.overview });
    },
  });
}
export function useUpdateDrive(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<DriveBody>) =>
      apiFetch(`/api/placement-drives/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pdKeys.drive(id) });
      qc.invalidateQueries({ queryKey: pdKeys.drives });
    },
  });
}
export function useDriveStatus(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (action: "publish" | "cancel") =>
      apiFetch(`/api/placement-drives/${id}/${action}`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pdKeys.drive(id) });
      qc.invalidateQueries({ queryKey: pdKeys.drives });
      qc.invalidateQueries({ queryKey: pdKeys.overview });
    },
  });
}

// ─── Round Mutations ──────────────────────────────────────────────────────────
export function useCreateRound(driveId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RoundBody) =>
      apiFetch(`/api/placement-drives/${driveId}/rounds`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: pdKeys.drive(driveId) }),
  });
}
export function useUpdateRound(driveId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ roundId, body }: { roundId: number; body: Partial<RoundBody> }) =>
      apiFetch(`/api/placement-drives/rounds/${roundId}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: pdKeys.drive(driveId) }),
  });
}
export function useDeleteRound(driveId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (roundId: number) =>
      apiFetch(`/api/placement-drives/rounds/${roundId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pdKeys.drive(driveId) });
      qc.invalidateQueries({ queryKey: pdKeys.schedules(driveId) });
    },
  });
}

// ─── Invite Mutations ─────────────────────────────────────────────────────────
export function useInviteStudents(driveId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (studentIds: number[]) =>
      apiFetch<{ invited: number }>(`/api/placement-drives/${driveId}/invites`, {
        method: "POST",
        body: JSON.stringify({ studentIds }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pdKeys.invites(driveId) });
      qc.invalidateQueries({ queryKey: pdKeys.drive(driveId) });
    },
  });
}
export function useAutoInvite(driveId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ invited: number; eligible: number }>(
        `/api/placement-drives/${driveId}/invites/auto`,
        { method: "POST" }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pdKeys.invites(driveId) });
      qc.invalidateQueries({ queryKey: pdKeys.drive(driveId) });
    },
  });
}
export function useUpdateInvite(driveId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      inviteId,
      body,
    }: {
      inviteId: number;
      body: { stage?: string; status?: string };
    }) =>
      apiFetch(`/api/placement-drives/invites/${inviteId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: pdKeys.invites(driveId) }),
  });
}

// ─── Schedule Mutations ───────────────────────────────────────────────────────
export interface CreateScheduleBody {
  studentId: number;
  slotStart: string;
  slotEnd: string;
  venue?: string | null;
  meetingUrl?: string | null;
}

export function useCreateSchedule(driveId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ roundId, body }: { roundId: number; body: CreateScheduleBody }) =>
      apiFetch<{ schedule: Schedule }>(
        `/api/placement-drives/rounds/${roundId}/schedules`,
        { method: "POST", body: JSON.stringify(body) }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pdKeys.schedules(driveId) });
      qc.invalidateQueries({ queryKey: pdKeys.drive(driveId) });
    },
  });
}
export function useReschedule(driveId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      scheduleId,
      body,
    }: {
      scheduleId: number;
      body: { slotStart: string; slotEnd: string; venue?: string | null; meetingUrl?: string | null };
    }) =>
      apiFetch<{ schedule: Schedule }>(
        `/api/placement-drives/schedules/${scheduleId}`,
        { method: "PATCH", body: JSON.stringify(body) }
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: pdKeys.schedules(driveId) }),
  });
}
export function useSetAttendance(driveId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      scheduleId,
      attendance,
    }: {
      scheduleId: number;
      attendance: "present" | "absent";
    }) =>
      apiFetch(`/api/placement-drives/schedules/${scheduleId}/attendance`, {
        method: "PATCH",
        body: JSON.stringify({ attendance }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pdKeys.schedules(driveId) });
      qc.invalidateQueries({ queryKey: pdKeys.analytics(driveId) });
    },
  });
}
export function useSetResult(driveId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      scheduleId,
      body,
    }: {
      scheduleId: number;
      body: { result: string; score?: number | null; feedback?: string | null };
    }) =>
      apiFetch(`/api/placement-drives/schedules/${scheduleId}/result`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pdKeys.schedules(driveId) });
      qc.invalidateQueries({ queryKey: pdKeys.analytics(driveId) });
      qc.invalidateQueries({ queryKey: pdKeys.invites(driveId) });
    },
  });
}
export function useCancelSchedule(driveId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (scheduleId: number) =>
      apiFetch(`/api/placement-drives/schedules/${scheduleId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pdKeys.schedules(driveId) });
      qc.invalidateQueries({ queryKey: pdKeys.drive(driveId) });
    },
  });
}

// ─── Student Mutations ────────────────────────────────────────────────────────
export function useRespondInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      inviteId,
      action,
    }: {
      inviteId: number;
      action: "accept" | "decline";
    }) =>
      apiFetch(`/api/placement-drives/invites/${inviteId}/respond`, {
        method: "POST",
        body: JSON.stringify({ action }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pdKeys.myInvites });
      qc.invalidateQueries({ queryKey: pdKeys.mySchedule });
    },
  });
}
