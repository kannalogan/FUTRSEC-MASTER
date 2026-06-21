import { db } from "@workspace/db";
import {
  tracksTable,
  learningModulesTable,
  lessonsTable,
  lessonVideosTable,
  lessonNotesTable,
  lessonQuizzesTable,
  lessonQuizQuestionsTable,
  lessonResourcesTable,
} from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

type Difficulty = "beginner" | "intermediate" | "advanced";

// ── Module metadata: category / difficulty per module title ────────────────
const MODULE_META: Record<string, { category: string; difficulty: Difficulty }> = {
  // SOC
  "SOC Fundamentals": { category: "SOC Foundations", difficulty: "beginner" },
  "SIEM & Log Management": { category: "SIEM Fundamentals", difficulty: "beginner" },
  "Threat Hunting": { category: "Threat Hunting", difficulty: "intermediate" },
  "Malware Analysis": { category: "Malware Analysis", difficulty: "intermediate" },
  "Incident Response": { category: "Incident Response", difficulty: "advanced" },
  "Detection Engineering": { category: "SOC Automation", difficulty: "advanced" },
  // VAPT
  "OWASP Top 10": { category: "OWASP Top 10", difficulty: "beginner" },
  "Burp Suite Mastery": { category: "Burp Suite", difficulty: "beginner" },
  "Network Pentesting": { category: "Web Pentesting", difficulty: "intermediate" },
  "API Security Testing": { category: "API Security", difficulty: "intermediate" },
  "Active Directory Pentesting": { category: "AD Pentesting", difficulty: "advanced" },
  "Mobile & Cloud Pentesting": { category: "Cloud Pentesting", difficulty: "advanced" },
  // GRC
  "ISO 27001 Implementation": { category: "ISO 27001", difficulty: "beginner" },
  "NIST Framework": { category: "NIST", difficulty: "beginner" },
  "DPDP Act 2023 Compliance": { category: "DPDP", difficulty: "intermediate" },
  "Risk Assessment & Management": { category: "Risk Assessment", difficulty: "intermediate" },
  "Compliance & Audit": { category: "Audit", difficulty: "advanced" },
  "Vendor Risk Management": { category: "Vendor Risk", difficulty: "advanced" },
};

const XP_BY_DIFFICULTY: Record<Difficulty, number> = {
  beginner: 100,
  intermediate: 150,
  advanced: 200,
};

// Real, reliably-streamable sample videos (public Google sample bucket).
const SAMPLE_VIDEOS = [
  "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4",
];

// Real reference resources per domain.
const DOMAIN_RESOURCES: Record<string, Array<{ title: string; url: string; type: string }>> = {
  soc: [
    { title: "MITRE ATT&CK Matrix", url: "https://attack.mitre.org/", type: "reference" },
    { title: "Splunk Search Reference", url: "https://docs.splunk.com/Documentation/Splunk/latest/SearchReference/WhatsInThisManual", type: "docs" },
    { title: "SANS Blue Team Resources", url: "https://www.sans.org/blog/", type: "article" },
  ],
  vapt: [
    { title: "OWASP Top 10", url: "https://owasp.org/www-project-top-ten/", type: "reference" },
    { title: "PortSwigger Web Security Academy", url: "https://portswigger.net/web-security", type: "course" },
    { title: "HackTricks", url: "https://book.hacktricks.xyz/", type: "reference" },
  ],
  grc: [
    { title: "ISO/IEC 27001 Standard", url: "https://www.iso.org/standard/27001", type: "reference" },
    { title: "NIST Cybersecurity Framework", url: "https://www.nist.gov/cyberframework", type: "reference" },
    { title: "India DPDP Act 2023", url: "https://www.meity.gov.in/data-protection-framework", type: "reference" },
  ],
};

function articleMarkdown(title: string, category: string, domain: string): string {
  const domainLabel = domain.toUpperCase();
  return `# ${title}

> Part of the **${category}** track in the ${domainLabel} learning path.

## Overview

This lesson covers **${title}**. By the end you will understand the core concepts,
where they fit in a real ${domainLabel} workflow, and how to apply them in
hands-on scenarios.

## Key Concepts

- **Definition** — what ${title.toLowerCase()} means and why it matters.
- **Context** — how it connects to the wider ${category} discipline.
- **Practical use** — typical situations where you will rely on this knowledge.

## Worked Example

\`\`\`bash
# Example workflow relevant to ${category}
$ run-analysis --target sample --mode ${domain}
[+] collecting indicators...
[+] correlating events...
[+] report generated
\`\`\`

## Quick Reference

| Concept | Description | When to use |
| --- | --- | --- |
| Fundamentals | Baseline knowledge for ${category} | Always |
| Tooling | Common tools in this area | During execution |
| Reporting | Communicating findings | After analysis |

## Summary

You now have a working understanding of **${title}**. Continue to the next lesson
to build on these concepts, or try the quiz to validate your knowledge.
`;
}

// Authored quiz banks keyed by lesson slug.
type QBank = Array<{
  question: string;
  type: "mcq" | "multi_select" | "true_false" | "scenario";
  options: string[];
  correctAnswers: number[];
  explanation: string;
  points: number;
}>;

