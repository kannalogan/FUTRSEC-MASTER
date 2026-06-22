import { Router } from "express";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { db } from "@workspace/db";
import {
  usersTable,
  studentProfilesTable,
  tpoProfilesTable,
  employersTable,
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
import { authLimiter } from "../lib/rate-limit";
import { logger } from "../lib/logger";
import { eventBus } from "../lib/events";
import { sendEmail, buildOtpEmail } from "../lib/email";

const router = Router();

const OTP_STORE = new Map<string, { otp: string; expiresAt: number; attempts: number }>();
const RESET_OTP_STORE = new Map<string, { otp: string; expiresAt: number }>();
const BLOCKED_DOMAINS = new Set(["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "rediffmail.com", "live.com"]);

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getClientIp(req: AuthRequest): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string") return fwd.split(",")[0].trim();
  return req.socket?.remoteAddress ?? "unknown";
}

// ── Helper: serialize user for JSON responses ──────────────────────────────
// `approvalStatus` is the live, authoritative gate for tpo/employer accounts.
// It is read fresh from the profile table on every call (including /auth/me),
// so an admin approval is reflected immediately on the next request/refresh.
async function serializeUser(user: typeof usersTable.$inferSelect) {
  let approvalStatus: string | null = null;
  if (user.role === "tpo") {
    const [p] = await db
      .select({ approvalStatus: tpoProfilesTable.approvalStatus })
      .from(tpoProfilesTable)
      .where(eq(tpoProfilesTable.userId, user.id));
    approvalStatus = p?.approvalStatus ?? "pending";
  } else if (user.role === "employer") {
    const [p] = await db
      .select({ approvalStatus: employersTable.approvalStatus })
      .from(employersTable)
      .where(eq(employersTable.userId, user.id));
    approvalStatus = p?.approvalStatus ?? "pending";
  }
  return {
    id: user.id,
    email: user.email ?? null,
    phone: user.phone ?? null,
    fullName: user.fullName ?? null,
    role: user.role,
    onboardingStep: user.onboardingStep,
    approvalStatus,
    selectedTrackId: user.selectedTrackId ?? null,
    careerTrack: user.careerTrack ?? null,
    avatarUrl: user.avatarUrl ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

router.post("/auth/send-otp", authLimiter, async (req: AuthRequest, res): Promise<void> => {
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

router.post("/auth/verify-otp", authLimiter, async (req: AuthRequest, res): Promise<void> => {
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
    user: await serializeUser(user),
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
    user: await serializeUser(user),
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

  res.json(await serializeUser(user));
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

  res.json(await serializeUser(user));
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

  // Track lock: a career track is chosen ONCE during onboarding and is permanent.
  // Only an admin may change it afterwards (via the admin student-management flow).
  const [current] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.user.userId));
  if (!current) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  if (current.careerTrack && current.role !== "admin") {
    res.status(409).json({
      error: "Your career track is locked and cannot be changed. Contact an administrator if this is a mistake.",
    });
    return;
  }

  const [track] = await db
    .select()
    .from(tracksTable)
    .where(eq(tracksTable.slug, trackSlug));

  if (!track) {
    res.status(400).json({ error: `Track "${trackSlug}" not found` });
    return;
  }

  // Only the soc/vapt/grc tracks are open for enrollment in the locked architecture.
  const careerTrack = track.domain;
  if (careerTrack !== "soc" && careerTrack !== "vapt" && careerTrack !== "grc") {
    res.status(400).json({ error: "This track is not available for enrollment." });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set({
      selectedTrackId: track.id,
      careerTrack,
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

  res.json(await serializeUser(user));
});

// ── Student Registration ────────────────────────────────────────────────────
router.post("/auth/register/student", authLimiter, async (req: AuthRequest, res): Promise<void> => {
  const { firstName, lastName, email, phone, college, graduationYear, password } = req.body ?? {};

  if (!firstName || !lastName || !email || !password) {
    res.status(400).json({ error: "firstName, lastName, email and password are required" });
    return;
  }
  if (typeof password !== "string" || password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email));
  if (existing.length > 0) {
    res.status(409).json({ error: "An account with this email already exists" });
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({
    email,
    phone: phone ?? null,
    fullName: `${firstName} ${lastName}`,
    passwordHash: hash,
    role: "student",
    onboardingStep: "consent",
  }).returning();

  await db.insert(studentProfilesTable).values({
    userId: user.id,
    college: college ?? null,
    graduationYear: graduationYear ? Number(graduationYear) : null,
  }).onConflictDoNothing();

  const otp = generateOtp();
  OTP_STORE.set(`email:${email}`, { otp, expiresAt: Date.now() + 5 * 60 * 1000, attempts: 0 });

  const isDev = process.env["NODE_ENV"] === "development";
  if (!isDev) {
    const { html, text } = buildOtpEmail(otp);
    sendEmail({ to: email, subject: "Verify your FUTRSEC account", html, text }).catch((err: unknown) => {
      req.log.error({ err: (err as Error).message }, "Failed to send registration OTP");
    });
  } else {
    req.log.info({ email, otp }, "Registration OTP [DEV]");
  }

  eventBus.emit("user.created", { type: "user.created", userId: user.id, role: "student" });

  res.status(201).json({
    message: "Account created. OTP sent to your email.",
    email,
    expiresIn: 300,
    ...(isDev ? { otp } : {}),
  });
});

// ── TPO Registration ────────────────────────────────────────────────────────
router.post("/auth/register/tpo", authLimiter, async (req: AuthRequest, res): Promise<void> => {
  const { firstName, lastName, email, phone, institution, designation, password } = req.body ?? {};

  if (!firstName || !lastName || !email || !phone || !institution || !designation || !password) {
    res.status(400).json({ error: "All fields are required" });
    return;
  }
  if (typeof password !== "string" || password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  const domain = String(email).split("@")[1]?.toLowerCase() ?? "";
  if (BLOCKED_DOMAINS.has(domain)) {
    res.status(400).json({ error: "Please use an institutional email address (.edu, .ac.in, or your institution domain)" });
    return;
  }

  const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email));
  if (existing.length > 0) {
    res.status(409).json({ error: "An account with this email already exists" });
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({
    email,
    phone: phone ?? null,
    fullName: `${firstName} ${lastName}`,
    passwordHash: hash,
    role: "tpo",
    onboardingStep: "consent",
  }).returning();

  await db.insert(tpoProfilesTable).values({
    userId: user.id,
    institution,
    designation: designation ?? null,
  }).onConflictDoNothing();

  const otp = generateOtp();
  OTP_STORE.set(`email:${email}`, { otp, expiresAt: Date.now() + 5 * 60 * 1000, attempts: 0 });

  const isDev = process.env["NODE_ENV"] === "development";
  if (!isDev) {
    const { html, text } = buildOtpEmail(otp);
    sendEmail({ to: email, subject: "Verify your FUTRSEC TPO account", html, text }).catch((err: unknown) => {
      req.log.error({ err: (err as Error).message }, "Failed to send TPO OTP");
    });
  } else {
    req.log.info({ email, otp }, "TPO Registration OTP [DEV]");
  }

  eventBus.emit("user.created", { type: "user.created", userId: user.id, role: "tpo" });

  res.status(201).json({
    message: "TPO account created. OTP sent to your institutional email.",
    email,
    expiresIn: 300,
    ...(isDev ? { otp } : {}),
  });
});

// ── Employer Registration ───────────────────────────────────────────────────
router.post("/auth/register/employer", authLimiter, async (req: AuthRequest, res): Promise<void> => {
  const { firstName, lastName, email, phone, companyName, designation, website, linkedinUrl, industry, companySize, password } = req.body ?? {};

  if (!firstName || !lastName || !email || !phone || !companyName || !designation || !password) {
    res.status(400).json({ error: "firstName, lastName, email, phone, companyName, designation and password are required" });
    return;
  }
  if (typeof password !== "string" || password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email));
  if (existing.length > 0) {
    res.status(409).json({ error: "An account with this email already exists" });
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({
    email,
    phone: phone ?? null,
    fullName: `${firstName} ${lastName}`,
    passwordHash: hash,
    role: "employer",
    onboardingStep: "consent",
  }).returning();

  await db.insert(employersTable).values({
    userId: user.id,
    companyName,
    designation: designation ?? null,
    website: website ?? null,
    linkedinUrl: linkedinUrl ?? null,
    industry: industry ?? null,
    companySize: companySize ?? null,
  }).onConflictDoNothing();

  const otp = generateOtp();
  OTP_STORE.set(`email:${email}`, { otp, expiresAt: Date.now() + 5 * 60 * 1000, attempts: 0 });

  const isDev = process.env["NODE_ENV"] === "development";
  if (!isDev) {
    const { html, text } = buildOtpEmail(otp);
    sendEmail({ to: email, subject: "Verify your FUTRSEC employer account", html, text }).catch((err: unknown) => {
      req.log.error({ err: (err as Error).message }, "Failed to send employer OTP");
    });
  } else {
    req.log.info({ email, otp }, "Employer Registration OTP [DEV]");
  }

  eventBus.emit("user.created", { type: "user.created", userId: user.id, role: "employer" });

  res.status(201).json({
    message: "Employer account created. OTP sent to your email.",
    email,
    expiresIn: 300,
    ...(isDev ? { otp } : {}),
  });
});

// ── Password Login ──────────────────────────────────────────────────────────
router.post("/auth/login/password", authLimiter, async (req: AuthRequest, res): Promise<void> => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  if (!user.passwordHash) {
    res.status(401).json({ error: "This account uses OTP login. Please use the OTP option." });
    return;
  }
  if (!user.isActive) {
    res.status(403).json({ error: "Your account has been deactivated. Contact support." });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const accessToken = signAccessToken({ userId: user.id, role: user.role });
  const refreshToken = signRefreshToken({ userId: user.id });
  const tokenHash = await bcrypt.hash(refreshToken, 10);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(refreshTokensTable).values({ userId: user.id, tokenHash, expiresAt });
  await db.update(usersTable).set({ lastLoginAt: new Date() }).where(eq(usersTable.id, user.id));

  req.log.info({ userId: user.id }, "Password login success");

  res.json({ accessToken, refreshToken, user: await serializeUser(user) });
});

// ── Forgot Password ─────────────────────────────────────────────────────────
router.post("/auth/forgot-password", authLimiter, async (req: AuthRequest, res): Promise<void> => {
  const { email } = req.body ?? {};
  if (!email) { res.status(400).json({ error: "Email is required" }); return; }

  const [user] = await db.select({ id: usersTable.id, email: usersTable.email }).from(usersTable).where(eq(usersTable.email, email));
  if (!user) {
    res.json({ message: "If that email is registered, a reset code has been sent." });
    return;
  }

  const otp = generateOtp();
  RESET_OTP_STORE.set(`reset:${email}`, { otp, expiresAt: Date.now() + 10 * 60 * 1000 });

  const isDev = process.env["NODE_ENV"] === "development";
  if (!isDev) {
    const html = `<p>Your FUTRSEC password reset code is: <strong>${otp}</strong>. Valid for 10 minutes.</p>`;
    sendEmail({ to: email, subject: "Reset your FUTRSEC password", html }).catch((err: unknown) => {
      req.log.error({ err: (err as Error).message }, "Failed to send reset OTP");
    });
  } else {
    req.log.info({ email, otp }, "Password reset OTP [DEV]");
  }

  res.json({
    message: "If that email is registered, a reset code has been sent.",
    ...(isDev ? { otp } : {}),
  });
});

// ── Verify Reset OTP ────────────────────────────────────────────────────────
router.post("/auth/verify-reset-otp", authLimiter, async (req: AuthRequest, res): Promise<void> => {
  const { email, otp } = req.body ?? {};
  if (!email || !otp) { res.status(400).json({ error: "Email and OTP are required" }); return; }

  const entry = RESET_OTP_STORE.get(`reset:${email}`);
  if (!entry) { res.status(400).json({ error: "No reset code found. Please request a new one." }); return; }
  if (entry.expiresAt < Date.now()) {
    RESET_OTP_STORE.delete(`reset:${email}`);
    res.status(400).json({ error: "Reset code has expired. Please request a new one." });
    return;
  }
  if (entry.otp !== String(otp)) {
    res.status(400).json({ error: "Invalid reset code" });
    return;
  }

  res.json({ message: "OTP verified. You may now set a new password." });
});

// ── Reset Password ──────────────────────────────────────────────────────────
router.post("/auth/reset-password", authLimiter, async (req: AuthRequest, res): Promise<void> => {
  const { email, otp, newPassword } = req.body ?? {};
  if (!email || !otp || !newPassword) {
    res.status(400).json({ error: "email, otp and newPassword are required" });
    return;
  }
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  const entry = RESET_OTP_STORE.get(`reset:${email}`);
  if (!entry || entry.expiresAt < Date.now() || entry.otp !== String(otp)) {
    res.status(400).json({ error: "Invalid or expired reset code" });
    return;
  }

  const hash = await bcrypt.hash(newPassword, 10);
  await db.update(usersTable).set({ passwordHash: hash }).where(eq(usersTable.email, email));
  RESET_OTP_STORE.delete(`reset:${email}`);

  res.json({ message: "Password updated successfully" });
});

// ── OAuth Redirect ──────────────────────────────────────────────────────────
router.get("/auth/oauth/:provider", (req: AuthRequest, res): void => {
  const provider = String(req.params["provider"] ?? "");
  const origins = req.headers["x-forwarded-host"] ?? req.headers["host"] ?? "localhost";
  const protocol = req.headers["x-forwarded-proto"] ?? "https";
  const base = `${protocol}://${origins}`;
  const basePath = (process.env["BASE_PATH"] ?? "").replace(/\/$/, "");

  const configs: Record<string, { clientId?: string; authUrl: string; scope: string }> = {
    google: {
      clientId: process.env["GOOGLE_CLIENT_ID"],
      authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      scope: "openid email profile",
    },
    github: {
      clientId: process.env["GITHUB_CLIENT_ID"],
      authUrl: "https://github.com/login/oauth/authorize",
      scope: "read:user user:email",
    },
    microsoft: {
      clientId: process.env["MICROSOFT_CLIENT_ID"],
      authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
      scope: "openid email profile",
    },
  };

  const cfg = configs[provider];
  if (!cfg || !cfg.clientId) {
    res.redirect(`${base}${basePath}/login?error=oauth_not_configured&provider=${provider}`);
    return;
  }

  const callbackUrl = `${base}${basePath}/api/auth/oauth/${provider}/callback`;
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: callbackUrl,
    response_type: "code",
    scope: cfg.scope,
  });

  res.redirect(`${cfg.authUrl}?${params.toString()}`);
});

export default router;
