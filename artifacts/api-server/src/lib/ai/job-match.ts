/**
 * AI Job Agent matching engine.
 *
 * Computes a 0-100 match score between a student and a job using a deterministic,
 * track-aware 7-component model. Every component produces a 0..1 sub-score that
 * is multiplied by its weight (weights sum to 100); the final matchScore is the
 * rounded, clamped sum. The deterministic heuristic is the authoritative source
 * of truth and always populates breakdown / missingSkills / recommendations.
 *
 * The seven components:
 *   1. Skills      — overlap between the student's derived skills and job skills.
 *   2. Experience  — proxy from completed labs, checkpoint progress and profile.
 *   3. Assessment  — fts_scores.assessmentScore.
 *   4. FTS         — fts_scores.totalScore.
 *   5. Resume      — resume presence + resume analysis score + profile completeness.
 *   6. Track       — student career track vs job.requiredTracks (HARD GATE).
 *   7. Certificate — issued certificates, weighted higher when track-relevant.
 *
 * Track isolation is a hard rule: a job whose `requiredTracks` is non-empty and
 * does not include the student's track scores 0 and is never recommended.
 *
 * When an AI provider is configured, computeMatch() may refine the human-readable
 * reasons / overall score for nuance, but the grounded breakdown, missingSkills
 * and recommendations from the heuristic are always retained.
 */
import { generateJSON } from "./index";
import type { CareerTrack } from "../track-access";

export interface StudentCertificate {
  /** Career track of the issued certificate (domain slug or null). */
  careerTrack: string | null;
}

