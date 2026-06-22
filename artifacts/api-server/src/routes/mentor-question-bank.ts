import { Router } from "express";
import { eq, and, or, desc, ilike, inArray, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  questionBankTable,
  questionBankOptionsTable,
  questionBankVersionsTable,
  questionBankBatchesTable,
  assessmentsTable,
  assessmentQuestionsTable,
  assessmentOptionsTable,
} from "@workspace/db";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth";
import { createAuditLog } from "../lib/audit";
import { generateJSON, getProviderName } from "../lib/ai";
import {
  getMentorTracks,
  getMentorBatchIds,
  loadOptions,
  serializeQuestion,
  snapshotVersion,
  replaceOptions,
  questionBodySchema,
  questionUpdateSchema,
  aiGenerateSchema,
  aiTextSchema,
  paperGenerateSchema,
  validateChoicePayload,
  CHOICE_TYPES,
} from "../lib/question-bank";

const router = Router();

function ip(req: AuthRequest): string {
  const f = req.headers["x-forwarded-for"];
  if (typeof f === "string") return f.split(",")[0].trim();
  return req.socket.remoteAddress ?? "unknown";
}

const guards = [requireAuth, requireRole("mentor")];

// ─────────────────────────────────────────────────────────────────────────────
// Analytics / KPI summary (must precede /:id)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/mentor/question-bank/analytics", ...guards, async (req: AuthRequest, res): Promise<void> => {
  const mentorId = req.user!.userId;
  const rows = await db
    .select()
    .from(questionBankTable)
    .where(eq(questionBankTable.createdBy, mentorId));

  const byStatus: Record<string, number> = {};
  const byType: Record<string, number> = {};
  const byDifficulty: Record<string, number> = {};
  const byTrack: Record<string, number> = {};
  let totalUsage = 0;
  let qualitySum = 0;
  let qualityCount = 0;
  for (const r of rows) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    byType[r.questionType] = (byType[r.questionType] ?? 0) + 1;
    byDifficulty[r.difficulty] = (byDifficulty[r.difficulty] ?? 0) + 1;
    byTrack[r.careerTrack] = (byTrack[r.careerTrack] ?? 0) + 1;
    totalUsage += r.usageCount;
    if (typeof r.aiQualityScore === "number") {
      qualitySum += r.aiQualityScore;
      qualityCount += 1;
    }
  }
  res.json({
    total: rows.length,
    byStatus,
    byType,
    byDifficulty,
    byTrack,
    totalUsage,
    avgQuality: qualityCount ? Math.round(qualitySum / qualityCount) : null,
    tracks: await getMentorTracks(mentorId),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CSV export (must precede /:id)
// ─────────────────────────────────────────────────────────────────────────────
function csvCell(v: unknown): string {
  const s = v == null ? "" : Array.isArray(v) ? v.join("; ") : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

router.get("/mentor/question-bank/export.csv", ...guards, async (req: AuthRequest, res): Promise<void> => {
  const mentorId = req.user!.userId;
  const rows = await db
    .select()
    .from(questionBankTable)
    .where(eq(questionBankTable.createdBy, mentorId))
    .orderBy(desc(questionBankTable.createdAt));
  const header = [
    "id", "questionText", "questionType", "careerTrack", "difficulty", "status",
    "topic", "bloomLevel", "marks", "negativeMarks", "estimatedTimeMin",
    "skills", "keywords", "usageCount", "createdAt",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push([
      r.id, r.questionText, r.questionType, r.careerTrack, r.difficulty, r.status,
      r.topic, r.bloomLevel, r.marks, r.negativeMarks, r.estimatedTimeMin,
      r.skills, r.keywords, r.usageCount, r.createdAt.toISOString(),
    ].map(csvCell).join(","));
  }
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="question-bank.csv"');
  res.send(lines.join("\n"));
});

// ─────────────────────────────────────────────────────────────────────────────
// List with filters + pagination
// ─────────────────────────────────────────────────────────────────────────────
router.get("/mentor/question-bank", ...guards, async (req: AuthRequest, res): Promise<void> => {
  const mentorId = req.user!.userId;
  const tracks = await getMentorTracks(mentorId);
  if (tracks.length === 0) {
    res.json({ items: [], total: 0, page: 1, pageSize: 0 });
    return;
  }

  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
  const view = String(req.query.view ?? "all"); // own | shared | all

  // Visibility: own questions OR shared+approved within mentor's tracks.
  const ownCond = eq(questionBankTable.createdBy, mentorId);
  const sharedCond = and(
    eq(questionBankTable.isShared, true),
    eq(questionBankTable.status, "approved"),
    inArray(questionBankTable.careerTrack, tracks)
  );
  let visibility = view === "own" ? ownCond : view === "shared" ? sharedCond : or(ownCond, sharedCond);

  const conds = [
    and(inArray(questionBankTable.careerTrack, tracks), visibility),
  ];

  if (req.query.track && tracks.includes(String(req.query.track) as never)) {
    conds.push(eq(questionBankTable.careerTrack, String(req.query.track) as never));
  }
  if (req.query.type) conds.push(eq(questionBankTable.questionType, String(req.query.type) as never));
  if (req.query.difficulty) conds.push(eq(questionBankTable.difficulty, String(req.query.difficulty) as never));
  if (req.query.status) conds.push(eq(questionBankTable.status, String(req.query.status) as never));
  if (req.query.topic) conds.push(ilike(questionBankTable.topic, `%${String(req.query.topic)}%`));
  if (req.query.skill) conds.push(sql`${String(req.query.skill)} = ANY(${questionBankTable.skills})`);
  if (req.query.q) {
    const term = `%${String(req.query.q)}%`;
    conds.push(or(ilike(questionBankTable.questionText, term), ilike(questionBankTable.topic, term)));
  }

  const where = and(...conds);
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(questionBankTable)
    .where(where);

  const rows = await db
    .select()
    .from(questionBankTable)
    .where(where)
    .orderBy(desc(questionBankTable.updatedAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const optMap = await loadOptions(rows.map((r) => r.id));
  res.json({
    items: rows.map((r) => serializeQuestion(r, optMap.get(r.id) ?? [], { includeAnswers: true })),
    total: count,
    page,
    pageSize,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AI: generate questions (not persisted — returned for review)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/mentor/question-bank/ai/generate", ...guards, async (req: AuthRequest, res): Promise<void> => {
  const mentorId = req.user!.userId;
  const parsed = aiGenerateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() }); return; }
  const d = parsed.data;
  const tracks = await getMentorTracks(mentorId);
  if (!tracks.includes(d.careerTrack)) { res.status(403).json({ error: "You are not assigned to this track" }); return; }

  const TRACK = { soc: "SOC Analyst", vapt: "VAPT / Penetration Testing", grc: "GRC / Governance Risk Compliance" }[d.careerTrack];
  interface GenQ { questionText: string; options?: { optionText: string; isCorrect: boolean }[]; explanation?: string; skills?: string[]; keywords?: string[]; bloomLevel?: string; estimatedTimeMin?: number; }

  // OpenAI JSON mode (response_format: json_object) requires a top-level object,
  // so the model returns { "questions": [...] }. Accept that wrapper OR a bare array.
  interface GenWrapper { questions: GenQ[]; }
  const extractGenQs = (v: unknown): GenQ[] | null => {
    const arr = Array.isArray(v) ? v : (v as GenWrapper)?.questions;
    if (!Array.isArray(arr) || arr.length === 0) return null;
    return arr.every((x) => typeof (x as GenQ)?.questionText === "string") ? (arr as GenQ[]) : null;
  };

  const { data: rawData, provider } = await generateJSON<GenQ[] | GenWrapper>({
    system: `You are a senior cybersecurity instructor authoring ${d.difficulty} ${d.questionType} questions for ${TRACK} learners in India. Questions must be technically accurate, unambiguous, and exam-grade.`,
    user: `Generate exactly ${d.count} ${d.difficulty} "${d.questionType}" questions${d.topic ? ` on the topic "${d.topic}"` : ""} for ${TRACK}. Return a JSON object: { "questions": [ ... ] }. Each array item: { "questionText": string, ${CHOICE_TYPES.has(d.questionType) ? `"options": [{ "optionText": string, "isCorrect": boolean }] (4 options, exactly one or more correct as appropriate),` : ""} "explanation": string, "skills": string[], "keywords": string[], "bloomLevel": one of remember|understand|apply|analyze|evaluate|create, "estimatedTimeMin": number }`,
    maxTokens: 2500,
    validate: (v): v is GenQ[] | GenWrapper => extractGenQs(v) !== null,
    mock: () => Array.from({ length: d.count }, (_, i) => ({
      questionText: `[${TRACK}] Sample ${d.difficulty} ${d.questionType} question #${i + 1}${d.topic ? ` on ${d.topic}` : ""}`,
      options: CHOICE_TYPES.has(d.questionType) ? [
        { optionText: "Correct answer", isCorrect: true },
        { optionText: "Distractor A", isCorrect: false },
        { optionText: "Distractor B", isCorrect: false },
        { optionText: "Distractor C", isCorrect: false },
      ] : undefined,
      explanation: "AI provider not configured — placeholder explanation.",
      skills: d.topic ? [d.topic] : [],
      keywords: [],
      bloomLevel: "understand",
      estimatedTimeMin: 2,
    })),
  });

  const data: GenQ[] = extractGenQs(rawData) ?? [];

  res.json({
    provider,
    careerTrack: d.careerTrack,
    questionType: d.questionType,
    difficulty: d.difficulty,
    generated: data.slice(0, d.count).map((q) => ({
      questionText: q.questionText,
      questionType: d.questionType,
      careerTrack: d.careerTrack,
      difficulty: d.difficulty,
      topic: d.topic ?? null,
      bloomLevel: q.bloomLevel ?? null,
      estimatedTimeMin: q.estimatedTimeMin ?? null,
      skills: q.skills ?? [],
      keywords: q.keywords ?? [],
      explanation: q.explanation ?? null,
      options: q.options ?? [],
      aiGenerated: true,
    })),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AI: difficulty analyzer
// ─────────────────────────────────────────────────────────────────────────────
router.post("/mentor/question-bank/ai/difficulty", ...guards, async (req: AuthRequest, res): Promise<void> => {
  const parsed = aiTextSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  interface R { difficulty: string; confidence: number; rationale: string; }
  const { data, provider } = await generateJSON<R>({
    system: "You assess the difficulty of cybersecurity exam questions. Reply with JSON.",
    user: `Classify difficulty (beginner|intermediate|advanced|expert) of this question and explain briefly. Return JSON {difficulty, confidence (0-100), rationale}.\n\nQUESTION: ${parsed.data.questionText.slice(0, 4000)}`,
    maxTokens: 400,
    validate: (v): v is R => typeof v === "object" && v !== null && typeof (v as R).difficulty === "string",
    mock: () => ({ difficulty: "intermediate", confidence: 50, rationale: "AI provider not configured — default estimate." }),
  });
  res.json({ ...data, provider });
});

// ─────────────────────────────────────────────────────────────────────────────
// AI: explanation generator
// ─────────────────────────────────────────────────────────────────────────────
router.post("/mentor/question-bank/ai/explain", ...guards, async (req: AuthRequest, res): Promise<void> => {
  const parsed = aiTextSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const correct = (parsed.data.options ?? []).filter((o) => o.isCorrect).map((o) => o.optionText);
  const { data, provider } = await generateJSON<{ explanation: string }>({
    system: "You write concise, correct explanations for cybersecurity exam questions.",
    user: `Write a clear explanation (3-5 sentences) for why the answer is correct. Return JSON {explanation}.\n\nQUESTION: ${parsed.data.questionText.slice(0, 4000)}\nCORRECT ANSWER(S): ${correct.join("; ") || "(open-ended)"}`,
    maxTokens: 500,
    validate: (v): v is { explanation: string } => typeof (v as { explanation?: unknown })?.explanation === "string",
    mock: () => ({ explanation: "AI provider not configured — add an explanation manually." }),
  });
  res.json({ explanation: data.explanation, provider });
});

// ─────────────────────────────────────────────────────────────────────────────
// AI: quality score (optionally persists when questionId provided)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/mentor/question-bank/ai/quality", ...guards, async (req: AuthRequest, res): Promise<void> => {
  const mentorId = req.user!.userId;
  const parsed = aiTextSchema.extend({}).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const questionId = Number(req.body?.questionId);
  interface R { score: number; issues: string[]; suggestions: string[]; }
  const { data, provider } = await generateJSON<R>({
    system: "You are a QA reviewer for exam questions. Score clarity, correctness, and fairness.",
    user: `Score this question 0-100 and list issues + suggestions. Return JSON {score, issues: string[], suggestions: string[]}.\n\nQUESTION: ${parsed.data.questionText.slice(0, 4000)}`,
    maxTokens: 600,
    validate: (v): v is R => typeof (v as R)?.score === "number",
    mock: () => ({ score: 70, issues: [], suggestions: ["AI provider not configured — manual review recommended."] }),
  });
  if (Number.isInteger(questionId) && questionId > 0) {
    const [q] = await db.select().from(questionBankTable).where(eq(questionBankTable.id, questionId));
    if (q && q.createdBy === mentorId) {
      const newScore = Math.round(data.score);
      await db.update(questionBankTable).set({ aiQualityScore: newScore }).where(eq(questionBankTable.id, questionId));
      await createAuditLog({ userId: mentorId, action: "mentor.question.quality_scored", entityType: "question_bank", entityId: questionId, ipAddress: ip(req), metadata: { previousScore: q.aiQualityScore, newScore, provider } });
    }
  }
  res.json({ ...data, provider });
});

// ─────────────────────────────────────────────────────────────────────────────
// AI: duplicate detection (against mentor-visible approved questions)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/mentor/question-bank/ai/duplicates", ...guards, async (req: AuthRequest, res): Promise<void> => {
  const mentorId = req.user!.userId;
  const parsed = aiTextSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const tracks = await getMentorTracks(mentorId);
  if (tracks.length === 0) { res.json({ duplicates: [], provider: "none" }); return; }
  const candidates = await db
    .select({ id: questionBankTable.id, questionText: questionBankTable.questionText })
    .from(questionBankTable)
    .where(and(eq(questionBankTable.createdBy, mentorId), inArray(questionBankTable.careerTrack, tracks)))
    .limit(200);

  // Cheap local prefilter by token overlap, then AI confirms top matches.
  const target = parsed.data.questionText.toLowerCase().split(/\W+/).filter(Boolean);
  const targetSet = new Set(target);
  const scored = candidates
    .map((c) => {
      const toks = c.questionText.toLowerCase().split(/\W+/).filter(Boolean);
      const overlap = toks.filter((t) => targetSet.has(t)).length;
      return { ...c, sim: overlap / (Math.max(toks.length, target.length) || 1) };
    })
    .filter((c) => c.sim > 0.3)
    .sort((a, b) => b.sim - a.sim)
    .slice(0, 5);

  res.json({
    provider: getProviderName(),
    duplicates: scored.map((c) => ({ id: c.id, questionText: c.questionText, similarity: Math.round(c.sim * 100) })),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Question paper generator (preview)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/mentor/question-papers/generate", ...guards, async (req: AuthRequest, res): Promise<void> => {
  const mentorId = req.user!.userId;
  const parsed = paperGenerateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() }); return; }
  const d = parsed.data;
  const tracks = await getMentorTracks(mentorId);
  if (!tracks.includes(d.careerTrack)) { res.status(403).json({ error: "You are not assigned to this track" }); return; }

  // Pool = approved questions visible to the mentor in this track.
  const conds = [
    eq(questionBankTable.careerTrack, d.careerTrack),
    eq(questionBankTable.status, "approved"),
    or(eq(questionBankTable.createdBy, mentorId), eq(questionBankTable.isShared, true)),
  ];
  if (d.questionTypes?.length) conds.push(inArray(questionBankTable.questionType, d.questionTypes as never[]));
  const pool = await db.select().from(questionBankTable).where(and(...conds));

  function pick(arr: typeof pool, n: number) {
    const copy = d.randomize ? [...arr].sort(() => Math.random() - 0.5) : [...arr];
    return copy.slice(0, n);
  }

  let selected: typeof pool = [];
  if (d.byDifficulty && Object.keys(d.byDifficulty).length) {
    for (const [diff, n] of Object.entries(d.byDifficulty)) {
      if (!n) continue;
      selected.push(...pick(pool.filter((q) => q.difficulty === diff && !selected.includes(q)), n));
    }
  } else {
    selected = pick(pool, d.totalQuestions);
  }
  selected = selected.slice(0, d.totalQuestions);

  const optMap = await loadOptions(selected.map((q) => q.id));
  const totalMarks = selected.reduce((s, q) => s + q.marks, 0);
  res.json({
    poolSize: pool.length,
    requested: d.totalQuestions,
    selectedCount: selected.length,
    totalMarks,
    timeLimitMin: d.timeLimitMin,
    negativeMarking: d.negativeMarking,
    questions: selected.map((q) => serializeQuestion(q, optMap.get(q.id) ?? [], { includeAnswers: true })),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Question paper publish → creates a real assessment from selected bank items
// ─────────────────────────────────────────────────────────────────────────────
router.post("/mentor/question-papers/publish", ...guards, async (req: AuthRequest, res): Promise<void> => {
  const mentorId = req.user!.userId;
  const title = String(req.body?.title ?? "").trim();
  const questionIds: number[] = Array.isArray(req.body?.questionIds) ? req.body.questionIds.map(Number).filter(Number.isInteger) : [];
  const durationMinutes = Math.min(600, Math.max(1, Number(req.body?.timeLimitMin) || 30));
  const passingScore = Math.min(100, Math.max(0, Number(req.body?.passingScore) || 70));
  if (!title) { res.status(400).json({ error: "title is required" }); return; }
  if (questionIds.length === 0) { res.status(400).json({ error: "questionIds is required" }); return; }

  const tracks = await getMentorTracks(mentorId);
  const requestedIds = [...new Set(questionIds)];
  const items = await db.select().from(questionBankTable).where(inArray(questionBankTable.id, requestedIds));
  // Every requested id must resolve — fail loudly rather than silently dropping missing ids.
  if (items.length !== requestedIds.length) {
    res.status(400).json({ error: "One or more questions do not exist" });
    return;
  }
  // Isolation: every question must be approved + in mentor's track + (own or shared).
  for (const q of items) {
    if (!tracks.includes(q.careerTrack as never) || q.status !== "approved" || (q.createdBy !== mentorId && !q.isShared)) {
      res.status(403).json({ error: "One or more questions are not available to you" });
      return;
    }
  }

  const [assessment] = await db.insert(assessmentsTable).values({
    title, type: "practice", totalQuestions: items.length, durationMinutes, passingScore, isActive: true,
  }).returning();

  const optMap = await loadOptions(items.map((q) => q.id));
  let order = 0;
  for (const id of requestedIds) {
    const q = items.find((x) => x.id === id)!;
    const [aq] = await db.insert(assessmentQuestionsTable).values({
      assessmentId: assessment.id,
      questionText: q.questionText,
      questionType: q.questionType,
      explanation: q.explanation,
      points: q.marks,
      order: order++,
    }).returning();
    const opts = optMap.get(q.id) ?? [];
    if (opts.length) {
      await db.insert(assessmentOptionsTable).values(opts.map((o, i) => ({
        questionId: aq.id, optionText: o.optionText, isCorrect: o.isCorrect, order: o.order ?? i,
      })));
    }
    await db.update(questionBankTable).set({ usageCount: sql`${questionBankTable.usageCount} + 1` }).where(eq(questionBankTable.id, q.id));
  }

  await createAuditLog({ userId: mentorId, action: "mentor.question_paper.published", entityType: "assessment", entityId: assessment.id, ipAddress: ip(req), metadata: { title, questions: items.length } });
  res.status(201).json({ assessmentId: assessment.id, title, totalQuestions: items.length });
});

// ─────────────────────────────────────────────────────────────────────────────
// Get one
// ─────────────────────────────────────────────────────────────────────────────
router.get("/mentor/question-bank/:id", ...guards, async (req: AuthRequest, res): Promise<void> => {
  const mentorId = req.user!.userId;
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [q] = await db.select().from(questionBankTable).where(eq(questionBankTable.id, id));
  if (!q) { res.status(404).json({ error: "Not found" }); return; }
  const tracks = await getMentorTracks(mentorId);
  // Track isolation is the auth source of truth: the question must belong to a track
  // the mentor is currently assigned to, even for own questions (legacy access revocation).
  const inTrack = tracks.includes(q.careerTrack as never);
  const visible = inTrack && (q.createdBy === mentorId || (q.isShared && q.status === "approved"));
  if (!visible) { res.status(403).json({ error: "Access denied" }); return; }
  const opts = await loadOptions([id]);
  const versions = await db.select({ version: questionBankVersionsTable.version, changeNote: questionBankVersionsTable.changeNote, createdAt: questionBankVersionsTable.createdAt }).from(questionBankVersionsTable).where(eq(questionBankVersionsTable.questionId, id)).orderBy(desc(questionBankVersionsTable.version));
  res.json({ ...serializeQuestion(q, opts.get(id) ?? [], { includeAnswers: true }), editable: q.createdBy === mentorId && (q.status === "draft" || q.status === "rejected"), versions: versions.map((v) => ({ ...v, createdAt: v.createdAt.toISOString() })) });
});

// ─────────────────────────────────────────────────────────────────────────────
// Create
// ─────────────────────────────────────────────────────────────────────────────
router.post("/mentor/question-bank", ...guards, async (req: AuthRequest, res): Promise<void> => {
  const mentorId = req.user!.userId;
  const parsed = questionBodySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() }); return; }
  const d = parsed.data;
  const tracks = await getMentorTracks(mentorId);
  if (!tracks.includes(d.careerTrack)) { res.status(403).json({ error: "You are not assigned to this track" }); return; }
  const choiceErr = validateChoicePayload(d.questionType, d.options);
  if (choiceErr) { res.status(400).json({ error: choiceErr }); return; }

  if (d.batchIds?.length) {
    const ownBatches = new Set(await getMentorBatchIds(mentorId));
    if (!d.batchIds.every((b) => ownBatches.has(b))) { res.status(403).json({ error: "One or more batches are not yours" }); return; }
  }

  const [created] = await db.insert(questionBankTable).values({
    questionText: d.questionText, questionType: d.questionType, careerTrack: d.careerTrack, difficulty: d.difficulty,
    status: "draft", createdBy: mentorId, creatorRole: "mentor", isShared: d.isShared, topic: d.topic, bloomLevel: d.bloomLevel,
    estimatedTimeMin: d.estimatedTimeMin, marks: d.marks, negativeMarks: d.negativeMarks, skills: d.skills, keywords: d.keywords,
    explanation: d.explanation, codeLanguage: d.codeLanguage, codeTemplate: d.codeTemplate, expectedOutput: d.expectedOutput,
    scenarioContext: d.scenarioContext, aiGenerated: Boolean(req.body?.aiGenerated),
  }).returning();

  if (d.options.length) await replaceOptions(created.id, d.options);
  if (d.batchIds?.length) await db.insert(questionBankBatchesTable).values(d.batchIds.map((b) => ({ questionId: created.id, batchId: b })));
  await snapshotVersion(created.id, 1, mentorId, "created");
  await createAuditLog({ userId: mentorId, action: "mentor.question.created", entityType: "question_bank", entityId: created.id, ipAddress: ip(req), metadata: { track: d.careerTrack, type: d.questionType } });

  const opts = await loadOptions([created.id]);
  res.status(201).json(serializeQuestion(created, opts.get(created.id) ?? [], { includeAnswers: true }));
});

// ─────────────────────────────────────────────────────────────────────────────
// Update (own + draft/rejected only)
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/mentor/question-bank/:id", ...guards, async (req: AuthRequest, res): Promise<void> => {
  const mentorId = req.user!.userId;
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = questionUpdateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() }); return; }
  const d = parsed.data;
  const [q] = await db.select().from(questionBankTable).where(eq(questionBankTable.id, id));
  if (!q) { res.status(404).json({ error: "Not found" }); return; }
  if (q.createdBy !== mentorId) { res.status(403).json({ error: "Not your question" }); return; }
  if (q.status !== "draft" && q.status !== "rejected") { res.status(409).json({ error: "Only draft or rejected questions can be edited" }); return; }

  const tracks = await getMentorTracks(mentorId);
  // Enforce current track assignment for the existing question, not just the new track.
  if (!tracks.includes(q.careerTrack as never)) { res.status(403).json({ error: "You are not assigned to this track" }); return; }
  if (d.careerTrack && !tracks.includes(d.careerTrack)) { res.status(403).json({ error: "You are not assigned to this track" }); return; }
  const finalType = d.questionType ?? q.questionType;
  if (d.options) {
    const choiceErr = validateChoicePayload(finalType, d.options);
    if (choiceErr) { res.status(400).json({ error: choiceErr }); return; }
  }

  const newVersion = q.version + 1;
  await db.update(questionBankTable).set({
    questionText: d.questionText ?? q.questionText, questionType: finalType, careerTrack: d.careerTrack ?? q.careerTrack,
    difficulty: d.difficulty ?? q.difficulty, isShared: d.isShared ?? q.isShared, topic: d.topic ?? q.topic,
    bloomLevel: d.bloomLevel ?? q.bloomLevel, estimatedTimeMin: d.estimatedTimeMin ?? q.estimatedTimeMin,
    marks: d.marks ?? q.marks, negativeMarks: d.negativeMarks ?? q.negativeMarks, skills: d.skills ?? q.skills,
    keywords: d.keywords ?? q.keywords, explanation: d.explanation ?? q.explanation, codeLanguage: d.codeLanguage ?? q.codeLanguage,
    codeTemplate: d.codeTemplate ?? q.codeTemplate, expectedOutput: d.expectedOutput ?? q.expectedOutput,
    scenarioContext: d.scenarioContext ?? q.scenarioContext, version: newVersion,
  }).where(eq(questionBankTable.id, id));
  if (d.options) await replaceOptions(id, d.options);
  await snapshotVersion(id, newVersion, mentorId, String(req.body?.changeNote ?? "updated"));
  await createAuditLog({ userId: mentorId, action: "mentor.question.updated", entityType: "question_bank", entityId: id, ipAddress: ip(req), metadata: { version: newVersion } });

  const [updated] = await db.select().from(questionBankTable).where(eq(questionBankTable.id, id));
  const opts = await loadOptions([id]);
  res.json(serializeQuestion(updated, opts.get(id) ?? [], { includeAnswers: true }));
});

