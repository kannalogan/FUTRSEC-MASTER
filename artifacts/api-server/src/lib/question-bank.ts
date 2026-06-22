import { eq, inArray, and } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  questionBankTable,
  questionBankOptionsTable,
  questionBankVersionsTable,
  batchesTable,
  type QuestionBankItem,
  type QuestionBankOption,
} from "@workspace/db";
import { z } from "zod/v4";
import { getUserCareerTrack, type CareerTrack } from "./track-access";

export const CAREER_TRACKS = ["soc", "vapt", "grc"] as const;
export const QUESTION_TYPES = [
  "mcq",
  "multi_select",
  "true_false",
  "code",
  "practical",
  "scenario",
] as const;
export const DIFFICULTIES = [
  "beginner",
  "intermediate",
  "advanced",
  "expert",
] as const;
export const QUESTION_STATUSES = [
  "draft",
  "pending",
  "approved",
  "rejected",
  "archived",
] as const;
// Choice-style types require options with at least one correct answer.
export const CHOICE_TYPES = new Set(["mcq", "multi_select", "true_false"]);

// ─────────────────────────────────────────────────────────────────────────────
// Mentor scoping
// ─────────────────────────────────────────────────────────────────────────────

/** Tracks a mentor is allowed to author for: their own track + every track they have a batch in. */
export async function getMentorTracks(mentorId: number): Promise<CareerTrack[]> {
  const tracks = new Set<CareerTrack>();
  const own = await getUserCareerTrack(mentorId);
  if (own) tracks.add(own);
  const batches = await db
    .select({ track: batchesTable.careerTrack })
    .from(batchesTable)
    .where(eq(batchesTable.mentorId, mentorId));
  for (const b of batches) tracks.add(b.track as CareerTrack);
  return [...tracks];
}

export async function getMentorBatchIds(mentorId: number): Promise<number[]> {
  const rows = await db
    .select({ id: batchesTable.id })
    .from(batchesTable)
    .where(eq(batchesTable.mentorId, mentorId));
  return rows.map((r) => r.id);
}

// ─────────────────────────────────────────────────────────────────────────────
// Loading + serialization
// ─────────────────────────────────────────────────────────────────────────────

export async function loadOptions(
  questionIds: number[]
): Promise<Map<number, QuestionBankOption[]>> {
  const map = new Map<number, QuestionBankOption[]>();
  if (questionIds.length === 0) return map;
  const rows = await db
    .select()
    .from(questionBankOptionsTable)
    .where(inArray(questionBankOptionsTable.questionId, questionIds));
  for (const r of rows) {
    const list = map.get(r.questionId) ?? [];
    list.push(r);
    map.set(r.questionId, list);
  }
  for (const list of map.values()) list.sort((a, b) => a.order - b.order);
  return map;
}

export function serializeQuestion(
  q: QuestionBankItem,
  options: QuestionBankOption[] = [],
  opts: { includeAnswers?: boolean } = {}
) {
  return {
    id: q.id,
    questionText: q.questionText,
    questionType: q.questionType,
    careerTrack: q.careerTrack,
    difficulty: q.difficulty,
    status: q.status,
    createdBy: q.createdBy,
    creatorRole: q.creatorRole,
    approvedBy: q.approvedBy,
    approvedAt: q.approvedAt?.toISOString() ?? null,
    rejectionReason: q.rejectionReason,
    isShared: q.isShared,
    version: q.version,
    topic: q.topic,
    bloomLevel: q.bloomLevel,
    estimatedTimeMin: q.estimatedTimeMin,
    marks: q.marks,
    negativeMarks: q.negativeMarks,
    skills: q.skills,
    keywords: q.keywords,
    explanation: q.explanation,
    codeLanguage: q.codeLanguage,
    codeTemplate: q.codeTemplate,
    expectedOutput: q.expectedOutput,
    scenarioContext: q.scenarioContext,
    usageCount: q.usageCount,
    aiQualityScore: q.aiQualityScore,
    aiGenerated: q.aiGenerated,
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
    options: options.map((o) => ({
      id: o.id,
      optionText: o.optionText,
      order: o.order,
      ...(opts.includeAnswers ? { isCorrect: o.isCorrect } : {}),
    })),
  };
}