export interface StudentMatchContext {
  userId: number;
  careerTrack: CareerTrack | null;
  trackSlug: string | null;
  /** fts_scores.totalScore, 0..100. */
  ftsScore: number;
  /** fts_scores.assessmentScore, 0..100. */
  assessmentScore: number;
  hasResume: boolean;
  /** ai_resume_analysis.atsScore (0..100) if available, else null. */
  resumeScore: number | null;
  /** Fraction (0..1) of profile fields completed. */
  profileCompleteness: number;
  /** Whether the student profile lists a current role. */
  hasProfileRole: boolean;
  /** Whether the student profile has a bio. */
  hasBio: boolean;
  /** Count of completed labs (experience proxy). */
  labsCompleted: number;
  /** Checkpoint completion percentage, 0..100. */
  checkpointCompletion: number;
  skills: string[];
  /** Issued certificates for this student. */
  certificates: StudentCertificate[];
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

export interface MatchComponent {
  /** Normalised sub-score, 0..1. */
  score: number;
  /** Component weight (points out of 100). */
  weight: number;
  /** Rounded contribution to the final score (score * weight). */
  contribution: number;
}

export type MatchComponentKey =
  | "skills"
  | "experience"
  | "assessment"
  | "fts"
  | "resume"
  | "track"
  | "certificate";

export interface MatchResult {
  matchScore: number;
  reasons: string[];
  missingSkills: string[];
  recommendations: string[];
  breakdown: Record<MatchComponentKey, MatchComponent>;
  /** Retained for backward compatibility / the job_matches.factors column. */
  factors: {
    matchedSkills: string[];
    missingSkills: string[];
    components: Record<MatchComponentKey, number>;
  };
}

/** Component weights — must sum to 100. */
export const WEIGHTS: Record<MatchComponentKey, number> = {
  track: 20,
  skills: 22,
  fts: 13,
  assessment: 12,
  experience: 11,
  resume: 10,
  certificate: 12,
} as const;

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

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

function component(score: number, weight: number): MatchComponent {
  const s = clamp01(score);
  return { score: s, weight, contribution: Math.round(s * weight) };
}

/**
 * Counts certificates relevant to a job's track. A certificate is track-relevant
 * when its careerTrack matches the student's track or appears in the job's
 * requiredTracks (matching both domain and slug forms).
 */
function trackRelevantCerts(
  certificates: StudentCertificate[],
  student: StudentMatchContext,
  requiredTracks: string[],
): number {
  const relevant = new Set<string>();
  if (student.careerTrack) relevant.add(student.careerTrack);
  if (student.trackSlug) relevant.add(student.trackSlug);
  for (const t of requiredTracks) relevant.add(t);
  return certificates.filter((c) => c.careerTrack != null && relevant.has(c.careerTrack)).length;
}

/**
 * Deterministic heuristic match. Always safe to call (no I/O). Returns a fully
 * grounded score + reasons + per-component breakdown + missing skills +
 * recommendations. Track isolation is enforced: a job requiring tracks the
 * student is not on scores 0.
 */
export function heuristicMatch(
  student: StudentMatchContext,
  job: JobMatchInput,
): MatchResult {
  const trackSlug = student.trackSlug;
  const requiredTracks = job.requiredTracks ?? [];
  const jobSkills = job.skills ?? [];
  const { matched, missing } = skillsMatch(student.skills, jobSkills);

  const trackAllowed =
    requiredTracks.length === 0 ||
    (trackSlug != null && requiredTracks.includes(trackSlug)) ||
    (student.careerTrack != null && requiredTracks.includes(student.careerTrack));

  // ── Track hard gate ─────────────────────────────────────────────────────
  if (!trackAllowed) {
    const zeroBreakdown: Record<MatchComponentKey, MatchComponent> = {
      track: component(0, WEIGHTS.track),
      skills: component(0, WEIGHTS.skills),
      fts: component(0, WEIGHTS.fts),
      assessment: component(0, WEIGHTS.assessment),
      experience: component(0, WEIGHTS.experience),
      resume: component(0, WEIGHTS.resume),
      certificate: component(0, WEIGHTS.certificate),
    };
    return {
      matchScore: 0,
      reasons: ["This role targets a different career track."],
      missingSkills: jobSkills,
      recommendations: [
        "This role is outside your current career track — focus on roles aligned with your track.",
      ],
      breakdown: zeroBreakdown,
      factors: {
        matchedSkills: [],
        missingSkills: jobSkills,
        components: {
          track: 0,
          skills: 0,
          fts: 0,
          assessment: 0,
          experience: 0,
          resume: 0,
          certificate: 0,
        },
      },
    };
  }

  const reasons: string[] = [];
  const recommendations: string[] = [];
  const trackLabel = student.careerTrack ? student.careerTrack.toUpperCase() : "your";

  // ── 1. Track ────────────────────────────────────────────────────────────
  const trackScore = requiredTracks.length === 0 ? 0.7 : 1;
  if (requiredTracks.length === 0) {
    reasons.push("Open to all cybersecurity tracks.");
  } else {
    reasons.push("Aligned with your career track.");
  }

  // ── 2. Skills ───────────────────────────────────────────────────────────
  const totalJobSkills = jobSkills.length;
  const skillScore = totalJobSkills === 0 ? 0.6 : matched.length / totalJobSkills;
  if (totalJobSkills === 0) {
    reasons.push("No specific skills listed — broad fit.");
  } else if (matched.length > 0) {
    reasons.push(`Strong skills overlap (${matched.length}/${totalJobSkills} required).`);
  } else {
    reasons.push("Build the listed skills to strengthen this match.");
  }
  if (missing.length > 0) {
    const shown = missing.slice(0, 3).join(", ");
    recommendations.push(
      `Close your skill gap: learn ${shown}${missing.length > 3 ? ` and ${missing.length - 3} more` : ""}.`,
    );
    if (missing.length > 0) {
      recommendations.push(`Earn a certificate in ${missing[0]} to prove this skill.`);
    }
  }

  // ── 3. FTS ──────────────────────────────────────────────────────────────
  const fts = Math.max(0, Math.min(100, student.ftsScore));
  const ftsScoreNorm = fts / 100;
  reasons.push(`Foundational training score ${Math.round(fts)}%.`);
  if (fts < 70) {
    recommendations.push(`Complete more ${trackLabel} labs and modules to raise your FTS score.`);
  }

  // ── 4. Assessment ───────────────────────────────────────────────────────
  const assessment = Math.max(0, Math.min(100, student.assessmentScore));
  const assessmentNorm = assessment / 100;
  reasons.push(`Assessment score ${Math.round(assessment)}%.`);
  if (assessment < 70) {
    recommendations.push("Retake track assessments to improve your assessment score.");
  }

  // ── 5. Experience (proxy) ───────────────────────────────────────────────
  const labComponent = clamp01(student.labsCompleted / 10);
  const cpComponent = Math.max(0, Math.min(100, student.checkpointCompletion)) / 100;
  const profileBonus = (student.hasProfileRole ? 0.5 : 0) + (student.hasBio ? 0.5 : 0);
  const experienceScore = clamp01(0.5 * labComponent + 0.35 * cpComponent + 0.15 * profileBonus);
  reasons.push(
    `Hands-on experience: ${student.labsCompleted} labs, ${Math.round(cpComponent * 100)}% checkpoint progress.`,
  );
  if (experienceScore < 0.6) {
    recommendations.push(`Complete the ${trackLabel} labs and career checkpoints to build experience.`);
  }
  if (!student.hasProfileRole || !student.hasBio) {
    recommendations.push("Add your current role and a bio to strengthen your profile.");
  }

  // ── 6. Resume ───────────────────────────────────────────────────────────
  let resumeScore: number;
  if (student.resumeScore != null) {
    resumeScore = clamp01(student.resumeScore / 100);
    reasons.push(`Resume analysis score ${Math.round(student.resumeScore)}%.`);
    if (student.resumeScore < 70) {
      recommendations.push("Improve your resume's ATS score using the Resume Analyzer.");
    }
  } else if (student.hasResume) {
    resumeScore = clamp01(0.6 + 0.4 * student.profileCompleteness);
    reasons.push("Resume uploaded and ready to apply.");
    recommendations.push("Run the Resume Analyzer to get an ATS score and improvement tips.");
  } else {
    resumeScore = clamp01(0.15 * student.profileCompleteness);
    reasons.push("Upload a resume to improve your application.");
    recommendations.push("Upload a resume to unlock stronger matches and one-click apply.");
  }

  // ── 7. Certificate ──────────────────────────────────────────────────────
  const totalCerts = student.certificates.length;
  const relevantCerts = trackRelevantCerts(student.certificates, student, requiredTracks);
  const otherCerts = Math.max(0, totalCerts - relevantCerts);
  const certRaw = relevantCerts * 1 + otherCerts * 0.4;
  const certificateScore = clamp01(certRaw / 3);
  if (relevantCerts > 0) {
    reasons.push(`${relevantCerts} track-relevant certificate${relevantCerts === 1 ? "" : "s"}.`);
  } else if (totalCerts > 0) {
    reasons.push(`${totalCerts} certificate${totalCerts === 1 ? "" : "s"} earned.`);
  } else {
    reasons.push("No certificates yet.");
  }
  if (relevantCerts < 2) {
    recommendations.push(`Earn ${trackLabel} certifications to boost your certificate score.`);
  }

  // ── Aggregate ───────────────────────────────────────────────────────────
  const breakdown: Record<MatchComponentKey, MatchComponent> = {
    track: component(trackScore, WEIGHTS.track),
    skills: component(skillScore, WEIGHTS.skills),
    fts: component(ftsScoreNorm, WEIGHTS.fts),
    assessment: component(assessmentNorm, WEIGHTS.assessment),
    experience: component(experienceScore, WEIGHTS.experience),
    resume: component(resumeScore, WEIGHTS.resume),
    certificate: component(certificateScore, WEIGHTS.certificate),
  };

  const rawTotal = (Object.keys(breakdown) as MatchComponentKey[]).reduce(
    (sum, k) => sum + breakdown[k].score * breakdown[k].weight,
    0,
  );
  const matchScore = Math.max(0, Math.min(100, Math.round(rawTotal)));

  // De-duplicate recommendations while preserving order.
  const uniqueRecs = Array.from(new Set(recommendations)).slice(0, 6);

  return {
    matchScore,
    reasons,
    missingSkills: missing,
    recommendations: uniqueRecs,
    breakdown,
    factors: {
      matchedSkills: matched,
      missingSkills: missing,
      components: {
        track: breakdown.track.score,
        skills: breakdown.skills.score,
        fts: breakdown.fts.score,
        assessment: breakdown.assessment.score,
        experience: breakdown.experience.score,
        resume: breakdown.resume.score,
        certificate: breakdown.certificate.score,
      },
    },
  };
}

function isReasonsShape(v: unknown): v is { reasons: string[] } {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return Array.isArray(o.reasons);
}

/**
 * AI-refined match. The numeric score, breakdown, missingSkills and
 * recommendations ALWAYS come from the deterministic {@link heuristicMatch}; the
 * optional AI pass only rewrites the human-readable `reasons` into clearer prose
 * and can never change the score. Falls back to the grounded reasons when no AI
 * key is present or the call fails/validates poorly. This keeps the score fully
 * deterministic and identical across every endpoint that scores the same input.
 */
export async function computeMatch(
  student: StudentMatchContext,
  job: JobMatchInput,
): Promise<MatchResult> {
  const base = heuristicMatch(student, job);

  // Hard track isolation: never invoke AI for cross-track jobs.
  if (base.matchScore === 0) return base;

  // The deterministic 7-component formula is the authoritative source of truth
  // for the score, breakdown, missing skills and recommendations. The optional
  // AI pass only rewrites the human-readable `reasons` into clearer prose — it
  // can NEVER change the numeric score. This guarantees the score is fully
  // deterministic and identical wherever it is computed (e.g. /job-agent/
  // recommended and /ai/job-matches return the same score for the same input).
  const { data } = await generateJSON<{ reasons: string[] }>({
    system:
      "You are a precise cybersecurity placement matching engine. You are given a student profile, a job, and a fixed, already-computed match score with its grounding reasons. Rewrite the reasons as a short array of clear, concise, grounded strings. Do NOT compute or output a score. Do not invent facts not implied by the inputs.",
    user: `Student: track=${student.trackSlug ?? "none"}, FTS=${student.ftsScore}/100, assessment=${student.assessmentScore}/100, resume=${student.hasResume ? "yes" : "no"}, checkpointProgress=${student.checkpointCompletion}%, labs=${student.labsCompleted}, certificates=${student.certificates.length}, skills=[${student.skills.join(", ")}].
Job: "${job.title}" requiredTracks=[${(job.requiredTracks ?? []).join(", ")}], skills=[${(job.skills ?? []).join(", ")}].
Fixed match score=${base.matchScore}/100. Grounding reasons: ${JSON.stringify(base.reasons)}.
Return JSON: {"reasons": string[]} — clearer phrasings of the grounding reasons only.`,
    maxTokens: 400,
    mock: () => ({ reasons: base.reasons }),
    validate: isReasonsShape,
  });

  const reasons =
    Array.isArray(data.reasons) && data.reasons.length > 0
      ? data.reasons.map((r) => String(r)).slice(0, 6)
      : base.reasons;

  // Score, breakdown, missingSkills and recommendations stay from the
  // deterministic heuristic — only the prose reasons are AI-refined.
  return {
    ...base,
    reasons,
  };
}
