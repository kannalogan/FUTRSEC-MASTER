import { eq, ilike } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  tpoProfilesTable,
  studentTpoMapTable,
  studentProfilesTable,
} from "@workspace/db";

export async function loadTpoProfile(userId: number) {
  return db.query.tpoProfilesTable.findFirst({
    where: eq(tpoProfilesTable.userId, userId),
  });
}

// Resolve the set of student userIds visible to this TPO:
//   explicitly mapped (student_tpo_map) ∪ students whose college == institution
export async function getTpoStudentIds(
  tpoUserId: number,
  institution: string | null
): Promise<number[]> {
  const mapped = await db
    .select({ studentId: studentTpoMapTable.studentId })
    .from(studentTpoMapTable)
    .where(eq(studentTpoMapTable.tpoId, tpoUserId));
  const ids = new Set<number>(mapped.map((m) => m.studentId));

  if (institution) {
    const byCollege = await db
      .select({ userId: studentProfilesTable.userId })
      .from(studentProfilesTable)
      .where(ilike(studentProfilesTable.college, institution));
    for (const r of byCollege) ids.add(r.userId);
  }
  return [...ids];
}
