import { Router } from "express";
import { eq, and, or, desc, ilike, inArray, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  questionBankTable,
  questionBankOptionsTable,
  questionBankVersionsTable,
} from "@workspace/db";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth";
import { createAuditLog } from "../lib/audit";
import { createNotification } from "../lib/notifications";
import {
  loadOptions,
  serializeQuestion,
  snapshotVersion,
  replaceOptions,
  questionBodySchema,
  questionUpdateSchema,
  validateChoicePayload,
  CHOICE_TYPES,
} from "../lib/question-bank";

const router = Router();

function ip(req: AuthRequest): string {
  const f = req.headers["x-forwarded-for"];
  if (typeof f === "string") return f.split(",")[0].trim();
  return req.socket.remoteAddress ?? "unknown";
}

const guards = [requireAuth, requireRole("admin")];

// ─────────────────────────────────────────────────────────────────────────────
// Analytics (precede /:id)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/admin/question-bank/analytics", ...guards, async (_req: AuthRequest, res): Promise<void> => {
  const rows = await db.select().from(questionBankTable);
  const byStatus: Record<string, number> = {};
  const byTrack: Record<string, number> = {};
  const byType: Record<string, number> = {};
  for (const r of rows) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    byTrack[r.careerTrack] = (byTrack[r.careerTrack] ?? 0) + 1;
    byType[r.questionType] = (byType[r.questionType] ?? 0) + 1;
  }
  res.json({ total: rows.length, byStatus, byTrack, byType, pending: byStatus["pending"] ?? 0 });
});

// ─────────────────────────────────────────────────────────────────────────────
// CSV export (precede /:id)
// ─────────────────────────────────────────────────────────────────────────────
function csvCell(v: unknown): string {
  const s = v == null ? "" : Array.isArray(v) ? v.join("; ") : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

router.get("/admin/question-bank/export.csv", ...guards, async (_req: AuthRequest, res): Promise<void> => {
  const rows = await db.select().from(questionBankTable).orderBy(desc(questionBankTable.createdAt));
  const header = ["id", "questionText", "questionType", "careerTrack", "difficulty", "status", "createdBy", "topic", "marks", "negativeMarks", "skills", "keywords", "usageCount", "createdAt"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push([r.id, r.questionText, r.questionType, r.careerTrack, r.difficulty, r.status, r.createdBy, r.topic, r.marks, r.negativeMarks, r.skills, r.keywords, r.usageCount, r.createdAt.toISOString()].map(csvCell).join(","));
  }
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="question-bank-all.csv"');
  res.send(lines.join("\n"));
});

// ─────────────────────────────────────────────────────────────────────────────
// Pending approval queue (precede /:id)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/admin/question-bank/pending", ...guards, async (_req: AuthRequest, res): Promise<void> => {
  const rows = await db.select().from(questionBankTable).where(eq(questionBankTable.status, "pending")).orderBy(desc(questionBankTable.updatedAt));
  const optMap = await loadOptions(rows.map((r) => r.id));
  res.json({ items: rows.map((r) => serializeQuestion(r, optMap.get(r.id) ?? [], { includeAnswers: true })) });
});

// ─────────────────────────────────────────────────────────────────────────────
// Global library list with filters + pagination
// ─────────────────────────────────────────────────────────────────────────────
router.get("/admin/question-bank", ...guards, async (req: AuthRequest, res): Promise<void> => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
  const conds = [] as ReturnType<typeof eq>[];
  if (req.query.track) conds.push(eq(questionBankTable.careerTrack, String(req.query.track) as never));
  if (req.query.type) conds.push(eq(questionBankTable.questionType, String(req.query.type) as never));
  if (req.query.difficulty) conds.push(eq(questionBankTable.difficulty, String(req.query.difficulty) as never));
  if (req.query.status) conds.push(eq(questionBankTable.status, String(req.query.status) as never));
  if (req.query.topic) conds.push(ilike(questionBankTable.topic, `%${String(req.query.topic)}%`));
  if (req.query.q) {
    const term = `%${String(req.query.q)}%`;
    conds.push(or(ilike(questionBankTable.questionText, term), ilike(questionBankTable.topic, term))!);
  }
  const where = conds.length ? and(...conds) : undefined;
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(questionBankTable).where(where);
  const rows = await db.select().from(questionBankTable).where(where).orderBy(desc(questionBankTable.updatedAt)).limit(pageSize).offset((page - 1) * pageSize);
  const optMap = await loadOptions(rows.map((r) => r.id));
  res.json({ items: rows.map((r) => serializeQuestion(r, optMap.get(r.id) ?? [], { includeAnswers: true })), total: count, page, pageSize });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bulk CSV/JSON import (admin authored, approved by default)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/admin/question-bank/import", ...guards, async (req: AuthRequest, res): Promise<void> => {
  const adminId = req.user!.userId;
  const items = Array.isArray(req.body?.items) ? req.body.items : null;
  if (!items) { res.status(400).json({ error: "Body must be { items: [...] }" }); return; }
  const created: number[] = [];
  const errors: { index: number; error: string }[] = [];
  for (let i = 0; i < items.length; i++) {
    const parsed = questionBodySchema.safeParse(items[i]);
    if (!parsed.success) { errors.push({ index: i, error: "Invalid shape" }); continue; }
    const d = parsed.data;
    const choiceErr = validateChoicePayload(d.questionType, d.options);
    if (choiceErr) { errors.push({ index: i, error: choiceErr }); continue; }
    const [row] = await db.insert(questionBankTable).values({
      questionText: d.questionText, questionType: d.questionType, careerTrack: d.careerTrack, difficulty: d.difficulty,
      status: "approved", createdBy: adminId, creatorRole: "admin", approvedBy: adminId, approvedAt: new Date(),
      isShared: true, topic: d.topic, bloomLevel: d.bloomLevel, estimatedTimeMin: d.estimatedTimeMin, marks: d.marks,
      negativeMarks: d.negativeMarks, skills: d.skills, keywords: d.keywords, explanation: d.explanation,
      codeLanguage: d.codeLanguage, codeTemplate: d.codeTemplate, expectedOutput: d.expectedOutput, scenarioContext: d.scenarioContext,
    }).returning();
    if (d.options.length) await replaceOptions(row.id, d.options);
    await snapshotVersion(row.id, 1, adminId, "imported");
    created.push(row.id);
  }
  await createAuditLog({ userId: adminId, action: "admin.question.imported", entityType: "question_bank", entityId: 0, ipAddress: ip(req), metadata: { created: created.length, errors: errors.length } });
  res.status(201).json({ created: created.length, failed: errors.length, errors });
});