const QUIZ_BANKS: Record<string, QBank> = {
  "quiz-soc-basics": [
    {
      question: "What is the primary purpose of a Security Operations Center (SOC)?",
      type: "mcq",
      options: [
        "To develop marketing campaigns",
        "To monitor, detect, and respond to security incidents",
        "To manage payroll systems",
        "To design network hardware",
      ],
      correctAnswers: [1],
      explanation: "A SOC centralizes monitoring, detection, and incident response.",
      points: 10,
    },
    {
      question: "Which of the following are common SOC analyst tiers?",
      type: "multi_select",
      options: ["Tier 1 (Triage)", "Tier 2 (Investigation)", "Tier 3 (Threat Hunting)", "Tier 7 (Marketing)"],
      correctAnswers: [0, 1, 2],
      explanation: "SOCs are typically organized into Tier 1, 2, and 3 analysts.",
      points: 15,
    },
    {
      question: "A SIEM is used to aggregate and correlate log data from across the environment.",
      type: "true_false",
      options: ["True", "False"],
      correctAnswers: [0],
      explanation: "SIEM platforms aggregate, correlate, and alert on log data.",
      points: 10,
    },
    {
      question: "What does 'MTTD' stand for in SOC metrics?",
      type: "mcq",
      options: ["Mean Time To Detect", "Maximum Time To Deploy", "Mean Total Threat Data", "Managed Threat Detection"],
      correctAnswers: [0],
      explanation: "MTTD = Mean Time To Detect, a key SOC performance metric.",
      points: 10,
    },
    {
      question: "An alert fires for repeated failed logins followed by a success from a new country. What is the best first action?",
      type: "scenario",
      options: [
        "Ignore it — failed logins are normal",
        "Triage: verify the user, check for impossible travel, and escalate if suspicious",
        "Immediately wipe the user's machine",
        "Delete the alert",
      ],
      correctAnswers: [1],
      explanation: "Triage and verification come first; this pattern suggests possible account compromise.",
      points: 15,
    },
  ],
  "final-assessment": [
    {
      question: "Which rule format is commonly used for SIEM-agnostic detection logic?",
      type: "mcq",
      options: ["Sigma", "Markdown", "YAML-only", "CSS"],
      correctAnswers: [0],
      explanation: "Sigma is a generic, SIEM-agnostic detection rule format.",
      points: 10,
    },
    {
      question: "YARA rules are primarily used for what?",
      type: "mcq",
      options: ["Web styling", "Identifying and classifying malware samples", "Network routing", "Password storage"],
      correctAnswers: [1],
      explanation: "YARA is used to identify and classify malware based on patterns.",
      points: 10,
    },
    {
      question: "Detection engineering should balance which two factors?",
      type: "multi_select",
      options: ["True positive coverage", "False positive noise", "Office decor", "Lunch menu"],
      correctAnswers: [0, 1],
      explanation: "Good detections maximize coverage while minimizing false positives.",
      points: 15,
    },
    {
      question: "Detections should be tested before deployment to production SIEM.",
      type: "true_false",
      options: ["True", "False"],
      correctAnswers: [0],
      explanation: "Testing prevents noisy or broken rules from flooding analysts.",
      points: 10,
    },
    {
      question: "A new detection generates 500 alerts/hour, almost all benign. What should you do?",
      type: "scenario",
      options: [
        "Leave it — more alerts are always better",
        "Tune the rule to reduce false positives before it causes alert fatigue",
        "Disable all detections",
        "Forward all alerts to the CEO",
      ],
      correctAnswers: [1],
      explanation: "Tuning reduces alert fatigue and keeps the rule actionable.",
      points: 15,
    },
  ],
  "quiz-iso-basics": [
    {
      question: "What does ISO/IEC 27001 primarily define?",
      type: "mcq",
      options: [
        "A programming language",
        "An Information Security Management System (ISMS)",
        "A firewall product",
        "A network protocol",
      ],
      correctAnswers: [1],
      explanation: "ISO 27001 specifies requirements for an ISMS.",
      points: 10,
    },
    {
      question: "Annex A of ISO 27001 contains what?",
      type: "mcq",
      options: ["A list of reference controls", "Source code", "Marketing plans", "Hardware schematics"],
      correctAnswers: [0],
      explanation: "Annex A lists reference security controls.",
      points: 10,
    },
    {
      question: "Which are core stages of the ISO 27001 risk process?",
      type: "multi_select",
      options: ["Risk identification", "Risk assessment", "Risk treatment", "Risk celebration"],
      correctAnswers: [0, 1, 2],
      explanation: "Identify, assess, and treat are the core risk stages.",
      points: 15,
    },
    {
      question: "A Statement of Applicability (SoA) documents which controls apply and why.",
      type: "true_false",
      options: ["True", "False"],
      correctAnswers: [0],
      explanation: "The SoA records applicable controls and justifications.",
      points: 10,
    },
    {
      question: "During certification, the auditor finds a control is documented but never performed. This is a:",
      type: "scenario",
      options: ["Strength", "Non-conformity", "Bonus point", "Marketing opportunity"],
      correctAnswers: [1],
      explanation: "A control that isn't operating as documented is a non-conformity.",
      points: 15,
    },
  ],
};

