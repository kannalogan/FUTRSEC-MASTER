import { Router } from "express";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { db } from "@workspace/db";
import {
  usersTable,
  studentProfilesTable,
  refreshTokensTable,
  tracksTable,
} from "@workspace/db";
import {
  SendOtpBody,
  VerifyOtpBody,
  RefreshTokenBody,
  CompleteProfileBody,
  SelectTrackBody,
} from "@workspace/api-zod";
import { signAccessToken, signRefreshToken, verifyRefreshToken, REFRESH_TOKEN_TTL_DAYS } from "../lib/jwt";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { logger } from "../lib/logger";
import { eventBus } from "../lib/events";
import { sendEmail, buildOtpEmail } from "../lib/email";

const router = Router();

const OTP_STORE = new Map<string, { otp: string; expiresAt: number; attempts: number }>();

// ── Helper: serialize user for JSON responses ──────────────────────────────
function serializeUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    email: user.email ?? null,
    phone: user.phone ?? null,
    fullName: user.fullName ?? null,
    role: user.role,
    onboardingStep: user.onboardingStep,
    selectedTrackId: user.selectedTrackId ?? null,
    avatarUrl: user.avatarUrl ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

router.post("/auth/send-otp", async (req: AuthRequest, res): Promise<void> => {
  const parsed = SendOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { contact, type } = parsed.data;
  const key = `${type}:${contact}`;

  const existing = OTP_STORE.get(key);
  if (existing && existing.expiresAt > Date.now()) {
    res.status(429).json({ error: "OTP already sent. Please wait before requesting a new one." });
    return;
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000;
  OTP_STORE.set(key, { otp, expiresAt, attempts: 0 });

  const isDev = process.env["NODE_ENV"] === "development";

  if (isDev) {
    req.log.info({ contact, type, otp }, "OTP generated [DEV — not emailed]");
  } else {
    req.log.info({ contact, type }, "OTP generated");
  }

  if (type === "email") {
    const { html, text } = buildOtpEmail(otp);
    sendEmail({ to: contact, subject: "Your FUTRSEC sign-in code", html, text }).catch(
      (err: unknown) => {
        req.log.error(
          { err: (err as Error).message, contact },
          "Failed to send OTP email"
        );
      }
    );
  }

  const responseBody: Record<string, unknown> = {
    message: "OTP sent successfully",
    expiresIn: 300,
  };
  if (isDev) responseBody.otp = otp;
  res.json(responseBody);
});

router.post("/auth/verify-otp", async (req: AuthRequest, res): Promise<void> => {
  const parsed = VerifyOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { contact, otp, type } = parsed.data;
  const contactType = type ?? "email";
  const key = `${contactType}:${contact}`;
  const stored = OTP_STORE.get(key);

  if (!stored) {
    res.status(401).json({ error: "No OTP found for this contact. Please request a new OTP." });
    return;
  }

  if (stored.expiresAt < Date.now()) {
    OTP_STORE.delete(key);
    res.status(401).json({ error: "OTP has expired. Please request a new one." });
    return;
  }

  stored.attempts++;
  if (stored.attempts > 5) {
    OTP_STORE.delete(key);
    res.status(401).json({ error: "Too many failed attempts. Please request a new OTP." });
    return;
  }

  if (stored.otp !== otp) {
    res.status(401).json({ error: "Invalid OTP. Please check and try again." });
    return;
  }

  OTP_STORE.delete(key);

  const isEmail = contactType === "email";
  const whereClause = isEmail
    ? eq(usersTable.email, contact)
    : eq(usersTable.phone, contact);

  let [user] = await db.select().from(usersTable).where(whereClause);

  if (!user) {
    const [created] = await db
      .insert(usersTable)
      .values({
        ...(isEmail ? { email: contact } : { phone: contact }),
        role: "student",
        onboardingStep: "consent",
      })
      .returning();
    user = created;

    await db.insert(studentProfilesTable).values({ userId: user.id });

    eventBus.emit("user.created", {
      type: "user.created",
      userId: user.id,
      role: user.role,
    });
  } else {
    await db
      .update(usersTable)
      .set({ lastLoginAt: new Date() })
      .where(eq(usersTable.id, user.id));
  }

  const accessToken = signAccessToken({ userId: user.id, role: user.role });
  const refreshToken = signRefreshToken({ userId: user.id });
  const tokenHash = await bcrypt.hash(refreshToken, 10);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

  await db.insert(refreshTokensTable).values({
    userId: user.id,
    tokenHash,
    expiresAt,
  });

  res.json({
    accessToken,
    refreshToken,
    user: serializeUser(user),
  });
});

router.post("/auth/refresh", async (req: AuthRequest, res): Promise<void> => {
  const parsed = RefreshTokenBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { refreshToken } = parsed.data;

  let payload: { userId: number };
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    res.status(401).json({ error: "Invalid or expired refresh token" });
    return;
  }

  const tokens = await db
    .select()
    .from(refreshTokensTable)
    .where(eq(refreshTokensTable.userId, payload.userId));

  let validToken = null;
  for (const t of tokens) {
    if (t.revokedAt) continue;
    if (t.expiresAt < new Date()) continue;
    const match = await bcrypt.compare(refreshToken, t.tokenHash);
    if (match) {
      validToken = t;
      break;
    }
  }

  if (!validToken) {
    res.status(401).json({ error: "Refresh token not found or revoked" });
    return;
  }

  await db
    .update(refreshTokensTable)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokensTable.id, validToken.id));

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, payload.userId));

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const newAccessToken = signAccessToken({ userId: user.id, role: user.role });
  const newRefreshToken = signRefreshToken({ userId: user.id });
  const newHash = await bcrypt.hash(newRefreshToken, 10);
  const newExpiresAt = new Date();
  newExpiresAt.setDate(newExpiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

  await db.insert(refreshTokensTable).values({
    userId: user.id,
    tokenHash: newHash,
    expiresAt: newExpiresAt,
  });

  res.json({
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    user: serializeUser(user),
  });
});

