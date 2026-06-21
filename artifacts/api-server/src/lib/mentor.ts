import { db } from "@workspace/db";
import { and, eq, inArray, lt, desc } from "drizzle-orm";
import {
  mentorStudentsTable,
  mentorTasksTable,
  mentorTaskAssignmentsTable,
  lessonProgressTable,
  moduleEnrollmentsTable,
  ftsScoresTable,
  labModuleCompletionsTable,
  assessmentResultsTable,
  assignmentSubmissionsTable,
} from "@workspace/db";

/** Resolve the student IDs directly assigned to a mentor. */
export async function getMentorStudentIds(mentorId: number): Promise<number[]> {
  const rows = await db
    .select({ studentId: mentorStudentsTable.studentId })
    .from(mentorStudentsTable)
    .where(eq(mentorStudentsTable.mentorId, mentorId));
  return rows.map((r) => r.studentId);
}

/** True if the given student is assigned to the mentor (authorization guard). */
export async function mentorOwnsStudent(
  mentorId: number,
  studentId: number
): Promise<boolean> {
  const row = await db.query.mentorStudentsTable.findFirst({
    where: and(
      eq(mentorStudentsTable.mentorId, mentorId),
      eq(mentorStudentsTable.studentId, studentId)
    ),
  });
  return !!row;
}

export interface StudentMetric {
  studentId: number;
  learningHours: number;
  lessonsCompleted: number;
  lessonsLast14: number;
  lastActivityAt: string | null;
  avgModuleProgress: number;
  ftsTotal: number;
  labPoints: number;
  labsCompleted: number;
  assessmentsTaken: number;
  assessmentsPassed: number;
  assignmentsSubmitted: number;
  missedTasks: number;
}

function emptyMetric(studentId: number): StudentMetric {
  return {
    studentId,
    learningHours: 0,
    lessonsCompleted: 0,
    lessonsLast14: 0,
    lastActivityAt: null,
    avgModuleProgress: 0,
    ftsTotal: 0,
    labPoints: 0,
    labsCompleted: 0,
    assessmentsTaken: 0,
    assessmentsPassed: 0,
    assignmentsSubmitted: 0,
    missedTasks: 0,
  };
}

/** Aggregate per-student learning/assessment/lab/task metrics across the cohort. */
export async function computeStudentMetrics(
  studentIds: number[]
): Promise<Map<number, StudentMetric>> {
  const map = new Map<number, StudentMetric>();
  for (const id of studentIds) map.set(id, emptyMetric(id));
  if (studentIds.length === 0) return map;

  const now = Date.now();
  const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000;

  const [lessons, modules, fts, labs, assessments, assignments, taskRows] =
    await Promise.all([
      db
        .select({
          userId: lessonProgressTable.userId,
          timeSpentSeconds: lessonProgressTable.timeSpentSeconds,
          completedAt: lessonProgressTable.completedAt,
        })
        .from(lessonProgressTable)
        .where(inArray(lessonProgressTable.userId, studentIds)),
      db
        .select({
          userId: moduleEnrollmentsTable.userId,
          progressPercent: moduleEnrollmentsTable.progressPercent,
        })
        .from(moduleEnrollmentsTable)
        .where(inArray(moduleEnrollmentsTable.userId, studentIds)),
      db
        .select({
          userId: ftsScoresTable.userId,
          totalScore: ftsScoresTable.totalScore,
        })
        .from(ftsScoresTable)
        .where(inArray(ftsScoresTable.userId, studentIds)),
      db
        .select({
          userId: labModuleCompletionsTable.userId,
          pointsAwarded: labModuleCompletionsTable.pointsAwarded,
        })
        .from(labModuleCompletionsTable)
        .where(inArray(labModuleCompletionsTable.userId, studentIds)),
      db
        .select({
          userId: assessmentResultsTable.userId,
          passed: assessmentResultsTable.passed,
        })
        .from(assessmentResultsTable)
        .where(inArray(assessmentResultsTable.userId, studentIds)),
      db
        .select({ studentId: assignmentSubmissionsTable.studentId })
        .from(assignmentSubmissionsTable)
        .where(inArray(assignmentSubmissionsTable.studentId, studentIds)),
      db
        .select({
          studentId: mentorTaskAssignmentsTable.studentId,
          status: mentorTaskAssignmentsTable.status,
          endDate: mentorTasksTable.endDate,
        })
        .from(mentorTaskAssignmentsTable)
        .innerJoin(
          mentorTasksTable,
          eq(mentorTaskAssignmentsTable.taskId, mentorTasksTable.id)
        )
        .where(inArray(mentorTaskAssignmentsTable.studentId, studentIds)),
    ]);

  const moduleAgg = new Map<number, { sum: number; count: number }>();

  for (const r of lessons) {
    const m = map.get(r.userId);
    if (!m) continue;
    m.learningHours += (r.timeSpentSeconds ?? 0) / 3600;
    m.lessonsCompleted += 1;
    const ts = r.completedAt ? new Date(r.completedAt).getTime() : 0;
    if (ts >= fourteenDaysAgo) m.lessonsLast14 += 1;
    if (ts && (!m.lastActivityAt || ts > new Date(m.lastActivityAt).getTime())) {
      m.lastActivityAt = new Date(ts).toISOString();
    }
  }
  for (const r of modules) {
    const agg = moduleAgg.get(r.userId) ?? { sum: 0, count: 0 };
    agg.sum += r.progressPercent ?? 0;
    agg.count += 1;
    moduleAgg.set(r.userId, agg);
  }
  for (const [userId, agg] of moduleAgg) {
    const m = map.get(userId);
    if (m) m.avgModuleProgress = agg.count ? Math.round(agg.sum / agg.count) : 0;
  }
  for (const r of fts) {
    const m = map.get(r.userId);
    if (m) m.ftsTotal = Math.round(r.totalScore ?? 0);
  }
  for (const r of labs) {
    const m = map.get(r.userId);
    if (!m) continue;
    m.labPoints += r.pointsAwarded ?? 0;
    m.labsCompleted += 1;
  }
  for (const r of assessments) {
    const m = map.get(r.userId);
    if (!m) continue;
    m.assessmentsTaken += 1;
    if (r.passed) m.assessmentsPassed += 1;
  }
  for (const r of assignments) {
    const m = map.get(r.studentId);
    if (m) m.assignmentsSubmitted += 1;
  }
  for (const r of taskRows) {
    const m = map.get(r.studentId);
    if (!m) continue;
    const overdue = r.endDate ? new Date(r.endDate).getTime() < now : false;
    if (r.status === "missed" || (overdue && r.status !== "completed")) {
      m.missedTasks += 1;
    }
  }

  return map;
}

