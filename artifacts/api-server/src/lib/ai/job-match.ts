/**
 * AI Job Agent matching engine.
 *
 * Computes a 0-100 match score between a student and a job using deterministic,
 * track-aware signals (career track, skills overlap, foundational skill score,
 * resume readiness, checkpoint progress). The deterministic heuristic is the
 * authoritative fallback whenever no AI key is configured or an AI call fails;
 * when a provider is available we ask it to refine the score for nuance but
 * always keep the result grounded in the heuristic factor breakdown.
 *
 * Track isolation is a hard rule: a job whose `requiredTracks` does not include
 * the student's track slug (and is non-empty) scores 0 and is never recommended.
 */
import { generateJSON } from "./index";
import type { CareerTrack } from "../track-access";

export interface StudentMatchContext {
  userId: number;
  careerTrack: CareerTrack | null;
  trackSlug: string | null;
  ftsScore: number;
  hasResume: boolean;
  checkpointCompletion: number;
  skills: string[];
}

export interface JobMatchInput {
  id: number;
  title: string;
  description: string;
  requiredTracks: string[];
  skills: string[];
  minSalary?: number | null;
  maxSalary?: number | null;
  location?: string | null;
  isRemote?: boolean;
}

export interface MatchResult {
  score: number;
  reasons: string[];
  factors: {
    trackAlignment: number;
    skillsOverlap: number;
    foundationalSkill: number;
    resumeReady: number;
    checkpointProgress: number;
    matchedSkills: string[];
    missingSkills: string[];
  };
}

const WEIGHTS = {
  trackAlignment: 30,
  skillsOverlap: 25,
  foundationalSkill: 20,
  resumeReady: 10,
  checkpointProgress: 15,
} as const;

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function skillsMatch(studentSkills: string[], jobSkills: string[]): {
  matched: string[];
  missing: string[];
} {
  const matched: string[] = [];
  const missing: string[] = [];
  const studentNorm = studentSkills.map(normalize).filter(Boolean);

  for (const js of jobSkills) {
    const jsn = normalize(js);
    if (!jsn) continue;
    const hit = studentNorm.some(
      (ss) => ss === jsn || ss.includes(jsn) || jsn.includes(ss),
    );
    if (hit) matched.push(js);
    else missing.push(js);
  }
  return { matched, missing };
}

/**
 * Deterministic heuristic match. Always safe to call (no I/O). Returns a fully
 * grounded score + reasons + factor breakdown. Track isolation is enforced:
 * a job requiring tracks the student is not on scores 0.
 */
export function heuristicMatch(
  student: StudentMatchContext,
  job: JobMatchInput,
): MatchResult {
  const trackSlug = student.trackSlug;
  const requiredTracks = job.requiredTracks ?? [];
  const trackAllowed =
    requiredTracks.length === 0 ||
    (trackSlug != null && requiredTracks.includes(trackSlug));

  if (!trackAllowed) {
    return {
      score: 0,
      reasons: ["This role targets a different career track."],
      factors: {
        trackAlignment: 0,
        skillsOverlap: 0,
        foundationalSkill: 0,
        resumeReady: 0,
        checkpointProgress: 0,
        matchedSkills: [],
        missingSkills: job.skills ?? [],
      },
    };
  }

  const reasons: string[] = [];

  const trackAlignment =
    requiredTracks.length === 0
      ? Math.round(WEIGHTS.trackAlignment * 0.7)
      : WEIGHTS.trackAlignment;
  if (requiredTracks.length === 0) {
    reasons.push("Open to all cybersecurity tracks.");
  } else {
    reasons.push("Aligned with your career track.");
  }

  const { matched, missing } = skillsMatch(student.skills, job.skills ?? []);
  const totalJobSkills = (job.skills ?? []).length;
  const overlapRatio = totalJobSkills === 0 ? 0.6 : matched.length / totalJobSkills;
  const skillsOverlap = Math.round(WEIGHTS.skillsOverlap * overlapRatio);
  if (totalJobSkills === 0) {
    reasons.push("No specific skills listed — broad fit.");
  } else if (matched.length > 0) {
    reasons.push(
      `You match ${matched.length}/${totalJobSkills} required skill${totalJobSkills === 1 ? "" : "s"}.`,
    );
  } else {
    reasons.push("Build the listed skills to strengthen this match.");
  }

  const fts = Math.max(0, Math.min(100, student.ftsScore));
  const foundationalSkill = Math.round((fts / 100) * WEIGHTS.foundationalSkill);
  reasons.push(`Foundational skill score ${fts}/100.`);

  const resumeReady = student.hasResume ? WEIGHTS.resumeReady : 0;
  if (student.hasResume) reasons.push("Resume ready to apply.");
  else reasons.push("Upload a resume to improve your application.");

  const cp = Math.max(0, Math.min(100, student.checkpointCompletion));
  const checkpointProgress = Math.round((cp / 100) * WEIGHTS.checkpointProgress);
  reasons.push(`Career checkpoint progress ${cp}%.`);

  const score = Math.max(
    0,
    Math.min(
      100,
      trackAlignment + skillsOverlap + foundationalSkill + resumeReady + checkpointProgress,
    ),
  );

  return {
    score,
    reasons,
    factors: {
      trackAlignment,
      skillsOverlap,
      foundationalSkill,
      resumeReady,
      checkpointProgress,
      matchedSkills: matched,
      missingSkills: missing,
    },
  };
}

function isMatchShape(v: unknown): v is { score: number; reasons: string[] } {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.score === "number" && Array.isArray(o.reasons);
}

/**
 * AI-refined match. Attempts to use the configured provider to nuance the score
 * and reasons; falls back deterministically to {@link heuristicMatch} when no
 * AI key is present or the call fails/validates poorly. The factor breakdown is
 * always taken from the heuristic so downstream consumers stay grounded.
 */
export async function computeMatch(
  student: StudentMatchContext,
  job: JobMatchInput,
): Promise<MatchResult> {
  const base = heuristicMatch(student, job);

  // Hard track isolation: never invoke AI for cross-track jobs.
  if (base.score === 0) return base;

  const { data } = await generateJSON<{ score: number; reasons: string[] }>({
    system:
      "You are a precise cybersecurity placement matching engine. Given a student profile and a job, return a JSON object with a calibrated match score (0-100 integer) and a short array of concise reason strings. Be realistic and grounded; do not inflate scores.",
    user: `Student: track=${student.trackSlug ?? "none"}, FTS=${student.ftsScore}/100, resume=${student.hasResume ? "yes" : "no"}, checkpointProgress=${student.checkpointCompletion}%, skills=[${student.skills.join(", ")}].
Job: "${job.title}" requiredTracks=[${(job.requiredTracks ?? []).join(", ")}], skills=[${(job.skills ?? []).join(", ")}].
Heuristic baseline score=${base.score}. Refine if warranted. Return JSON: {"score": number, "reasons": string[]}.`,
    maxTokens: 400,
    mock: () => ({ score: base.score, reasons: base.reasons }),
    validate: isMatchShape,
  });

  const score = Math.max(0, Math.min(100, Math.round(data.score)));
  const reasons =
    Array.isArray(data.reasons) && data.reasons.length > 0
      ? data.reasons.map((r) => String(r)).slice(0, 6)
      : base.reasons;

  return { score, reasons, factors: base.factors };
}