router.post("/auth/logout", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  await db
    .update(refreshTokensTable)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokensTable.userId, req.user.userId));

  req.log.info({ userId: req.user.userId }, "User logged out");
  res.sendStatus(204);
});

router.get("/auth/me", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.user.userId));

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  res.json(serializeUser(user));
});

router.post("/auth/complete-profile", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const parsed = CompleteProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { fullName, college, graduationYear, city, role } = parsed.data;

  const [user] = await db
    .update(usersTable)
    .set({
      fullName,
      onboardingStep: "track_selection",
    })
    .where(eq(usersTable.id, req.user.userId))
    .returning();

  await db
    .update(studentProfilesTable)
    .set({
      ...(college ? { college } : {}),
      ...(graduationYear ? { graduationYear } : {}),
      ...(city ? { city } : {}),
      ...(role ? { currentRole: role } : {}),
    })
    .where(eq(studentProfilesTable.userId, req.user.userId));

  res.json(serializeUser(user));
});

router.post("/auth/select-track", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const parsed = SelectTrackBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { trackSlug } = parsed.data;

  const [track] = await db
    .select()
    .from(tracksTable)
    .where(eq(tracksTable.slug, trackSlug));

  if (!track) {
    res.status(400).json({ error: `Track "${trackSlug}" not found` });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set({
      selectedTrackId: track.id,
      onboardingStep: "pre_assessment",
    })
    .where(eq(usersTable.id, req.user.userId))
    .returning();

  await db
    .update(tracksTable)
    .set({ enrolledCount: track.enrolledCount + 1 })
    .where(eq(tracksTable.id, track.id));

  eventBus.emit("track.selected", {
    type: "track.selected",
    userId: req.user.userId,
    trackId: track.id,
  });

  res.json(serializeUser(user));
});

export default router;
