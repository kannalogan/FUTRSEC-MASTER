import { Router } from "express";
import { eq, and, count, max, isNotNull } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  usersTable,
  studentProfilesTable,
  ftsScoresTable,
  labAttemptsTable,
  moduleEnrollmentsTable,
  jobApplicationsTable,
  aiInterviewsTable,
  aiHistoryTable,
  aiReportsTable,
  aiCareerReportsTable,
  aiSkillGapReportsTable,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { getUserCareerTrack } from "../lib/track-access";
import { createAuditLog } from "../lib/audit";
import {
  generateText,
  generateJSON,
  voiceStatus,
  transcribeAudio,
  synthesizeSpeech,
  getProviderName,
} from "../lib/ai";
import {
  trackName,
  mockExplain,
  mockSummary,
  mockQuiz,
  mockCareerReport,
  mockCareerChat,
  mockEnglishEvaluation,
  mockResumeAnalysis,
  trackResumeKeywords,
  computePlacementReadiness,
  type CareerContext,
  type ExplainResult,
  type SummaryResult,
  type QuizQuestion,
  type CareerReport,
  type EnglishEvaluation,
  type ResumeAnalysis,
} from "../lib/ai/mock-content";
import { fetchResumeText } from "../lib/ai/resume";

const router = Router();

function getIp(req: AuthRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.socket.remoteAddress ?? "unknown";
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

async function persistHistory(
  userId: number,
  sessionId: string,
  role: "user" | "assistant",
  content: string,
  model?: string,
): Promise<void> {
  try {
    await db.insert(aiHistoryTable).values({ userId, sessionId, role, content, model });
  } catch {
    /* history is best-effort */
  }
}

/* ============================ AI Explain Tutor ============================ */

router.post("/ai/tutor/explain", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const topic = str(req.body?.topic).trim();
  if (!topic) { res.status(400).json({ error: "topic is required" }); return; }
  const level: "beginner" | "advanced" = req.body?.level === "advanced" ? "advanced" : "beginner";
  const track = await getUserCareerTrack(req.user.userId);
  const name = trackName(track);

  const { data, provider } = await generateJSON<ExplainResult>({
    system: `You are an expert ${name} instructor for FUTRSEC, an Indian cybersecurity training platform. Explain at a ${level} level. Be accurate, practical, and India-job-focused.`,
    user: `Explain the topic "${topic}" for a ${level} learner on the ${name} track. Return JSON with keys: explanation (string), keyPoints (string[]), analogy (string), commonMistakes (string[]), nextSteps (string[]).`,
    maxTokens: 1200,
    mock: () => mockExplain(topic, level, track),
  });

  const sessionId = str(req.body?.sessionId) || `tutor-${req.user.userId}-${Date.now()}`;
  await persistHistory(req.user.userId, sessionId, "user", `Explain: ${topic} (${level})`);
  await persistHistory(req.user.userId, sessionId, "assistant", data.explanation, provider);
  await createAuditLog({
    userId: req.user.userId,
    action: "ai.tutor.explain",
    entityType: "ai_tutor",
    ipAddress: getIp(req),
    metadata: { topic, level, provider },
  });

  res.json({ ...data, provider, sessionId });
});

router.post("/ai/tutor/summarize", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const content = str(req.body?.content).trim();
  if (!content) { res.status(400).json({ error: "content is required" }); return; }

  const { data, provider } = await generateJSON<SummaryResult>({
    system: "You summarize cybersecurity learning material clearly and concisely.",
    user: `Summarize the following. Return JSON with keys: tldr (string), summary (string), bullets (string[]).\n\n${content.slice(0, 6000)}`,
    maxTokens: 800,
    mock: () => mockSummary(content),
  });

  await createAuditLog({
    userId: req.user.userId,
    action: "ai.tutor.summarize",
    entityType: "ai_tutor",
    ipAddress: getIp(req),
    metadata: { provider, length: content.length },
  });
  res.json({ ...data, provider });
});

