/**
 * Deterministic, track-aware content generators. These power the MOCK provider
 * and act as the structured fallback whenever a live AI call fails or returns
 * unparseable output. They are intentionally heuristic (not random) so the
 * product behaves consistently and every feature returns useful, grounded data
 * even with no AI key configured.
 */

export type Track = "soc" | "vapt" | "grc";

export const TRACK_NAMES: Record<Track, string> = {
  soc: "SOC Analyst",
  vapt: "VAPT Professional",
  grc: "GRC Specialist",
};

export function trackName(track?: string | null): string {
  if (track && track in TRACK_NAMES) return TRACK_NAMES[track as Track];
  return "Cybersecurity";
}

const TRACK_SKILLS: Record<Track, string[]> = {
  soc: [
    "SIEM (Splunk/ELK) log analysis",
    "Incident triage & escalation",
    "MITRE ATT&CK mapping",
    "Network traffic analysis",
    "Threat intelligence",
    "Windows/Linux event forensics",
    "Detection engineering",
    "Playbook automation (SOAR)",
  ],
  vapt: [
    "Web app pentesting (OWASP Top 10)",
    "Network & infrastructure scanning",
    "Exploit development basics",
    "Burp Suite & Metasploit",
    "Privilege escalation",
    "Active Directory attacks",
    "Report writing & CVSS scoring",
    "API security testing",
  ],
  grc: [
    "ISO 27001 implementation",
    "Risk assessment & treatment",
    "DPDP / GDPR compliance",
    "Security policy authoring",
    "Internal audit & evidence",
    "Business continuity (BCP/DR)",
    "Vendor / third-party risk",
    "NIST CSF & SOC 2 controls",
  ],
};

const TRACK_CERTS: Record<Track, Array<{ name: string; provider: string; level: string; why: string }>> = {
  soc: [
    { name: "CompTIA Security+", provider: "CompTIA", level: "Foundation", why: "Baseline credential most Indian SOC hiring filters expect." },
    { name: "Splunk Core Certified User", provider: "Splunk", level: "Associate", why: "SIEM proficiency is the #1 SOC L1 hiring signal." },
    { name: "Microsoft SC-200", provider: "Microsoft", level: "Associate", why: "Sentinel/Defender SOC tooling is common in Indian MSSPs." },
    { name: "GIAC GCIA / Blue Team Level 1", provider: "GIAC / SBT", level: "Professional", why: "Differentiator for L2/L3 detection roles." },
  ],
  vapt: [
    { name: "CompTIA PenTest+", provider: "CompTIA", level: "Foundation", why: "Structured methodology recognised by Indian service firms." },
    { name: "eJPT", provider: "INE/eLearnSecurity", level: "Associate", why: "Hands-on entry credential, strong ROI for freshers." },
    { name: "OSCP", provider: "OffSec", level: "Professional", why: "The gold-standard offensive cert for Indian VAPT roles." },
    { name: "CEH (Practical)", provider: "EC-Council", level: "Professional", why: "Frequently a mandatory keyword in Indian JDs." },
  ],
  grc: [
    { name: "ISO 27001 Lead Implementer", provider: "PECB/BSI", level: "Professional", why: "Directly maps to ISMS implementation roles." },
    { name: "ISO 27001 Lead Auditor", provider: "PECB/BSI", level: "Professional", why: "Audit-side roles in Indian consulting firms." },
    { name: "CISA", provider: "ISACA", level: "Professional", why: "Most-valued audit credential across Indian enterprises." },
    { name: "CISM", provider: "ISACA", level: "Advanced", why: "Management-track GRC progression." },
  ],
};

