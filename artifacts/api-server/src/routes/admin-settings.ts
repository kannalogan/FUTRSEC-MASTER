import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";
import { db } from "@workspace/db";
import { platformSettingsTable } from "@workspace/db";
import {
  requireAuth,
  requireRole,
  type AuthRequest,
} from "../middlewares/auth";

const router = Router();

const adminGuards = [requireAuth, requireRole("admin")];

async function getOrCreateSettings() {
  const [existing] = await db
    .select()
    .from(platformSettingsTable)
    .where(eq(platformSettingsTable.id, 1));

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(platformSettingsTable)
    .values({ id: 1, trialDays: 15 })
    .returning();

  return created;
}

// GET /admin/settings — fetch (and create on first read) the single settings row
router.get(
  "/admin/settings",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const settings = await getOrCreateSettings();
    res.json({ settings });
    return;
  },
);

const updateSettingsSchema = z.object({
  trialDays: z.number().int().min(0).optional(),
  logoUrl: z.string().nullable().optional(),
  bannerUrl: z.string().nullable().optional(),
  termsContent: z.string().nullable().optional(),
  privacyContent: z.string().nullable().optional(),
  refundContent: z.string().nullable().optional(),
  contactEmail: z.string().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
  contactAddress: z.string().nullable().optional(),
});

// PUT /admin/settings — update the single settings row
router.put(
  "/admin/settings",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const parsed = updateSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid settings payload",
        details: parsed.error.issues,
      });
      return;
    }

    await getOrCreateSettings();

    const [updated] = await db
      .update(platformSettingsTable)
      .set({ ...parsed.data, updatedBy: req.user?.userId })
      .where(eq(platformSettingsTable.id, 1))
      .returning();

    req.log.info({ settingsId: 1 }, "Platform settings updated");
    res.json({ settings: updated });
    return;
  },
);

const SECRET_KEYS = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
  "OPENAI_API_KEY",
  "GEMINI_API_KEY",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
] as const;

// GET /admin/settings/secrets — secret STATUS only, never values
router.get(
  "/admin/settings/secrets",
  ...adminGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const secrets = SECRET_KEYS.map((key) => {
      let configured = !!process.env[key];
      if (
        key === "OPENAI_API_KEY" &&
        !configured &&
        !!process.env.AI_INTEGRATIONS_OPENAI_API_KEY
      ) {
        configured = true;
      }
      return { key, configured };
    });

    res.json({ secrets });
    return;
  },
);

export default router;