router.post("/ai/tutor/quiz", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const topic = str(req.body?.topic).trim();
  if (!topic) { res.status(400).json({ error: "topic is required" }); return; }
  const countRaw = Number(req.body?.count);
  const numQ = Number.isFinite(countRaw) ? Math.max(1, Math.min(10, Math.round(countRaw))) : 5;
  const difficulty: "beginner" | "intermediate" | "advanced" =
    req.body?.difficulty === "advanced" ? "advanced" : req.body?.difficulty === "intermediate" ? "intermediate" : "beginner";
  const track = await getUserCareerTrack(req.user.userId);
  const name = trackName(track);

  const { data, provider } = await generateJSON<{ questions: QuizQuestion[] }>({
    system: `You write ${name} multiple-choice quiz questions to test understanding. Each question has exactly 4 options and one correct answer.`,
    user: `Create ${numQ} ${difficulty} multiple-choice questions about "${topic}" for the ${name} track. Return JSON: { "questions": [ { "id": number, "question": string, "options": string[4], "answerIndex": number(0-3), "explanation": string } ] }.`,
    maxTokens: 1600,
    validate: (v): v is { questions: QuizQuestion[] } =>
      typeof v === "object" && v !== null && Array.isArray((v as { questions?: unknown }).questions),
    mock: () => mockQuiz(topic, numQ, difficulty, track),
  });

  await createAuditLog({
    userId: req.user.userId,
    action: "ai.tutor.quiz",
    entityType: "ai_tutor",
    ipAddress: getIp(req),
    metadata: { topic, difficulty, count: numQ, provider },
  });
  res.json({ questions: data.questions, provider });
});

/* ============================ AI English Coach ============================ */

router.post("/ai/english/evaluate", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const text = str(req.body?.text).trim();
  if (!text) { res.status(400).json({ error: "text is required" }); return; }
  const fromVoice = req.body?.fromVoice === true;

  const { data, provider } = await generateJSON<EnglishEvaluation>({
    system:
      "You are an English communication coach for Indian cybersecurity job seekers. Assess grammar, vocabulary, fluency, confidence, and (only if spoken) pronunciation. Scores are 0-100.",
    user: `Evaluate this ${fromVoice ? "spoken (transcribed)" : "written"} sample. Return JSON with keys: scores {grammar,vocabulary,fluency,confidence,pronunciation}, overall (number), corrections [{original,suggestion,explanation}], highlights (string[]), roadmap [{area,level,actions[]}], summary (string), pronunciationNote (string).\n\nSAMPLE:\n${text.slice(0, 4000)}`,
    maxTokens: 1400,
    mock: () => mockEnglishEvaluation(text, fromVoice),
  });

  await createAuditLog({
    userId: req.user.userId,
    action: "ai.english.evaluate",
    entityType: "ai_english",
    ipAddress: getIp(req),
    metadata: { provider, fromVoice, overall: data.overall },
  });
  res.json({ ...data, provider });
});

/* ============================ AI Career Coach ============================ */