export interface RiskAssessment {
  studentId: number;
  riskScore: number;
  riskLevel: "low" | "medium" | "high";
  signals: string[];
  recommendations: string[];
}

/** Rule-based at-risk scoring from a precomputed student metric. */
export function assessRisk(m: StudentMetric): RiskAssessment {
  const signals: string[] = [];
  const recommendations: string[] = [];
  let score = 0;

  const daysSinceActivity = m.lastActivityAt
    ? (Date.now() - new Date(m.lastActivityAt).getTime()) / (24 * 60 * 60 * 1000)
    : Infinity;

  if (m.lessonsLast14 < 2 || daysSinceActivity > 7) {
    score += 30;
    signals.push("Low activity");
    recommendations.push(
      "Reach out to re-engage — fewer than 2 lessons in the last 14 days."
    );
  }
  if (m.ftsTotal < 40) {
    score += 25;
    signals.push("Low FTS");
    recommendations.push(
      "FTS is below 40 — recommend foundational labs and assessment retakes."
    );
  }
  if (m.missedTasks > 0) {
    score += Math.min(25, m.missedTasks * 10);
    signals.push("Missed tasks");
    recommendations.push(
      `${m.missedTasks} task(s) overdue — follow up on pending deliverables.`
    );
  }
  const passRate =
    m.assessmentsTaken > 0 ? m.assessmentsPassed / m.assessmentsTaken : 0;
  if (m.assessmentsTaken === 0 || passRate < 0.5) {
    score += 20;
    signals.push("Low assessments");
    recommendations.push(
      m.assessmentsTaken === 0
        ? "No assessments attempted yet — assign a pre-assessment."
        : "Assessment pass rate below 50% — schedule a review session."
    );
  }

  score = Math.max(0, Math.min(100, score));
  const riskLevel: RiskAssessment["riskLevel"] =
    score >= 60 ? "high" : score >= 30 ? "medium" : "low";

  if (signals.length === 0) {
    recommendations.push("On track — keep momentum with the current plan.");
  }

  return {
    studentId: m.studentId,
    riskScore: score,
    riskLevel,
    signals,
    recommendations,
  };
}

/** Build a 30-day activity heatmap (date -> lesson completion count) for a cohort. */
export async function computeActivityHeatmap(
  studentIds: number[]
): Promise<{ date: string; count: number }[]> {
  if (studentIds.length === 0) return [];
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const rows = await db
    .select({ completedAt: lessonProgressTable.completedAt })
    .from(lessonProgressTable)
    .where(inArray(lessonProgressTable.userId, studentIds));

  const counts = new Map<string, number>();
  for (const r of rows) {
    if (!r.completedAt) continue;
    const ts = new Date(r.completedAt).getTime();
    if (ts < thirtyDaysAgo) continue;
    const day = new Date(ts).toISOString().slice(0, 10);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }

  const result: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    result.push({ date: d, count: counts.get(d) ?? 0 });
  }
  return result;
}

/** Materialize per-student task assignment rows for a published task's audience. */
export async function resolveTaskAudience(
  mentorId: number,
  audience: string,
  batchIds: number[]
): Promise<number[]> {
  const links = await db
    .select({
      studentId: mentorStudentsTable.studentId,
      isTrial: mentorStudentsTable.isTrial,
      batchId: mentorStudentsTable.batchId,
    })
    .from(mentorStudentsTable)
    .where(eq(mentorStudentsTable.mentorId, mentorId));

  let filtered = links;
  if (audience === "trial_students") {
    filtered = links.filter((l) => l.isTrial);
  } else if (audience === "specific_batches") {
    const set = new Set(batchIds);
    filtered = links.filter((l) => l.batchId != null && set.has(l.batchId));
  } else if (audience === "all_batches") {
    filtered = links.filter((l) => l.batchId != null);
  } else if (audience === "future_batches") {
    // Future-batch students are assigned when the batch starts; none yet.
    filtered = [];
  }
  return Array.from(new Set(filtered.map((l) => l.studentId)));
}

export { lt, desc };
