import { eq } from "drizzle-orm";
import { db, tracksTable, usersTable } from "@workspace/db";

export type CareerTrack = "soc" | "vapt" | "grc";

const DENIED = "Access denied: this content belongs to a different career track.";
const NO_TRACK = "Access denied: select a career track to unlock this content.";

/**
 * Resolves the user's effective career track. `careerTrack` is the authoritative
 * field, but during/after onboarding a user may have only `selectedTrackId` set,
 * so we fall back to that track's domain. Returns null only when the user has no
 * determinable track at all.
 */
export async function getUserCareerTrack(userId: number): Promise<CareerTrack | null> {
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) });
  if (!user) return null;
  if (user.careerTrack) return user.careerTrack as CareerTrack;
  if (user.selectedTrackId) {
    const t = await db.query.tracksTable.findFirst({ where: eq(tracksTable.id, user.selectedTrackId) });
    return (t?.domain as CareerTrack | undefined) ?? null;
  }
  return null;
}

/**
 * Resolves the identifiers that may appear in a job's `requiredTracks` array for
 * this user's permanent track. Historically `requiredTracks` stored track slugs
 * (e.g. "soc-analyst") while newer admin-authored postings store domain values
 * (e.g. "soc"), so we match against BOTH forms. `careerTrack` (domain) is the
 * authoritative source; the slug is resolved from the domain's track row.
 * Returns null when the user has no determinable track (deny-by-default).
 */
export async function getUserTrackIdentifiers(
  userId: number,
): Promise<{ domain: CareerTrack; slug: string | null } | null> {
  const domain = await getUserCareerTrack(userId);
  if (!domain) return null;
  const track = await db.query.tracksTable.findFirst({ where: eq(tracksTable.domain, domain) });
  return { domain, slug: track?.slug ?? null };
}

/**
 * Returns true when a job's requiredTracks list grants access to a user whose
 * track identifiers are given. Empty/absent requiredTracks = open to everyone.
 */
export function jobMatchesTrack(
  requiredTracks: string[] | null | undefined,
  ids: { domain: CareerTrack; slug: string | null },
): boolean {
  if (!requiredTracks || requiredTracks.length === 0) return true;
  return requiredTracks.includes(ids.domain) || (ids.slug != null && requiredTracks.includes(ids.slug));
}

/**
 * Track-locked RBAC for endpoints that accept an explicit `track` (slug) query
 * param. In the track-locked architecture a student may only access content for
 * their own permanent career track. Admins bypass the check.
 *
 * Returns null when access is allowed, or an error message string when the
 * request must be rejected with HTTP 403 (cross-track access attempt).
 */
export async function checkTrackQueryAccess(
  role: string,
  userCareerTrack: CareerTrack | null,
  requestedSlug: string | undefined | null,
): Promise<string | null> {
  if (role === "admin") return null;
  if (!requestedSlug) return null;

  const requested = await db.query.tracksTable.findFirst({
    where: eq(tracksTable.slug, requestedSlug),
  });
  // Unknown slug: let the route handle it (404 / default behaviour).
  if (!requested) return null;

  if (userCareerTrack && requested.domain !== userCareerTrack) {
    return DENIED;
  }
  return null;
}

/**
 * Track-locked RBAC for resource-by-ID endpoints (e.g. GET /labs/:id,
 * /learning/modules/:id). Resolves the resource's owning track and rejects
 * access when its domain differs from the student's career track. Admins and
 * untracked resources (resourceTrackId == null) are allowed.
 *
 * Returns null when access is allowed, or an error string for a 403.
 */
export async function checkResourceTrackAccess(
  role: string,
  userId: number,
  resourceTrackId: number | null | undefined,
): Promise<string | null> {
  if (role === "admin") return null;
  if (resourceTrackId == null) return null;

  const careerTrack = await getUserCareerTrack(userId);
  // Track-locked: a non-admin with no determinable track cannot access
  // track-scoped resources by ID. Denying (not allowing) closes the bypass
  // where a null-track user could read any track's content.
  if (!careerTrack) return NO_TRACK;

  const track = await db.query.tracksTable.findFirst({ where: eq(tracksTable.id, resourceTrackId) });
  if (!track) return null;

  return track.domain !== careerTrack ? DENIED : null;
}

/**
 * Track-locked RBAC for jobs, whose track scoping is a list of allowed track
 * slugs (`requiredTracks`). Jobs with no required tracks are open to everyone.
 * Otherwise the student's own track slug must be in the list.
 */
export async function checkJobTrackAccess(
  role: string,
  userId: number,
  requiredTracks: string[] | null | undefined,
): Promise<string | null> {
  if (role === "admin") return null;
  // Open posting (no track restriction) — accessible to everyone.
  if (!requiredTracks || requiredTracks.length === 0) return null;

  const ids = await getUserTrackIdentifiers(userId);
  // Track-locked: a non-admin with no determinable track cannot access a
  // track-restricted job. Deny (not allow) to close the fail-open bypass.
  if (!ids) return NO_TRACK;

  return jobMatchesTrack(requiredTracks, ids) ? null : DENIED;
}