async function loadCareerContext(userId: number): Promise<CareerContext> {
  const track = await getUserCareerTrack(userId);
  const [user, profile, fts, labsDone, modulesDone, interviewAgg, appsAgg] = await Promise.all([
    db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) }),
    db.query.studentProfilesTable.findFirst({ where: eq(studentProfilesTable.userId, userId) }),
    db.query.ftsScoresTable.findFirst({ where: eq(ftsScoresTable.userId, userId) }),
    db
      .select({ c: count() })
      .from(labAttemptsTable)
      .where(and(eq(labAttemptsTable.userId, userId), eq(labAttemptsTable.status, "completed"))),
    db
      .select({ c: count() })
      .from(moduleEnrollmentsTable)
      .where(and(eq(moduleEnrollmentsTable.userId, userId), isNotNull(moduleEnrollmentsTable.completedAt))),
    db
      .select({ c: count(), best: max(aiInterviewsTable.overallScore) })
      .from(aiInterviewsTable)
      .where(and(eq(aiInterviewsTable.userId, userId), eq(aiInterviewsTable.status, "completed"))),
    db
      .select({ c: count() })
      .from(jobApplicationsTable)
      .where(eq(jobApplicationsTable.studentId, userId)),
  ]);

  return {
    trackSlug: track,
    fullName: user?.fullName ?? null,
    ftsScore: fts?.totalScore != null ? Math.round(fts.totalScore) : 0,
    labsCompleted: Number(labsDone[0]?.c ?? 0),
    modulesCompleted: Number(modulesDone[0]?.c ?? 0),
    interviewsTaken: Number(interviewAgg[0]?.c ?? 0),
    bestInterviewScore: interviewAgg[0]?.best != null ? Number(interviewAgg[0].best) : null,
    hasResume: Boolean(profile?.resumeUrl),
    applications: Number(appsAgg[0]?.c ?? 0),
  };
}

router.post("/ai/career/chat", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const message = str(req.body?.message).trim();
  if (!message) { res.status(400).json({ error: "message is required" }); return; }
  const ctx = await loadCareerContext(req.user.userId);
  const name = trackName(ctx.trackSlug);
  const readiness = computePlacementReadiness(ctx);

  const { text, provider } = await generateText({
    system: `You are a career coach for FUTRSEC on the ${name} track. The learner's stats: FTS ${ctx.ftsScore}/100, ${ctx.labsCompleted} labs, ${ctx.modulesCompleted} modules, ${ctx.interviewsTaken} mock interviews, placement readiness ${readiness.score}/100, resume ${ctx.hasResume ? "uploaded" : "missing"}. Give specific, India-focused, actionable advice.`,
    user: message,
    maxTokens: 900,
    mock: () => mockCareerChat(message, ctx),
  });

  const sessionId = str(req.body?.sessionId) || `career-${req.user.userId}`;
  await persistHistory(req.user.userId, sessionId, "user", message);
  await persistHistory(req.user.userId, sessionId, "assistant", text, provider);
  await createAuditLog({
    userId: req.user.userId,
    action: "ai.career.chat",
    entityType: "ai_career",
    ipAddress: getIp(req),
    metadata: { provider },
  });
  res.json({ reply: text, provider, sessionId });
});

router.get("/ai/career/report", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const ctx = await loadCareerContext(req.user.userId);
  const name = trackName(ctx.trackSlug);

  const { data, provider } = await generateJSON<CareerReport>({
    system: `You are an expert ${name} career advisor for the Indian job market. Produce a complete, realistic career report. Salary is in INR LPA.`,
    user: `Build a career report for a ${name} learner with: FTS ${ctx.ftsScore}/100, ${ctx.labsCompleted} labs completed, ${ctx.modulesCompleted} modules completed, ${ctx.interviewsTaken} mock interviews (best ${ctx.bestInterviewScore ?? "n/a"}), resume ${ctx.hasResume ? "uploaded" : "missing"}, ${ctx.applications} applications. Return JSON with keys: skillGap {current[],required[],gap[],summary}, roadmap [{phase,title,durationWeeks,focus[]}], certifications [{name,provider,level,why}], targetCompanies [{name,roles[],location,tier}], expectedSalary {currency,fresher{min,max},mid{min,max},senior{min,max},note}, placementReadiness {score,level,factors[{label,score,max,note}],summary}.`,
    maxTokens: 2200,
    mock: () => mockCareerReport(ctx),
  });

  // Always trust our computed placement readiness (grounded in real DB signals).
  data.placementReadiness = computePlacementReadiness(ctx);

  // Persist structured reports (best-effort).
  try {
    await db.insert(aiSkillGapReportsTable).values({
      userId: req.user.userId,
      currentSkills: data.skillGap.current,
      requiredSkills: data.skillGap.required,
      gapSkills: data.skillGap.gap,
      recommendations: data.skillGap.summary,
    });
    await db.insert(aiCareerReportsTable).values({
      userId: req.user.userId,
      currentRole: `${name} (learner)`,
      targetRole: `${name}`,
      roadmap: JSON.stringify(data.roadmap),
      timelineMonths: Math.ceil(data.roadmap.reduce((s, p) => s + p.durationWeeks, 0) / 4),
      confidence: data.placementReadiness.score,
    });
    await db.insert(aiReportsTable).values({
      userId: req.user.userId,
      entityType: "career",
      entityId: req.user.userId,
      reportType: "career_report",
      content: JSON.stringify(data),
      metadata: JSON.stringify({ provider }),
    });
  } catch (err) {
    req.log.warn({ err }, "Failed to persist career report");
  }

  await createAuditLog({
    userId: req.user.userId,
    action: "ai.career.report",
    entityType: "ai_career",
    entityId: req.user.userId,
    ipAddress: getIp(req),
    metadata: { provider, readiness: data.placementReadiness.score },
  });

  res.json({ ...data, context: { ...ctx, trackName: name }, provider });
});

