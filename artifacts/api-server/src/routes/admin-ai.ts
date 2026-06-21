import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";
import { db } from "@workspace/db";
import { aiFeatureConfigTable } from "@workspace/db";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth";
import { createAuditLog } from "../lib/audit";

const router = Router();

const adminGuards = [requireAuth, requireRole("admin")];

const AI_FEATURES = [
  "explain_tutor",
  "career_coach",
  "mock_interview",
  "resume_analyzer",
] as const;
type AiFeature = (typeof AI_FEATURES)[number];

const DEFAULT_RESUME_KEYWORDS = {
  socKeywords: [
    "Splunk",
    "QRadar",
    "SIEM",
    "EDR",
    "Threat Hunting",
    "MITRE ATT&CK",
  ],
  vaptKeywords: ["Burp Suite", "Metasploit", "Nmap", "OWASP", "SQLi", "XSS"],
  grcKeywords: [
    "ISO27001",
    "NIST",
    "DPDP",
    "Risk Management",
    "Vendor Assessment",
  ],
};

function defaultSettingsFor(feature: AiFeature): Record<string, unknown> {
  if (feature === "resume_analyzer") {
    return { ...DEFAULT_RESUME_KEYWORDS };
  }
  if (feature === "mock_interview") {
    return { questionCount: 5, difficulty: "medium", track: null };
  }
  return {};
}

const mockInterviewSettingsSchema = z.object({
  questionCount: z.number().int().min(1).max(100).optional(),
  difficulty: z.string().min(1).max(40).optional(),
  track: z.enum(["soc", "vapt", "grc"]).nullable().optional(),
});

const resumeAnalyzerSettingsSchema = z.object({
  socKeywords: z.array(z.string().min(1).max(120)).max(200).optional(),
  vaptKeywords: z.array(z.string().min(1).max(120)).max(200).optional(),
  grcKeywords: z.array(z.string().min(1).max(120)).max(200).optional(),
});

const updateConfigSchema = z.object({
  enabled: z.boolean().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

// GET /admin/ai/config — list all 4 features with enabled + settings (defaults if missing)
router.get(
  "/admin/ai/config",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const rows = await db.select().from(aiFeatureConfigTable);
    const byFeature = new Map(rows.map((r) => [r.feature, r]));

    const features = AI_FEATURES.map((feature) => {
      const row = byFeature.get(feature);
      if (!row) {
        return {
          feature,
          enabled: true,
          settings: defaultSettingsFor(feature),
        };
      }
      let settings = (row.settings ?? {}) as Record<string, unknown>;
      // Seed default resume keywords if not set
      if (feature === "resume_analyzer") {
        settings = {
          ...settings,
          socKeywords:
            (settings.socKeywords as string[] | undefined) ??
            DEFAULT_RESUME_KEYWORDS.socKeywords,
          vaptKeywords:
            (settings.vaptKeywords as string[] | undefined) ??
            DEFAULT_RESUME_KEYWORDS.vaptKeywords,
          grcKeywords:
            (settings.grcKeywords as string[] | undefined) ??
            DEFAULT_RESUME_KEYWORDS.grcKeywords,
        };
      }
      return {
        feature: row.feature,
        enabled: row.enabled,
        settings,
      };
    });

    res.json({ features });
    return;
  }
);

// PATCH /admin/ai/config/:feature — upsert enabled and/or settings
router.patch(
  "/admin/ai/config/:feature",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const featureRaw = Array.isArray(req.params.feature)
      ? req.params.feature[0]
      : req.params.feature;
    if (!AI_FEATURES.includes(featureRaw as AiFeature)) {
      res.status(400).json({
        error: "Invalid feature",
        details: { allowed: AI_FEATURES },
      });
      return;
    }
    const feature = featureRaw as AiFeature;

    const parsed = updateConfigSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const { enabled, settings } = parsed.data;

    let validatedSettings: Record<string, unknown> | undefined;
    if (settings !== undefined) {
      if (feature === "mock_interview") {
        const s = mockInterviewSettingsSchema.safeParse(settings);
        if (!s.success) {
          res.status(400).json({
            error: "Invalid mock_interview settings",
            details: s.error.issues,
          });
          return;
        }
        validatedSettings = s.data;
      } else if (feature === "resume_analyzer") {
        const s = resumeAnalyzerSettingsSchema.safeParse(settings);
        if (!s.success) {
          res.status(400).json({
            error: "Invalid resume_analyzer settings",
            details: s.error.issues,
          });
          return;
        }
        validatedSettings = s.data;
      } else {
        validatedSettings = settings;
      }
    }

    const existing = await db.query.aiFeatureConfigTable.findFirst({
      where: eq(aiFeatureConfigTable.feature, feature),
    });

    let mergedSettings: Record<string, unknown> | undefined;
    if (validatedSettings !== undefined) {
      const base = (existing?.settings ?? {}) as Record<string, unknown>;
      mergedSettings = { ...base, ...validatedSettings };
    }

    let row;
    if (existing) {
      [row] = await db
        .update(aiFeatureConfigTable)
        .set({
          ...(enabled !== undefined ? { enabled } : {}),
          ...(mergedSettings !== undefined ? { settings: mergedSettings } : {}),
          updatedBy: req.user.userId,
        })
        .where(eq(aiFeatureConfigTable.feature, feature))
        .returning();
    } else {
      [row] = await db
        .insert(aiFeatureConfigTable)
        .values({
          feature,
          enabled: enabled ?? true,
          settings: mergedSettings ?? defaultSettingsFor(feature),
          updatedBy: req.user.userId,
        })
        .returning();
    }

    await createAuditLog({
      userId: req.user.userId,
      action: "admin.ai_config.updated",
      entityType: "ai_feature_config",
      entityId: row.id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { feature, enabled, settings: validatedSettings },
    });

    res.json({
      feature: row.feature,
      enabled: row.enabled,
      settings: (row.settings ?? {}) as Record<string, unknown>,
    });
    return;
  }
);

export default router;