async function seedLearningContent() {
  console.log("🌱 Seeding learning content...");

  const tracks = await db.select().from(tracksTable);
  const trackById = new Map(tracks.map((t) => [t.id, t]));

  const modules = await db.select().from(learningModulesTable);
  const lessons = await db.select().from(lessonsTable);
  const lessonsByModule = new Map<number, typeof lessons>();
  for (const l of lessons) {
    const arr = lessonsByModule.get(l.moduleId) ?? [];
    arr.push(l);
    lessonsByModule.set(l.moduleId, arr);
  }

  // 1) Module metadata
  for (const m of modules) {
    const meta = MODULE_META[m.title];
    if (!meta) continue;
    const moduleLessons = lessonsByModule.get(m.id) ?? [];
    const estimatedMinutes = moduleLessons.reduce((s, l) => s + (l.durationMinutes ?? 0), 0) || 60;
    await db
      .update(learningModulesTable)
      .set({
        category: meta.category,
        difficulty: meta.difficulty,
        xpReward: XP_BY_DIFFICULTY[meta.difficulty],
        estimatedMinutes,
        isPublished: true,
      })
      .where(eq(learningModulesTable.id, m.id));
  }
  console.log(`  ✅ Updated metadata for ${modules.length} modules`);

  // 2) Lesson content — idempotent: wipe existing content for these lessons first.
  const lessonIds = lessons.map((l) => l.id);
  if (lessonIds.length > 0) {
    await db.delete(lessonVideosTable).where(inArray(lessonVideosTable.lessonId, lessonIds));
    await db.delete(lessonNotesTable).where(inArray(lessonNotesTable.lessonId, lessonIds));
    await db.delete(lessonResourcesTable).where(inArray(lessonResourcesTable.lessonId, lessonIds));
    const existingQuizzes = await db.select().from(lessonQuizzesTable).where(inArray(lessonQuizzesTable.lessonId, lessonIds));
    const quizIds = existingQuizzes.map((q) => q.id);
    if (quizIds.length > 0) {
      await db.delete(lessonQuizQuestionsTable).where(inArray(lessonQuizQuestionsTable.quizId, quizIds));
    }
    await db.delete(lessonQuizzesTable).where(inArray(lessonQuizzesTable.lessonId, lessonIds));
  }

  let videoCount = 0;
  let articleCount = 0;
  let quizCount = 0;
  let resourceCount = 0;
  let vIdx = 0;

  for (const m of modules) {
    const track = trackById.get(m.trackId);
    const domain = track?.domain ?? "soc";
    const baseDomain = ["soc", "vapt", "grc"].includes(domain) ? domain : "soc";
    const category = MODULE_META[m.title]?.category ?? m.title;
    const moduleLessons = (lessonsByModule.get(m.id) ?? []).sort((a, b) => a.order - b.order);

    for (const lesson of moduleLessons) {
      // Resources for every lesson (real domain references).
      const resources = DOMAIN_RESOURCES[baseDomain] ?? [];
      for (let i = 0; i < resources.length; i++) {
        await db.insert(lessonResourcesTable).values({
          lessonId: lesson.id,
          title: resources[i].title,
          url: resources[i].url,
          type: resources[i].type,
          order: i,
        });
        resourceCount++;
      }

      if (lesson.type === "video") {
        await db.insert(lessonVideosTable).values({
          lessonId: lesson.id,
          videoUrl: SAMPLE_VIDEOS[vIdx % SAMPLE_VIDEOS.length],
          durationSeconds: (lesson.durationMinutes ?? 10) * 60,
          resolution: "1080p",
        });
        vIdx++;
        videoCount++;
      }

      if (lesson.type === "article") {
        await db.insert(lessonNotesTable).values({
          lessonId: lesson.id,
          content: articleMarkdown(lesson.title, category, baseDomain),
        });
        articleCount++;
      }

      if (lesson.type === "quiz") {
        const [quiz] = await db
          .insert(lessonQuizzesTable)
          .values({ lessonId: lesson.id, title: lesson.title, passingScore: 70 })
          .returning();
        const bank = QUIZ_BANKS[lesson.slug] ?? QUIZ_BANKS["quiz-soc-basics"];
        for (let i = 0; i < bank.length; i++) {
          const qd = bank[i];
          await db.insert(lessonQuizQuestionsTable).values({
            quizId: quiz.id,
            question: qd.question,
            type: qd.type,
            options: qd.options,
            correctAnswers: qd.correctAnswers,
            explanation: qd.explanation,
            points: qd.points,
            order: i,
          });
        }
        quizCount++;
      }
    }
  }

  console.log(`  ✅ Videos: ${videoCount}, Articles: ${articleCount}, Quizzes: ${quizCount}, Resources: ${resourceCount}`);
  console.log("✅ Learning content seeded.");
}

seedLearningContent()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