/* Lightweight standalone endpoints reused by skill-gap & placement pages. */

router.get("/ai/career/skill-gap", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const ctx = await loadCareerContext(req.user.userId);
  const report = mockCareerReport(ctx);
  res.json({ ...report.skillGap, track: ctx.trackSlug, provider: getProviderName() });
});

router.get("/ai/career/placement-readiness", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const ctx = await loadCareerContext(req.user.userId);
  res.json({ ...computePlacementReadiness(ctx), context: { ...ctx, trackName: trackName(ctx.trackSlug) } });
});

/* ============================ Resume Analyzer ============================ */

router.post("/ai/resume-analyze", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const resumeUrl = str(req.body?.resumeUrl).trim();
  const pastedText = str(req.body?.resumeText).trim();
  if (!resumeUrl && !pastedText) {
    res.status(400).json({ error: "Provide a resumeUrl or resumeText to analyze." });
    return;
  }

  const track = await getUserCareerTrack(req.user.userId);
  const name = trackName(track);
  const keywords = trackResumeKeywords(track);

  // Resolve the resume text: prefer pasted text, else fetch & extract from the URL.
  let resumeText = pastedText;
  let extractSource = pastedText ? "text" : "none";
  if (!resumeText && resumeUrl) {
    try {
      const extracted = await fetchResumeText(resumeUrl);
      resumeText = extracted.text;
      extractSource = extracted.source;
    } catch (err) {
      res.status(422).json({ error: (err as Error).message || "Could not read that resume URL." });
      return;
    }
  }

  const hasUsableText = resumeText.replace(/\s+/g, "").length >= 80;

  // No readable text → deterministic, track-grounded baseline (honest about why).
  if (!hasUsableText) {
    const fallback = mockResumeAnalysis(track, "");
    await createAuditLog({
      userId: req.user.userId,
      action: "ai.resume.analyze",
      entityType: "ai_resume",
      ipAddress: getIp(req),
      metadata: { provider: "mock", source: extractSource, contentAnalyzed: false },
    });
    res.json({ ...fallback, provider: "mock" });
    return;
  }

  const truncated = resumeText.slice(0, 8000);
  const { data, provider } = await generateJSON<ResumeAnalysis>({
    system: `You are an ATS (Applicant Tracking System) and technical recruiter for ${name} roles in India. Analyze resumes objectively and score them the way a real ATS plus a hiring manager would. Be specific and actionable.`,
    user: `Analyze the following resume for a ${name} candidate. Compare it against these track-critical ATS keywords: ${keywords.join(", ")}.

Return JSON with EXACTLY these keys:
- atsScore (integer 0-100): overall ATS compatibility & keyword match.
- formatting (string): one of "Excellent", "Good", "Fair", "Needs Work".
- keywordsFound (string[]): track keywords actually present in the resume.
- keywordsMissing (string[]): important track keywords that are absent.
- strengths (string[]): 3-5 concrete strengths.
- improvements (string[]): 3-5 concrete, actionable improvements.
- jobMatch (integer 0-100): fit for ${name} roles.
- overallRating (string): a letter grade like "A", "B+", "C".

Resume text:
"""
${truncated}
"""`,
    maxTokens: 1400,
    validate: (v): v is ResumeAnalysis => {
      if (typeof v !== "object" || v === null) return false;
      const o = v as Record<string, unknown>;
      return (
        typeof o.atsScore === "number" &&
        Array.isArray(o.keywordsFound) &&
        Array.isArray(o.keywordsMissing) &&
        Array.isArray(o.strengths) &&
        Array.isArray(o.improvements)
      );
    },
    mock: () => mockResumeAnalysis(track, resumeText),
  });

  // Clamp numeric fields and coerce arrays/strings defensively so the frontend
  // never crashes on a partial model response that slipped past validation.
  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
  const strArr = (x: unknown): string[] =>
    Array.isArray(x) ? x.filter((s): s is string => typeof s === "string") : [];
  const result: ResumeAnalysis = {
    ...data,
    atsScore: clamp(Number(data.atsScore) || 0),
    jobMatch: clamp(Number(data.jobMatch) || 0),
    formatting: typeof data.formatting === "string" ? data.formatting : "Good",
    overallRating: typeof data.overallRating === "string" ? data.overallRating : "B",
    keywordsFound: strArr(data.keywordsFound),
    keywordsMissing: strArr(data.keywordsMissing),
    strengths: strArr(data.strengths),
    improvements: strArr(data.improvements),
    contentAnalyzed: true,
  };

  await createAuditLog({
    userId: req.user.userId,
    action: "ai.resume.analyze",
    entityType: "ai_resume",
    ipAddress: getIp(req),
    metadata: { provider, source: extractSource, atsScore: result.atsScore },
  });

  res.json({ ...result, provider });
});

