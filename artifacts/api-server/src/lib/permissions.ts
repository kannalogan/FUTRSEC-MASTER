import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../middlewares/auth";

export const Permission = {
  TRACKS_VIEW: "tracks:view",
  TRACKS_MANAGE: "tracks:manage",

  USERS_VIEW_SELF: "users:view_self",
  USERS_VIEW_ALL: "users:view_all",
  USERS_MANAGE: "users:manage",

  ASSESSMENTS_TAKE: "assessments:take",
  ASSESSMENTS_MANAGE: "assessments:manage",
  ASSESSMENTS_VIEW_RESULTS: "assessments:view_results",

  LABS_ACCESS: "labs:access",
  LABS_MANAGE: "labs:manage",

  JOBS_VIEW: "jobs:view",
  JOBS_APPLY: "jobs:apply",
  JOBS_POST: "jobs:post",
  JOBS_MANAGE: "jobs:manage",

  MENTORSHIP_REQUEST: "mentorship:request",
  MENTORSHIP_PROVIDE: "mentorship:provide",
  MENTORSHIP_MANAGE: "mentorship:manage",

  PLATFORM_STATS_VIEW: "platform:stats:view",

  DPDP_OWN: "dpdp:own",
  DPDP_MANAGE: "dpdp:manage",
  AUDIT_LOGS_VIEW: "audit_logs:view",

  BROADCASTS_SEND: "broadcasts:send",
  BROADCASTS_VIEW: "broadcasts:view",

  TPO_VIEW_STUDENTS: "tpo:view_students",
  TPO_MANAGE_PLACEMENTS: "tpo:manage_placements",

  MENTOR_DASHBOARD: "mentor:dashboard",
  MENTOR_VIEW_STUDENTS: "mentor:view_students",
  MENTOR_ANALYTICS_VIEW: "mentor:analytics:view",
  MENTOR_TASKS_MANAGE: "mentor:tasks:manage",
  MENTORS_MANAGE: "mentors:manage",

  ADMIN_ALL: "admin:all",
} as const;

export type PermissionKey = (typeof Permission)[keyof typeof Permission];

const STUDENT_PERMISSIONS: Set<PermissionKey> = new Set([
  Permission.TRACKS_VIEW,
  Permission.USERS_VIEW_SELF,
  Permission.ASSESSMENTS_TAKE,
  Permission.ASSESSMENTS_VIEW_RESULTS,
  Permission.LABS_ACCESS,
  Permission.JOBS_VIEW,
  Permission.JOBS_APPLY,
  Permission.MENTORSHIP_REQUEST,
  Permission.PLATFORM_STATS_VIEW,
  Permission.DPDP_OWN,
  Permission.BROADCASTS_VIEW,
]);

const MENTOR_PERMISSIONS: Set<PermissionKey> = new Set([
  Permission.TRACKS_VIEW,
  Permission.USERS_VIEW_SELF,
  Permission.ASSESSMENTS_VIEW_RESULTS,
  Permission.LABS_ACCESS,
  Permission.JOBS_VIEW,
  Permission.MENTORSHIP_PROVIDE,
  Permission.MENTORSHIP_REQUEST,
  Permission.PLATFORM_STATS_VIEW,
  Permission.DPDP_OWN,
  Permission.BROADCASTS_VIEW,
  Permission.BROADCASTS_SEND,
  Permission.AUDIT_LOGS_VIEW,
  Permission.MENTOR_DASHBOARD,
  Permission.MENTOR_VIEW_STUDENTS,
  Permission.MENTOR_ANALYTICS_VIEW,
  Permission.MENTOR_TASKS_MANAGE,
]);

const TPO_PERMISSIONS: Set<PermissionKey> = new Set([
  Permission.TRACKS_VIEW,
  Permission.USERS_VIEW_SELF,
  Permission.USERS_VIEW_ALL,
  Permission.ASSESSMENTS_VIEW_RESULTS,
  Permission.JOBS_VIEW,
  Permission.JOBS_MANAGE,
  Permission.MENTORSHIP_MANAGE,
  Permission.PLATFORM_STATS_VIEW,
  Permission.DPDP_OWN,
  Permission.BROADCASTS_SEND,
  Permission.BROADCASTS_VIEW,
  Permission.TPO_VIEW_STUDENTS,
  Permission.TPO_MANAGE_PLACEMENTS,
]);

const EMPLOYER_PERMISSIONS: Set<PermissionKey> = new Set([
  Permission.TRACKS_VIEW,
  Permission.USERS_VIEW_SELF,
  Permission.JOBS_VIEW,
  Permission.JOBS_POST,
  Permission.JOBS_MANAGE,
  Permission.PLATFORM_STATS_VIEW,
  Permission.DPDP_OWN,
]);

const ROLE_PERMISSIONS: Record<string, Set<PermissionKey>> = {
  student: STUDENT_PERMISSIONS,
  mentor: MENTOR_PERMISSIONS,
  tpo: TPO_PERMISSIONS,
  employer: EMPLOYER_PERMISSIONS,
  admin: new Set(Object.values(Permission) as PermissionKey[]),
};

export function hasPermission(role: string, permission: PermissionKey): boolean {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  if (perms.has(Permission.ADMIN_ALL)) return true;
  return perms.has(permission);
}

export function getPermissionsForRole(role: string): Set<PermissionKey> {
  return ROLE_PERMISSIONS[role] ?? new Set();
}

export function requirePermission(permission: PermissionKey) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    if (!hasPermission(req.user.role, permission)) {
      res.status(403).json({
        error: "Insufficient permissions",
        required: permission,
        role: req.user.role,
      });
      return;
    }
    next();
  };
}

export function requireAnyPermission(...permissions: PermissionKey[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const hasAny = permissions.some((p) => hasPermission(req.user!.role, p));
    if (!hasAny) {
      res.status(403).json({
        error: "Insufficient permissions",
        required: permissions,
        role: req.user.role,
      });
      return;
    }
    next();
  };
}

export function requireAllPermissions(...permissions: PermissionKey[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const missing = permissions.filter(
      (p) => !hasPermission(req.user!.role, p)
    );
    if (missing.length > 0) {
      res.status(403).json({
        error: "Insufficient permissions",
        missing,
        role: req.user.role,
      });
      return;
    }
    next();
  };
}