/** Write an immutable version snapshot of a question + its options. */
export async function snapshotVersion(
  questionId: number,
  version: number,
  changedBy: number | undefined,
  changeNote: string | undefined
): Promise<void> {
  const [q] = await db
    .select()
    .from(questionBankTable)
    .where(eq(questionBankTable.id, questionId));
  if (!q) return;
  const options = await db
    .select()
    .from(questionBankOptionsTable)
    .where(eq(questionBankOptionsTable.questionId, questionId));
  await db.insert(questionBankVersionsTable).values({
    questionId,
    version,
    snapshot: { question: serializeQuestion(q, options, { includeAnswers: true }) },
    changedBy,
    changeNote,
  });
}

/** Replace all options for a question. */
export async function replaceOptions(
  questionId: number,
  options: { optionText: string; isCorrect: boolean; order?: number }[]
): Promise<void> {
  await db
    .delete(questionBankOptionsTable)
    .where(eq(questionBankOptionsTable.questionId, questionId));
  if (options.length === 0) return;
  await db.insert(questionBankOptionsTable).values(
    options.map((o, i) => ({
      questionId,
      optionText: o.optionText,
      isCorrect: o.isCorrect,
      order: o.order ?? i,
    }))
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Zod schemas
// ─────────────────────────────────────────────────────────────────────────────

const optionSchema = z.object({
  optionText: z.string().trim().min(1).max(2000),
  isCorrect: z.boolean().default(false),
  order: z.number().int().min(0).optional(),
});

export const questionBodySchema = z.object({
  questionText: z.string().trim().min(3).max(8000),
  questionType: z.enum(QUESTION_TYPES).default("mcq"),
  careerTrack: z.enum(CAREER_TRACKS),
  difficulty: z.enum(DIFFICULTIES).default("intermediate"),
  topic: z.string().trim().max(200).optional(),
  bloomLevel: z.string().trim().max(50).optional(),
  estimatedTimeMin: z.number().int().min(0).max(600).optional(),
  marks: z.number().int().min(0).max(100).default(1),
  negativeMarks: z.number().min(0).max(100).default(0),
  skills: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  keywords: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  explanation: z.string().trim().max(8000).optional(),
  codeLanguage: z.string().trim().max(50).optional(),
  codeTemplate: z.string().max(20000).optional(),
  expectedOutput: z.string().max(20000).optional(),
  scenarioContext: z.string().max(20000).optional(),
  isShared: z.boolean().default(false),
  batchIds: z.array(z.number().int().positive()).max(100).optional(),
  options: z.array(optionSchema).max(12).default([]),
});

export const questionUpdateSchema = questionBodySchema.partial();

export const aiGenerateSchema = z.object({
  careerTrack: z.enum(CAREER_TRACKS),
  questionType: z.enum(QUESTION_TYPES).default("mcq"),
  difficulty: z.enum(DIFFICULTIES).default("intermediate"),
  topic: z.string().trim().max(200).optional(),
  count: z.number().int().min(1).max(10).default(5),
});

export const aiTextSchema = z.object({
  questionText: z.string().trim().min(3).max(8000),
  questionType: z.enum(QUESTION_TYPES).optional(),
  options: z.array(z.object({ optionText: z.string(), isCorrect: z.boolean() })).optional(),
});

export const paperGenerateSchema = z.object({
  careerTrack: z.enum(CAREER_TRACKS),
  title: z.string().trim().min(1).max(200).optional(),
  totalQuestions: z.number().int().min(1).max(100).default(10),
  byDifficulty: z
    .object({
      beginner: z.number().int().min(0).max(100).optional(),
      intermediate: z.number().int().min(0).max(100).optional(),
      advanced: z.number().int().min(0).max(100).optional(),
      expert: z.number().int().min(0).max(100).optional(),
    })
    .optional(),
  questionTypes: z.array(z.enum(QUESTION_TYPES)).optional(),
  topics: z.array(z.string().trim().min(1)).optional(),
  randomize: z.boolean().default(true),
  negativeMarking: z.boolean().default(false),
  timeLimitMin: z.number().int().min(1).max(600).default(30),
});

export function validateChoicePayload(
  questionType: string,
  options: { isCorrect: boolean }[]
): string | null {
  if (!CHOICE_TYPES.has(questionType)) return null;
  if (options.length < 2) return "Choice questions need at least 2 options";
  if (!options.some((o) => o.isCorrect))
    return "At least one option must be marked correct";
  if (questionType === "mcq" || questionType === "true_false") {
    if (options.filter((o) => o.isCorrect).length !== 1)
      return "This question type must have exactly one correct option";
  }
  return null;
}

export { and, eq, inArray };