/* ================================ Voice ================================ */

router.get("/ai/voice/status", requireAuth, async (_req: AuthRequest, res): Promise<void> => {
  res.json(voiceStatus());
});

router.post("/ai/voice/transcribe", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const status = voiceStatus();
  if (!status.input) {
    res.status(503).json({ error: "Speech-to-text is not available. Connect an AI provider with audio support to enable voice input." });
    return;
  }
  const audioBase64 = str(req.body?.audioBase64);
  const mimeType = str(req.body?.mimeType) || "audio/webm";
  if (!audioBase64) { res.status(400).json({ error: "audioBase64 is required" }); return; }
  try {
    const buf = Buffer.from(audioBase64, "base64");
    const text = await transcribeAudio(buf, mimeType);
    res.json({ text, provider: getProviderName() });
  } catch (err) {
    req.log.error({ err }, "Transcription failed");
    res.status(502).json({ error: "Transcription failed. Please try again or type your answer." });
  }
});

router.post("/ai/voice/tts", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const status = voiceStatus();
  if (!status.output) {
    res.status(503).json({ error: "Text-to-speech is not available. Connect an AI provider with audio support to enable voice output." });
    return;
  }
  const text = str(req.body?.text).trim();
  if (!text) { res.status(400).json({ error: "text is required" }); return; }
  const voice = str(req.body?.voice) || undefined;
  try {
    const { audio, mimeType } = await synthesizeSpeech(text.slice(0, 4000), voice);
    res.json({ audioBase64: audio.toString("base64"), mimeType, provider: getProviderName() });
  } catch (err) {
    req.log.error({ err }, "Speech synthesis failed");
    res.status(502).json({ error: "Speech synthesis failed. Please try again." });
  }
});

export default router;