// ─────────────────────────────────────────────────────────────────────────────
// Get one (with full version history)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/admin/question-bank/:id", ...guards, async (req: AuthRequest, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [q] = await db.select().from(questionBankTable).where(eq(questionBankTable.id, id));
  if (!q) { res.status(404).json({ error: "Not found" }); return; }
  const opts = await loadOptions([id]);
  const versions = await db.select().from(questionBankVersionsTable).where(eq(questionBankVersionsTable.questionId, id)).orderBy(desc(questionBankVersionsTable.version));
  res.json({ ...serializeQuestion(q, opts.get(id) ?? [], { includeAnswers: true }), versions: versions.map((v) => ({ version: v.version, changeNote: v.changeNote, changedBy: v.changedBy, snapshot: v.snapshot, createdAt: v.createdAt.toISOString() })) });
});

// ─────────────────────────────────────────────────────────────────────────────
// Approve
// ─────────────────────────────────────────────────────────────────────────────
router.post("/admin/question-bank/:id/approve", ...guards, async (req: AuthRequest, res): Promise<void> => {
  const adminId = req.user!.userId;
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [q] = await db.select().from(questionBankTable).where(eq(questionBankTable.id, id));
  if (!q) { res.status(404).json({ error: "Not found" }); return; }
  if (q.status !== "pending") { res.status(409).json({ error: "Only pending questions can be approved" }); return; }
  const shared = req.body?.isShared === undefined ? q.isShared : Boolean(req.body.isShared);
  await db.update(questionBankTable).set({ status: "approved", approvedBy: adminId, approvedAt: new Date(), rejectionReason: null, isShared: shared }).where(eq(questionBankTable.id, id));
  await createAuditLog({ userId: adminId, action: "admin.question.approved", entityType: "question_bank", entityId: id, ipAddress: ip(req) });
  await createNotification({ userId: q.createdBy, role: "mentor", title: "Question approved", message: `Your question "${q.questionText.slice(0, 60)}" was approved.`, type: "system", entityType: "question_bank", entityId: id, link: "/mentor/question-bank" });
  res.json({ ok: true, status: "approved" });
});

// ─────────────────────────────────────────────────────────────────────────────
// Reject
// ─────────────────────────────────────────────────────────────────────────────
router.post("/admin/question-bank/:id/reject", ...guards, async (req: AuthRequest, res): Promise<void> => {
  const adminId = req.user!.userId;
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const reason = String(req.body?.reason ?? "").trim();
  if (!reason) { res.status(400).json({ error: "reason is required" }); return; }
  const [q] = await db.select().from(questionBankTable).where(eq(questionBankTable.id, id));
  if (!q) { res.status(404).json({ error: "Not found" }); return; }
  if (q.status !== "pending") { res.status(409).json({ error: "Only pending questions can be rejected" }); return; }
  await db.update(questionBankTable).set({ status: "rejected", rejectionReason: reason }).where(eq(questionBankTable.id, id));
  await createAuditLog({ userId: adminId, action: "admin.question.rejected", entityType: "question_bank", entityId: id, ipAddress: ip(req), metadata: { reason } });
  await createNotification({ userId: q.createdBy, role: "mentor", title: "Question needs revision", message: `Your question was sent back: ${reason.slice(0, 120)}`, type: "system", entityType: "question_bank", entityId: id, link: "/mentor/question-bank" });
  res.json({ ok: true, status: "rejected" });
});

