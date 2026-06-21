import { and, eq, isNotNull, or } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  studentProfilesTable,
  assessmentsTable,
  assessmentResultsTable,
  moduleEnrollmentsTable,
  labModuleCompletionsTable,
  assignmentSubmissionsTable,
  checkpointsTable,
  checkpointProgressTable,
  ftsScoresTable,
  ftsHistoryTable,
} from "@workspace/db";

export const FTS_POINTS = {
  profileComplete: 5,
  preAssessment: 10,
  courseCompletion: 15,
  labCompletion: 20,
  assignment: 10,
  cp1: 10,
  cp2: 10,
  cp3: 10,
  cp4: 5,
  cp5: 5,
} as const;

export const FTS_UNLOCKS = {
  cp1: 10,
  cp2: 25,
  cp3: 45,
  cp4: 65,
  cp5: 80,
  aiJobAgent: 90,
} as const;

export function getUnlocks(total: number): {
  cp1: boolean;
  cp2: boolean;
  cp3: boolean;
  cp4: boolean;
  cp5: boolean;
  aiJobAgent: boolean;
} {
  return {
    cp1: total >= FTS_UNLOCKS.cp1,
    cp2: total >= FTS_UNLOCKS.cp2,
    cp3: total >= FTS_UNLOCKS.cp3,
    cp4: total >= FTS_UNLOCKS.cp4,
    cp5: total >= FTS_UNLOCKS.cp5,
    aiJobAgent: total >= FTS_UNLOCKS.aiJobAgent,
  };
}

export async function recomputeFts(
  userId: number,
): Promise<{ total: number; breakdown: Record<string, number> }> {
  const breakdown: Record<string, number> = {
    profileComplete: 0,
    preAssessment: 0,
    courseCompletion: 0,
    labCompletion: 0,
    assignment: 0,
    cp1: 0,
    cp2: 0,
    cp3: 0,
    cp4: 0,
    cp5: 0,
  };

  // Profile complete: resumeUrl or bio non-null.
  const [profile] = await db
    .select({
      resumeUrl: studentProfilesTable.resumeUrl,
      bio: studentProfilesTable.bio,
    })
    .from(studentProfilesTable)
    .where(eq(studentProfilesTable.userId, userId))
    .limit(1);
  if (profile && (profile.resumeUrl != null || profile.bio != null)) {
    breakdown.profileComplete = FTS_POINTS.profileComplete;
  }

  // Pre-assessment passed.
  const [preAssessment] = await db
    .select({ id: assessmentResultsTable.id })
    .from(assessmentResultsTable)
    .innerJoin(
      assessmentsTable,
      eq(assessmentsTable.id, assessmentResultsTable.assessmentId),
    )
    .where(
      and(
        eq(assessmentResultsTable.userId, userId),
        eq(assessmentResultsTable.passed, true),
        eq(assessmentsTable.type, "pre_assessment"),
      ),
    )
    .limit(1);
  if (preAssessment) {
    breakdown.preAssessment = FTS_POINTS.preAssessment;
  }

  // Course completion: >=1 module enrollment completed.
  const [courseDone] = await db
    .select({ id: moduleEnrollmentsTable.id })
    .from(moduleEnrollmentsTable)
    .where(
      and(
        eq(moduleEnrollmentsTable.userId, userId),
        isNotNull(moduleEnrollmentsTable.completedAt),
      ),
    )
    .limit(1);
  if (courseDone) {
    breakdown.courseCompletion = FTS_POINTS.courseCompletion;
  }

  // Lab completion: >=1 lab module completion.
  const [labDone] = await db
    .select({ id: labModuleCompletionsTable.id })
    .from(labModuleCompletionsTable)
    .where(eq(labModuleCompletionsTable.userId, userId))
    .limit(1);
  if (labDone) {
    breakdown.labCompletion = FTS_POINTS.labCompletion;
  }

  // Assignment: >=1 graded submission.
  const [assignmentDone] = await db
    .select({ id: assignmentSubmissionsTable.id })
    .from(assignmentSubmissionsTable)
    .where(
      and(
        eq(assignmentSubmissionsTable.studentId, userId),
        or(
          eq(assignmentSubmissionsTable.status, "graded"),
          isNotNull(assignmentSubmissionsTable.score),
        ),
      ),
    )
    .limit(1);
  if (assignmentDone) {
    breakdown.assignment = FTS_POINTS.assignment;
  }

  // Checkpoints CP1-5 mapped by checkpoint order.
  const completedCheckpoints = await db
    .select({ order: checkpointsTable.order })
    .from(checkpointProgressTable)
    .innerJoin(
      checkpointsTable,
      eq(checkpointsTable.id, checkpointProgressTable.checkpointId),
    )
    .where(
      and(
        eq(checkpointProgressTable.userId, userId),
        eq(checkpointProgressTable.status, "completed"),
      ),
    );
  for (const cp of completedCheckpoints) {
    switch (cp.order) {
      case 1:
        breakdown.cp1 = FTS_POINTS.cp1;
        break;
      case 2:
        breakdown.cp2 = FTS_POINTS.cp2;
        break;
      case 3:
        breakdown.cp3 = FTS_POINTS.cp3;
        break;
      case 4:
        breakdown.cp4 = FTS_POINTS.cp4;
        break;
      case 5:
        breakdown.cp5 = FTS_POINTS.cp5;
        break;
      default:
        break;
    }
  }

  const rawTotal = Object.values(breakdown).reduce((sum, v) => sum + v, 0);
  const total = Math.max(0, Math.min(100, rawTotal));

  const assessmentScore =
    breakdown.preAssessment +
    breakdown.courseCompletion +
    breakdown.cp1 +
    breakdown.cp2 +
    breakdown.cp3 +
    breakdown.cp4 +
    breakdown.cp5;
  const labScore = breakdown.labCompletion;
  const assignmentScore = breakdown.assignment;
  const attendanceScore = breakdown.profileComplete;

  const [existing] = await db
    .select({ totalScore: ftsScoresTable.totalScore })
    .from(ftsScoresTable)
    .where(eq(ftsScoresTable.userId, userId))
    .limit(1);
  const previousScore = existing ? existing.totalScore : 0;

  await db
    .insert(ftsScoresTable)
    .values({
      userId,
      totalScore: total,
      assessmentScore,
      labScore,
      assignmentScore,
      attendanceScore,
    })
    .onConflictDoUpdate({
      target: ftsScoresTable.userId,
      set: {
        totalScore: total,
        assessmentScore,
        labScore,
        assignmentScore,
        attendanceScore,
      },
    });

  await db.insert(ftsHistoryTable).values({
    userId,
    event: "recompute",
    scoreDelta: total - previousScore,
    previousScore,
    newScore: total,
    metadata: JSON.stringify(breakdown),
  });

  return { total, breakdown };
}