const TRACK_COMPANIES: Record<Track, Array<{ name: string; roles: string[]; location: string; tier: string }>> = {
  soc: [
    { name: "Wipro CyberSecurity (CRS)", roles: ["SOC Analyst L1", "Threat Monitoring"], location: "Bengaluru / Pune", tier: "Service" },
    { name: "TCS Cyber Defense", roles: ["Security Analyst", "SIEM Engineer"], location: "Hyderabad / Chennai", tier: "Service" },
    { name: "Accenture Security", roles: ["SOC Analyst", "Incident Response"], location: "Bengaluru / Gurugram", tier: "Consulting" },
    { name: "Sequretek / CloudSEK", roles: ["SOC L1/L2", "Threat Intel Analyst"], location: "Mumbai / Bengaluru", tier: "Product" },
  ],
  vapt: [
    { name: "SISA / NII Consulting", roles: ["Security Consultant", "Pentester"], location: "Mumbai / Bengaluru", tier: "Boutique" },
    { name: "Deloitte / EY Cyber", roles: ["VAPT Consultant", "Red Team"], location: "Gurugram / Bengaluru", tier: "Consulting" },
    { name: "Cobalt / Bugcrowd (remote)", roles: ["Pentester", "Bug Bounty"], location: "Remote-India", tier: "Product" },
    { name: "PwC India Cyber", roles: ["Penetration Tester", "AppSec"], location: "Bengaluru / Kolkata", tier: "Consulting" },
  ],
  grc: [
    { name: "KPMG / EY GRC", roles: ["GRC Consultant", "IT Auditor"], location: "Gurugram / Mumbai", tier: "Consulting" },
    { name: "Deloitte Risk Advisory", roles: ["Risk Analyst", "ISMS Consultant"], location: "Bengaluru / Hyderabad", tier: "Consulting" },
    { name: "Infosys / TCS GRC", roles: ["Compliance Analyst", "Security Governance"], location: "Pune / Chennai", tier: "Service" },
    { name: "MetricStream / Netrika", roles: ["GRC Specialist", "Privacy Analyst"], location: "Bengaluru / Gurugram", tier: "Product" },
  ],
};

const SALARY: Record<Track, { fresher: [number, number]; mid: [number, number]; senior: [number, number] }> = {
  soc: { fresher: [3.5, 6], mid: [7, 14], senior: [16, 28] },
  vapt: { fresher: [4, 7], mid: [9, 18], senior: [20, 38] },
  grc: { fresher: [4, 7.5], mid: [10, 20], senior: [22, 40] },
};

function tk(track?: string | null): Track {
  return track && track in TRACK_NAMES ? (track as Track) : "soc";
}

/* ----------------------------- Tutor ----------------------------- */

export interface ExplainResult {
  explanation: string;
  keyPoints: string[];
  analogy: string;
  commonMistakes: string[];
  nextSteps: string[];
}

export function mockExplain(topic: string, level: "beginner" | "advanced", track?: string | null): ExplainResult {
  const name = trackName(track);
  const t = topic.trim() || "this concept";
  const beginner = level === "beginner";
  return {
    explanation: beginner
      ? `Let's break down "${t}" in the context of ${name} work. At its core, ${t} is about understanding how attackers and defenders interact so you can make the right decision quickly. As a ${name}, you'll meet ${t} whenever you investigate activity, justify a finding, or design a control. Start with the "what" and "why" before the "how": know what problem ${t} solves, then learn the tools that apply it.`
      : `For a practising ${name}, "${t}" is best understood operationally. Beyond the textbook definition, focus on the failure modes, detection/exploitation surface, and how ${t} interacts with adjacent controls. Consider edge cases (false positives/negatives, scope, blast radius) and how you would evidence or reproduce it under real constraints. Mastery means being able to defend a decision about ${t} to a senior reviewer.`,
    keyPoints: beginner
      ? [
          `${t} exists to reduce risk — always tie it back to impact.`,
          `Learn the standard workflow before memorising tools.`,
          `Practise on the labs to make ${t} muscle-memory.`,
        ]
      : [
          `Map ${t} to a framework (MITRE ATT&CK / OWASP / ISO control).`,
          `Know the detection or exploitation signal and its noise.`,
          `Be able to evidence and reproduce your conclusion.`,
          `Understand how ${t} fails and how to mitigate that.`,
        ],
    analogy: beginner
      ? `Think of ${t} like a smoke detector: it only helps if it's placed well, tested often, and someone acts when it goes off.`
      : `Treat ${t} like an instrument on a flight deck — useful only when calibrated, cross-checked against other readings, and interpreted in context.`,
    commonMistakes: [
      `Treating ${t} as a checkbox instead of a decision.`,
      `Skipping the "why" and jumping straight to tooling.`,
      beginner ? `Not validating findings before escalating.` : `Ignoring false-positive/negative trade-offs and scope.`,
    ],
    nextSteps: [
      `Do a hands-on lab that exercises ${t}.`,
      `Explain ${t} back in your own words (teach-back).`,
      `Generate a quick quiz on ${t} to check retention.`,
    ],
  };
}