// ─────────────────────────────────────────────────────────────────────────────
// Create (admin → approved immediately)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/admin/question-bank", ...guards, async (req: AuthRequest, res): Promise<void> => {
  const adminId = req.user!.userId;
  const parsed = questionBodySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() }); return; }
  const d = parsed.data;
  const choiceErr = validateChoicePayload(d.questionType, d.options);
  if (choiceErr) { res.status(400).json({ error: choiceErr }); return; }
  const [created] = await db.insert(questionBankTable).values({
    questionText: d.questionText, questionType: d.questionType, careerTrack: d.careerTrack, difficulty: d.difficulty,
    status: "approved", createdBy: adminId, creatorRole: "admin", approvedBy: adminId, approvedAt: new Date(), isShared: d.isShared,
    topic: d.topic, bloomLevel: d.bloomLevel, estimatedTimeMin: d.estimatedTimeMin, marks: d.marks, negativeMarks: d.negativeMarks,
    skills: d.skills, keywords: d.keywords, explanation: d.explanation, codeLanguage: d.codeLanguage, codeTemplate: d.codeTemplate,
    expectedOutput: d.expectedOutput, scenarioContext: d.scenarioContext, aiGenerated: Boolean(req.body?.aiGenerated),
  }).returning();
  if (d.options.length) await replaceOptions(created.id, d.options);
  await snapshotVersion(created.id, 1, adminId, "created");
  await createAuditLog({ userId: adminId, action: "admin.question.created", entityType: "question_bank", entityId: created.id, ipAddress: ip(req) });
  const opts = await loadOptions([created.id]);
  res.status(201).json(serializeQuestion(created, opts.get(created.id) ?? [], { includeAnswers: true }));
});

// ─────────────────────────────────────────────────────────────────────────────
// Update any
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/admin/question-bank/:id", ...guards, async (req: AuthRequest, res): Promise<void> => {
  const adminId = req.user!.userId;
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = questionUpdateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() }); return; }
  const d = parsed.data;
  const [q] = await db.select().from(questionBankTable).where(eq(questionBankTable.id, id));
  if (!q) { res.status(404).json({ error: "Not found" }); return; }
  const finalType = d.questionType ?? q.questionType;
  if (d.options) {
    const choiceErr = validateChoicePayload(finalType, d.options);
    if (choiceErr) { res.status(400).json({ error: choiceErr }); return; }
  }
  const newVersion = q.version + 1;
  await db.update(questionBankTable).set({
    questionText: d.questionText ?? q.questionText, questionType: finalType, careerTrack: d.careerTrack ?? q.careerTrack,
    difficulty: d.difficulty ?? q.difficulty, isShared: d.isShared ?? q.isShared, topic: d.topic ?? q.topic,
    bloomLevel: d.bloomLevel ?? q.bloomLevel, estimatedTimeMin: d.estimatedTimeMin ?? q.estimatedTimeMin, marks: d.marks ?? q.marks,
    negativeMarks: d.negativeMarks ?? q.negativeMarks, skills: d.skills ?? q.skills, keywords: d.keywords ?? q.keywords,
    explanation: d.explanation ?? q.explanation, codeLanguage: d.codeLanguage ?? q.codeLanguage, codeTemplate: d.codeTemplate ?? q.codeTemplate,
    expectedOutput: d.expectedOutput ?? q.expectedOutput, scenarioContext: d.scenarioContext ?? q.scenarioContext, version: newVersion,
  }).where(eq(questionBankTable.id, id));
  if (d.options) await replaceOptions(id, d.options);
  await snapshotVersion(id, newVersion, adminId, String(req.body?.changeNote ?? "admin edit"));
  await createAuditLog({ userId: adminId, action: "admin.question.updated", entityType: "question_bank", entityId: id, ipAddress: ip(req), metadata: { version: newVersion } });
  const [updated] = await db.select().from(questionBankTable).where(eq(questionBankTable.id, id));
  const opts = await loadOptions([id]);
  res.json(serializeQuestion(updated, opts.get(id) ?? [], { includeAnswers: true }));
});

// ─────────────────────────────────────────────────────────────────────────────
// Delete any
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/admin/question-bank/:id", ...guards, async (req: AuthRequest, res): Promise<void> => {
  const adminId = req.user!.userId;
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [q] = await db.select().from(questionBankTable).where(eq(questionBankTable.id, id));
  if (!q) { res.status(404).json({ error: "Not found" }); return; }
  await db.delete(questionBankOptionsTable).where(eq(questionBankOptionsTable.questionId, id));
  await db.delete(questionBankTable).where(eq(questionBankTable.id, id));
  await createAuditLog({ userId: adminId, action: "admin.question.deleted", entityType: "question_bank", entityId: id, ipAddress: ip(req) });
  res.json({ ok: true });
});

export default router;
