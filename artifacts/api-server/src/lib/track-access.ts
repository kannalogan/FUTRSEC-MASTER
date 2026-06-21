import { eq } from "drizzle-orm";
import { db, tracksTable, usersTable } from "@workspace/db";

export type CareerTrack = "soc" | "vapt" | "grc";

const DENIED = "Access denied: this content belongs to a different career track.";

async function getUserCareerTrack(userId: number): Promise<CareerTrack | null> {
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) });
  return (user?.careerTrack as CareerTrack | null) ?? null;
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
  if (!careerTrack) return null;

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
  if (!requiredTracks || requiredTracks.length === 0) return null;

  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) });
  if (!user?.selectedTrackId) return null;

  const track = await db.query.tracksTable.findFirst({ where: eq(tracksTable.id, user.selectedTrackId) });
  if (!track) return null;

  return requiredTracks.includes(track.slug) ? null : DENIED;
}