export interface SummaryResult {
  tldr: string;
  summary: string;
  bullets: string[];
}

export function mockSummary(content: string): SummaryResult {
  const clean = content.replace(/\s+/g, " ").trim();
  const sentences = clean.split(/(?<=[.!?])\s+/).filter(Boolean);
  const first = sentences.slice(0, 2).join(" ");
  const bullets = sentences.slice(0, 5).map((s) => (s.length > 140 ? s.slice(0, 137) + "…" : s));
  return {
    tldr: first ? (first.length > 200 ? first.slice(0, 197) + "…" : first) : "No content provided to summarize.",
    summary: clean
      ? `This material covers ${sentences.length} key idea(s). ${first} The remaining points expand on practical application and the trade-offs you should remember when applying it on the job.`
      : "Provide some lesson text or notes and I'll summarize them for you.",
    bullets: bullets.length ? bullets : ["No content provided."],
  };
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export function mockQuiz(
  topic: string,
  count: number,
  difficulty: "beginner" | "intermediate" | "advanced",
  track?: string | null,
): { questions: QuizQuestion[] } {
  const name = trackName(track);
  const t = topic.trim() || `${name} fundamentals`;
  const templates: Array<{ q: string; opts: string[]; a: number; e: string }> = [
    {
      q: `In the context of ${name}, what is the primary purpose of ${t}?`,
      opts: ["To reduce or measure risk", "To increase system uptime only", "To replace all manual review", "To store logs indefinitely"],
      a: 0,
      e: `${t} ultimately exists to reduce or measure security risk; everything else is secondary.`,
    },
    {
      q: `Which artefact would you examine FIRST when investigating ${t}?`,
      opts: ["A marketing brochure", "The relevant logs / evidence", "The company org chart", "The office Wi-Fi password"],
      a: 1,
      e: "Always start from the primary evidence (logs/artefacts) before forming a conclusion.",
    },
    {
      q: `A common mistake when applying ${t} is to…`,
      opts: ["Tie it to business impact", "Validate before escalating", "Treat it as a checkbox", "Map it to a framework"],
      a: 2,
      e: "Treating a control or finding as a checkbox (rather than a decision) is the classic failure mode.",
    },
    {
      q: `Which framework most directly helps you structure ${t}?`,
      opts:
        track === "vapt"
          ? ["OWASP Top 10 / MITRE", "Food pyramid", "SWOT only", "RACI only"]
          : track === "grc"
            ? ["ISO 27001 / NIST CSF", "OWASP only", "Kanban only", "OSI model only"]
            : ["MITRE ATT&CK", "Periodic table", "Agile manifesto", "OSI model only"],
      a: 0,
      e: `For ${name} work, that framework gives you a shared, defensible structure.`,
    },
    {
      q: `How do you best demonstrate competence in ${t} to an employer?`,
      opts: ["Memorise definitions", "Hands-on labs + a clear write-up", "List buzzwords on a resume", "Avoid practical work"],
      a: 1,
      e: "Demonstrable, hands-on work with a clear explanation beats memorisation every time.",
    },
  ];
  const n = Math.max(1, Math.min(count || 5, templates.length * 2));
  const questions: QuizQuestion[] = [];
  for (let i = 0; i < n; i++) {
    const base = templates[i % templates.length];
    questions.push({
      id: i + 1,
      question: difficulty === "advanced" ? base.q.replace("primary purpose", "most defensible justification") : base.q,
      options: base.opts,
      answerIndex: base.a,
      explanation: base.e,
    });
  }
  return { questions };
}

/* ------------------------- Career Coach ------------------------- */

export interface CareerContext {
  trackSlug?: string | null;
  fullName?: string | null;
  ftsScore?: number | null;
  assessmentLevel?: string | null;
  labsCompleted?: number;
  modulesCompleted?: number;
  interviewsTaken?: number;
  bestInterviewScore?: number | null;
  hasResume?: boolean;
  applications?: number;
}

export interface CareerReport {
  skillGap: { current: string[]; required: string[]; gap: string[]; summary: string };
  roadmap: Array<{ phase: number; title: string; durationWeeks: number; focus: string[] }>;
  certifications: Array<{ name: string; provider: string; level: string; why: string }>;
  targetCompanies: Array<{ name: string; roles: string[]; location: string; tier: string }>;
  expectedSalary: {
    currency: string;
    fresher: { min: number; max: number };
    mid: { min: number; max: number };
    senior: { min: number; max: number };
    note: string;
  };
  placementReadiness: {
    score: number;
    level: string;
    factors: Array<{ label: string; score: number; max: number; note: string }>;
    summary: string;
  };
}

export function computePlacementReadiness(ctx: CareerContext): CareerReport["placementReadiness"] {
  const fts = Math.max(0, Math.min(100, ctx.ftsScore ?? 0));
  const labs = Math.min(20, ctx.labsCompleted ?? 0);
  const modules = Math.min(20, ctx.modulesCompleted ?? 0);
  const interviews = Math.min(5, ctx.interviewsTaken ?? 0);
  const interviewQuality = ctx.bestInterviewScore ?? 0;

  const factors = [
    { label: "Foundational skill (FTS)", score: Math.round((fts / 100) * 30), max: 30, note: `FTS score ${fts}/100.` },
    { label: "Hands-on labs", score: Math.round((labs / 20) * 20), max: 20, note: `${ctx.labsCompleted ?? 0} lab(s) completed.` },
    { label: "Learning progress", score: Math.round((modules / 20) * 15), max: 15, note: `${ctx.modulesCompleted ?? 0} module(s) completed.` },
    { label: "Interview practice", score: Math.round((interviews / 5) * 15), max: 15, note: `${ctx.interviewsTaken ?? 0} mock interview(s).` },
    { label: "Interview quality", score: Math.round((interviewQuality / 100) * 10), max: 10, note: ctx.bestInterviewScore != null ? `Best score ${interviewQuality}/100.` : "No interview scored yet." },
    { label: "Resume ready", score: ctx.hasResume ? 10 : 0, max: 10, note: ctx.hasResume ? "Resume uploaded." : "Upload & analyze your resume." },
  ];
  const score = factors.reduce((s, f) => s + f.score, 0);
  const level = score >= 80 ? "Job-ready" : score >= 60 ? "Almost there" : score >= 35 ? "Developing" : "Getting started";
  return {
    score,
    level,
    factors,
    summary:
      score >= 80
        ? "You're job-ready. Focus on interview polish and targeted applications."
        : score >= 60
          ? "You're close. Close the remaining skill gaps and do 2-3 more mock interviews."
          : score >= 35
            ? "Solid start. Prioritise hands-on labs and the foundational skill score next."
            : "Begin with the learning track and your first labs to build momentum.",
  };
}

export function mockCareerReport(ctx: CareerContext): CareerReport {
  const track = tk(ctx.trackSlug);
  const name = trackName(track);
  const required = TRACK_SKILLS[track];
  // Approximate "current" skills from progress signals.
  const acquiredCount = Math.min(required.length, Math.floor(((ctx.labsCompleted ?? 0) + (ctx.modulesCompleted ?? 0)) / 2));
  const current = required.slice(0, acquiredCount);
  const gap = required.slice(acquiredCount);
  const s = SALARY[track];
  return {
    skillGap: {
      current,
      required,
      gap,
      summary: gap.length
        ? `You've started building ${current.length}/${required.length} core ${name} skills. Prioritise: ${gap.slice(0, 3).join(", ")}.`
        : `You cover the core ${name} skill set — now deepen specialisation and evidence it with projects.`,
    },
    roadmap: [
      { phase: 1, title: "Foundations", durationWeeks: 4, focus: required.slice(0, 3) },
      { phase: 2, title: "Hands-on depth", durationWeeks: 6, focus: required.slice(3, 6) },
      { phase: 3, title: "Specialisation & evidence", durationWeeks: 4, focus: required.slice(6) },
      { phase: 4, title: "Placement prep", durationWeeks: 2, focus: ["Resume + portfolio", "Mock interviews", "Targeted applications"] },
    ],
    certifications: TRACK_CERTS[track],
    targetCompanies: TRACK_COMPANIES[track],
    expectedSalary: {
      currency: "INR LPA",
      fresher: { min: s.fresher[0], max: s.fresher[1] },
      mid: { min: s.mid[0], max: s.mid[1] },
      senior: { min: s.senior[0], max: s.senior[1] },
      note: `Indicative India ranges for ${name} roles; metros and product companies skew higher.`,
    },
    placementReadiness: computePlacementReadiness(ctx),
  };
}

export function mockCareerChat(message: string, ctx: CareerContext): string {
  const name = trackName(ctx.trackSlug);
  const readiness = computePlacementReadiness(ctx);
  return `Here's my guidance on "${message.trim()}" for your ${name} track:

1. Skills first — strengthen ${TRACK_SKILLS[tk(ctx.trackSlug)].slice(0, 2).join(" and ")}; these are the strongest hiring signals in India.
2. Evidence it — finish hands-on labs and write short post-mortems you can show in interviews.
3. Certify strategically — ${TRACK_CERTS[tk(ctx.trackSlug)][0].name} is a good next milestone.
4. Practice interviews — your current placement readiness is ${readiness.score}/100 (${readiness.level}).

Want a full Career Report? Open the Career Report tab and I'll generate your skill gap, roadmap, target companies, and salary bands.`;
}

/* ------------------------- Mock Interview ------------------------- */

const INTERVIEW_BANK: Record<Track, string[]> = {
  soc: [
    "Walk me through how you would triage a suspected phishing alert from your SIEM.",
    "What is the difference between an IOC and an IOA? Give an example of each.",
    "How would you use the MITRE ATT&CK framework during an investigation?",
    "A user reports their machine is slow and pops up ads. How do you investigate?",
    "Explain the difference between true positive, false positive, and benign true positive.",
    "How do you reduce alert fatigue in a SOC?",
    "What Windows event IDs would you look at for failed and successful logons?",
    "Describe the incident response lifecycle and where the SOC fits in.",
  ],
  vapt: [
    "Explain how you would approach a black-box web application penetration test.",
    "What is the difference between stored, reflected, and DOM-based XSS?",
    "How does a SQL injection attack work and how do you remediate it?",
    "Walk me through privilege escalation on a Linux host you've already accessed.",
    "How do you score a vulnerability using CVSS? What goes into the base metrics?",
    "What's your methodology for testing an API for broken access control?",
    "How would you exploit and then explain an IDOR to a developer?",
    "Describe how you write a finding so a non-technical stakeholder understands the risk.",
  ],
  grc: [
    "Walk me through how you would conduct a risk assessment for a new SaaS vendor.",
    "What are the key clauses of ISO 27001 Annex A you focus on first?",
    "How does the DPDP Act 2023 change how an Indian company handles personal data?",
    "Explain the difference between a policy, a standard, and a procedure.",
    "How do you gather and present audit evidence for an access-control review?",
    "What is residual risk and how do you communicate it to leadership?",
    "How would you build a third-party risk management program from scratch?",
    "Describe how you'd map controls across ISO 27001, SOC 2, and NIST CSF.",
  ],
};

export function mockInterviewQuestions(track: string | null | undefined, count: number): string[] {
  const bank = INTERVIEW_BANK[tk(track)];
  const n = Math.max(3, Math.min(count || 6, bank.length));
  return bank.slice(0, n);
}

export interface InterviewEvaluation {
  scores: {
    technical: number;
    grammar: number;
    communication: number;
    confidence: number;
    thinking: number;
    quality: number;
  };
  overall: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  perQuestion: Array<{ question: string; answer: string; score: number; feedback: string }>;
}

function scoreAnswer(answer: string): { score: number; feedback: string } {
  const words = answer.trim().split(/\s+/).filter(Boolean);
  const wc = words.length;
  const hasStructure = /\b(first|then|next|finally|because|therefore|step|1\.|2\.)\b/i.test(answer);
  const technicalTerms = (answer.match(/\b(SIEM|MITRE|XSS|SQL|CVSS|ISO|NIST|DPDP|firewall|payload|privilege|audit|risk|log|exploit|control|incident|vulnerab)/gi) || []).length;
  let score = 30;
  if (wc >= 20) score += 15;
  if (wc >= 50) score += 15;
  if (hasStructure) score += 15;
  score += Math.min(25, technicalTerms * 6);
  score = Math.max(10, Math.min(100, score));
  const feedback =
    wc < 15
      ? "Answer was quite short — expand with reasoning and a concrete example."
      : technicalTerms === 0
        ? "Add domain-specific terminology to demonstrate depth."
        : hasStructure
          ? "Well structured and on-topic; good use of relevant terminology."
          : "Good content — structure it (situation → action → result) for clarity.";
  return { score, feedback };
}

export function mockInterviewEvaluation(
  qa: Array<{ question: string; answer: string }>,
): InterviewEvaluation {
  const per = qa.map((x) => {
    const { score, feedback } = scoreAnswer(x.answer || "");
    return { question: x.question, answer: x.answer || "", score, feedback };
  });
  const avg = per.length ? Math.round(per.reduce((s, p) => s + p.score, 0) / per.length) : 0;
  const allText = qa.map((x) => x.answer || "").join(" ");
  const totalWords = allText.trim().split(/\s+/).filter(Boolean).length;
  const grammar = Math.max(40, Math.min(100, 70 + (totalWords > 200 ? 15 : 0) - (/(\bi is\b|\bdont\b|\bdoesnt\b)/i.test(allText) ? 15 : 0)));
  const communication = Math.max(35, Math.min(100, avg + 5));
  const confidence = Math.max(35, Math.min(100, 50 + Math.min(40, totalWords / 8)));
  const thinking = Math.max(35, Math.min(100, avg + (/(because|therefore|trade-?off|however)/i.test(allText) ? 12 : -5)));
  const quality = avg;
  const technical = avg;
  const overall = Math.round((technical + grammar + communication + confidence + thinking + quality) / 6);

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  if (technical >= 65) strengths.push("Solid technical grounding in the domain.");
  else weaknesses.push("Technical depth needs work — study the core concepts again.");
  if (communication >= 65) strengths.push("Clear, structured communication.");
  else weaknesses.push("Structure answers using situation → action → result.");
  if (confidence >= 65) strengths.push("Confident, complete responses.");
  else weaknesses.push("Give fuller answers — short replies read as low confidence.");
  if (grammar >= 75) strengths.push("Strong written English.");
  else weaknesses.push("Tighten grammar and sentence construction.");
  if (strengths.length === 0) strengths.push("You completed the full interview — good persistence.");

  return {
    scores: { technical, grammar, communication, confidence, thinking, quality },
    overall,
    strengths,
    weaknesses,
    recommendations: [
      "Review the questions you scored lowest on and re-answer them aloud.",
      "Do another mock interview within a week to track improvement.",
      "Pair each technical answer with a concrete example from a lab you completed.",
      overall < 60 ? "Revisit the learning track fundamentals before the next attempt." : "Practise concise, structured delivery to push into the top band.",
    ],
    perQuestion: per,
  };
}

/* ------------------------- English Coach ------------------------- */

export interface EnglishEvaluation {
  scores: { grammar: number; vocabulary: number; fluency: number; confidence: number; pronunciation: number };
  overall: number;
  corrections: Array<{ original: string; suggestion: string; explanation: string }>;
  highlights: string[];
  roadmap: Array<{ area: string; level: string; actions: string[] }>;
  summary: string;
  pronunciationNote: string;
}

export function mockEnglishEvaluation(text: string, fromVoice: boolean): EnglishEvaluation {
  const clean = text.replace(/\s+/g, " ").trim();
  const words = clean.split(/\s+/).filter(Boolean);
  const wc = words.length;
  const unique = new Set(words.map((w) => w.toLowerCase().replace(/[^a-z]/g, ""))).size;
  const lexicalDiversity = wc ? unique / wc : 0;
  const sentences = clean.split(/(?<=[.!?])\s+/).filter(Boolean);
  const avgSentLen = sentences.length ? wc / sentences.length : wc;

  const corrections: EnglishEvaluation["corrections"] = [];
  const patterns: Array<{ re: RegExp; suggestion: (m: string) => string; explanation: string }> = [
    { re: /\bi is\b/gi, suggestion: () => "I am", explanation: "Subject–verb agreement: use \"I am\"." },
    { re: /\bdont\b/gi, suggestion: () => "don't", explanation: "Contraction needs an apostrophe." },
    { re: /\bdoesnt\b/gi, suggestion: () => "doesn't", explanation: "Contraction needs an apostrophe." },
    { re: /\bcan not\b/gi, suggestion: () => "cannot", explanation: "\"cannot\" is written as one word." },
    { re: /\ba lot off\b/gi, suggestion: () => "a lot of", explanation: "\"of\", not \"off\"." },
  ];
  for (const p of patterns) {
    const m = clean.match(p.re);
    if (m) corrections.push({ original: m[0], suggestion: p.suggestion(m[0]), explanation: p.explanation });
  }

  const grammar = Math.max(40, Math.min(100, 90 - corrections.length * 12 + (avgSentLen > 8 && avgSentLen < 25 ? 5 : 0)));
  const vocabulary = Math.max(40, Math.min(100, Math.round(50 + lexicalDiversity * 60)));
  const fluency = Math.max(40, Math.min(100, Math.round(50 + Math.min(40, wc / 5) - (avgSentLen > 30 ? 10 : 0))));
  const confidence = Math.max(40, Math.min(100, Math.round(45 + Math.min(45, wc / 4))));
  const pronunciation = fromVoice ? Math.max(45, Math.min(95, fluency - 5)) : 0;
  const considered = fromVoice ? 5 : 4;
  const overall = Math.round((grammar + vocabulary + fluency + confidence + (fromVoice ? pronunciation : 0)) / considered);

  return {
    scores: { grammar, vocabulary, fluency, confidence, pronunciation },
    overall,
    corrections,
    highlights: [
      `Lexical diversity ${(lexicalDiversity * 100).toFixed(0)}% across ${wc} words.`,
      `Average sentence length ${avgSentLen.toFixed(1)} words.`,
      corrections.length ? `${corrections.length} grammar item(s) to fix.` : "No obvious grammar errors detected.",
    ],
    roadmap: [
      {
        area: "Grammar",
        level: grammar >= 80 ? "Strong" : grammar >= 60 ? "Developing" : "Focus area",
        actions: ["Review subject–verb agreement and tenses", "Read your answers aloud to catch errors"],
      },
      {
        area: "Vocabulary",
        level: vocabulary >= 75 ? "Strong" : "Developing",
        actions: ["Learn 5 domain terms/week", "Replace repeated words with synonyms"],
      },
      {
        area: "Fluency & confidence",
        level: fluency >= 75 ? "Strong" : "Developing",
        actions: ["Practise 2-minute spoken answers", "Reduce filler words; pause instead"],
      },
    ],
    summary:
      overall >= 80
        ? "Strong communicator — keep practising domain-specific vocabulary."
        : overall >= 60
          ? "Good foundation. Focus on grammar precision and fuller answers."
          : "Build the basics: short correct sentences first, then expand length and vocabulary.",
    pronunciationNote: fromVoice
      ? "Pronunciation scored from your spoken transcript fluency. For precise phoneme-level scoring, connect an AI provider with speech analysis."
      : "Pronunciation scoring requires a voice (spoken) submission. Use the microphone to include it.",
  };
}

/* ------------------------- Resume Analyzer ------------------------- */

/** ATS keywords Indian recruiters / parsers scan for, per track. */
const TRACK_RESUME_KEYWORDS: Record<Track, string[]> = {
  soc: [
    "SIEM", "Splunk", "QRadar", "ELK", "Incident Response", "MITRE ATT&CK",
    "Threat Hunting", "EDR", "Wireshark", "Phishing Analysis", "SOAR", "Log Analysis",
  ],
  vapt: [
    "OWASP Top 10", "Burp Suite", "Metasploit", "Nmap", "Penetration Testing",
    "SQL Injection", "XSS", "Privilege Escalation", "Active Directory", "CVSS",
    "API Security", "Kali Linux",
  ],
  grc: [
    "ISO 27001", "NIST CSF", "SOC 2", "Risk Assessment", "DPDP", "GDPR",
    "Internal Audit", "Security Policy", "BCP/DR", "Vendor Risk", "CISA", "Compliance",
  ],
};

export function trackResumeKeywords(track?: string | null): string[] {
  return TRACK_RESUME_KEYWORDS[tk(track)];
}

export interface ResumeAnalysis {
  atsScore: number;
  formatting: string;
  keywordsFound: string[];
  keywordsMissing: string[];
  strengths: string[];
  improvements: string[];
  jobMatch: number;
  overallRating: string;
  /** When true, scoring is based on track context only (resume text could not be read). */
  contentAnalyzed?: boolean;
  note?: string;
}

function ratingFromScore(score: number): string {
  if (score >= 90) return "A+";
  if (score >= 85) return "A";
  if (score >= 78) return "A-";
  if (score >= 72) return "B+";
  if (score >= 65) return "B";
  if (score >= 55) return "B-";
  if (score >= 45) return "C+";
  return "C";
}

/**
 * Deterministic resume analysis. When `resumeText` is supplied it scores the
 * actual content against the track's ATS keywords; otherwise it returns a
 * track-grounded baseline and flags that the document text could not be read.
 */
export function mockResumeAnalysis(track: string | null | undefined, resumeText?: string): ResumeAnalysis {
  const name = trackName(track);
  const keywords = trackResumeKeywords(track);
  const text = (resumeText ?? "").toLowerCase();
  const hasText = text.replace(/\s+/g, "").length >= 80;

  if (!hasText) {
    return {
      atsScore: 60,
      formatting: "Unknown",
      keywordsFound: [],
      keywordsMissing: keywords,
      strengths: [
        "Resume submitted for review.",
        `Targeting ${name} roles — a focused, single-track resume scores better with ATS.`,
      ],
      improvements: [
        `Add ${name} keywords ATS scanners expect: ${keywords.slice(0, 5).join(", ")}.`,
        "Quantify achievements (incidents handled, vulnerabilities found, audits completed).",
        "Include a certifications section relevant to your track.",
        "Add a 2-3 line professional summary tailored to the role.",
      ],
      jobMatch: 55,
      overallRating: ratingFromScore(60),
      contentAnalyzed: false,
      note: "We couldn't read the document text, so this analysis is based on your track. Paste your resume text or share a public, text-based link for a content-level ATS score.",
    };
  }

  const found = keywords.filter((k) => text.includes(k.toLowerCase()));
  const missing = keywords.filter((k) => !text.includes(k.toLowerCase()));
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const hasNumbers = /\d/.test(text);
  const hasCerts = /(security\+|ceh|oscp|cisa|cism|comptia|iso\s?27001|sc-200|pentest\+|ejpt)/i.test(resumeText ?? "");
  const hasSummary = /(summary|objective|profile)/i.test(resumeText ?? "");
  const hasEmail = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(resumeText ?? "");

  const keywordScore = Math.round((found.length / keywords.length) * 45);
  let score = 30 + keywordScore;
  if (hasNumbers) score += 8;
  if (hasCerts) score += 8;
  if (hasSummary) score += 5;
  if (hasEmail) score += 4;
  if (wordCount >= 250 && wordCount <= 900) score += 5;
  score = Math.max(20, Math.min(98, score));

  const jobMatch = Math.max(20, Math.min(98, Math.round((found.length / keywords.length) * 100)));

  const strengths: string[] = [];
  if (found.length) strengths.push(`Strong keyword coverage: ${found.slice(0, 5).join(", ")}.`);
  if (hasNumbers) strengths.push("Includes quantified achievements — recruiters value measurable impact.");
  if (hasCerts) strengths.push("Certifications detected, a key hiring signal for Indian roles.");
  if (hasEmail) strengths.push("Contact information is present and parseable.");
  if (strengths.length === 0) strengths.push("Resume text was readable by the ATS parser.");

  const improvements: string[] = [];
  if (missing.length) improvements.push(`Add missing ${name} keywords: ${missing.slice(0, 5).join(", ")}.`);
  if (!hasNumbers) improvements.push("Quantify your impact (e.g. 'triaged 50+ alerts/day', 'found 12 critical bugs').");
  if (!hasCerts) improvements.push(`Add a certifications section — even an in-progress ${name} cert helps.`);
  if (!hasSummary) improvements.push("Add a 2-3 line professional summary tailored to the target role.");
  if (improvements.length === 0) improvements.push("Tailor each application to the specific job description's keywords.");

  return {
    atsScore: score,
    formatting: score >= 75 ? "Good" : score >= 55 ? "Fair" : "Needs Work",
    keywordsFound: found,
    keywordsMissing: missing,
    strengths,
    improvements,
    jobMatch,
    overallRating: ratingFromScore(score),
    contentAnalyzed: true,
  };
}