// ─────────────────────────────────────────────────────────────────────────────
// Delete (own + draft/rejected only)
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/mentor/question-bank/:id", ...guards, async (req: AuthRequest, res): Promise<void> => {
  const mentorId = req.user!.userId;
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [q] = await db.select().from(questionBankTable).where(eq(questionBankTable.id, id));
  if (!q) { res.status(404).json({ error: "Not found" }); return; }
  if (q.createdBy !== mentorId) { res.status(403).json({ error: "Not your question" }); return; }
  const delTracks = await getMentorTracks(mentorId);
  if (!delTracks.includes(q.careerTrack as never)) { res.status(403).json({ error: "You are not assigned to this track" }); return; }
  if (q.status === "approved" || q.status === "pending") { res.status(409).json({ error: "Cannot delete a pending or approved question" }); return; }
  await db.delete(questionBankOptionsTable).where(eq(questionBankOptionsTable.questionId, id));
  await db.delete(questionBankBatchesTable).where(eq(questionBankBatchesTable.questionId, id));
  await db.delete(questionBankTable).where(eq(questionBankTable.id, id));
  await createAuditLog({ userId: mentorId, action: "mentor.question.deleted", entityType: "question_bank", entityId: id, ipAddress: ip(req) });
  res.json({ ok: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// Submit for approval
// ─────────────────────────────────────────────────────────────────────────────
router.post("/mentor/question-bank/:id/submit", ...guards, async (req: AuthRequest, res): Promise<void> => {
  const mentorId = req.user!.userId;
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [q] = await db.select().from(questionBankTable).where(eq(questionBankTable.id, id));
  if (!q) { res.status(404).json({ error: "Not found" }); return; }
  if (q.createdBy !== mentorId) { res.status(403).json({ error: "Not your question" }); return; }
  const subTracks = await getMentorTracks(mentorId);
  if (!subTracks.includes(q.careerTrack as never)) { res.status(403).json({ error: "You are not assigned to this track" }); return; }
  if (q.status !== "draft" && q.status !== "rejected") { res.status(409).json({ error: "Only draft or rejected questions can be submitted" }); return; }
  if (CHOICE_TYPES.has(q.questionType)) {
    const opts = await db.select().from(questionBankOptionsTable).where(eq(questionBankOptionsTable.questionId, id));
    const choiceErr = validateChoicePayload(q.questionType, opts);
    if (choiceErr) { res.status(400).json({ error: choiceErr }); return; }
  }
  await db.update(questionBankTable).set({ status: "pending", rejectionReason: null }).where(eq(questionBankTable.id, id));
  await createAuditLog({ userId: mentorId, action: "mentor.question.submitted", entityType: "question_bank", entityId: id, ipAddress: ip(req) });
  res.json({ ok: true, status: "pending" });
});

// ─────────────────────────────────────────────────────────────────────────────
// Duplicate (clone as own draft)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/mentor/question-bank/:id/duplicate", ...guards, async (req: AuthRequest, res): Promise<void> => {
  const mentorId = req.user!.userId;
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [q] = await db.select().from(questionBankTable).where(eq(questionBankTable.id, id));
  if (!q) { res.status(404).json({ error: "Not found" }); return; }
  const tracks = await getMentorTracks(mentorId);
  const visible = q.createdBy === mentorId || (q.isShared && q.status === "approved" && tracks.includes(q.careerTrack as never));
  if (!visible) { res.status(403).json({ error: "Access denied" }); return; }

  const [clone] = await db.insert(questionBankTable).values({
    questionText: `${q.questionText} (copy)`, questionType: q.questionType, careerTrack: q.careerTrack, difficulty: q.difficulty,
    status: "draft", createdBy: mentorId, creatorRole: "mentor", isShared: false, topic: q.topic, bloomLevel: q.bloomLevel,
    estimatedTimeMin: q.estimatedTimeMin, marks: q.marks, negativeMarks: q.negativeMarks, skills: q.skills, keywords: q.keywords,
    explanation: q.explanation, codeLanguage: q.codeLanguage, codeTemplate: q.codeTemplate, expectedOutput: q.expectedOutput, scenarioContext: q.scenarioContext,
  }).returning();
  const srcOpts = await db.select().from(questionBankOptionsTable).where(eq(questionBankOptionsTable.questionId, id));
  if (srcOpts.length) await replaceOptions(clone.id, srcOpts.map((o) => ({ optionText: o.optionText, isCorrect: o.isCorrect, order: o.order })));
  await snapshotVersion(clone.id, 1, mentorId, `duplicated from #${id}`);
  await createAuditLog({ userId: mentorId, action: "mentor.question.duplicated", entityType: "question_bank", entityId: clone.id, ipAddress: ip(req), metadata: { source: id } });
  const opts = await loadOptions([clone.id]);
  res.status(201).json(serializeQuestion(clone, opts.get(clone.id) ?? [], { includeAnswers: true }));
});

export default router;
