import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  usersTable,
  consentLogsTable,
  consentHistoryTable,
  dataDownloadRequestsTable,
  dataDeleteRequestsTable,
  dataCorrectionRequestsTable,
} from "@workspace/db";
import {
  CaptureConsentBody,
  WithdrawConsentBody,
  RequestDataDeletionBody,
  RequestDataCorrectionBody,
} from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { eventBus } from "../lib/events";
import { addDataExportJob, addDataDeletionJob } from "../lib/queues";

const router = Router();

function getIp(req: AuthRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.socket.remoteAddress ?? "unknown";
}

router.get("/consent", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const [consent] = await db
    .select()
    .from(consentLogsTable)
    .where(eq(consentLogsTable.userId, req.user.userId));

  if (!consent) {
    res.json({
      userId: req.user.userId,
      marketing: false,
      analytics: false,
      dataProcessing: false,
      thirdParty: false,
      updatedAt: new Date().toISOString(),
    });
    return;
  }

  res.json({
    userId: consent.userId,
    marketing: consent.marketing,
    analytics: consent.analytics,
    dataProcessing: consent.dataProcessing,
    thirdParty: consent.thirdParty,
    updatedAt: consent.updatedAt.toISOString(),
  });
});

router.post("/consent", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const parsed = CaptureConsentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { marketing = false, analytics = false, dataProcessing, thirdParty = false } = parsed.data;
  const ipAddress = getIp(req);
  const userAgent = req.headers["user-agent"] ?? null;

  const existing = await db
    .select()
    .from(consentLogsTable)
    .where(eq(consentLogsTable.userId, req.user.userId));

  let consent;
  if (existing.length > 0) {
    [consent] = await db
      .update(consentLogsTable)
      .set({ marketing, analytics, dataProcessing, thirdParty })
      .where(eq(consentLogsTable.userId, req.user.userId))
      .returning();
  } else {
    [consent] = await db
      .insert(consentLogsTable)
      .values({ userId: req.user.userId, marketing, analytics, dataProcessing, thirdParty })
      .returning();
  }

  const consentTypes: Array<"marketing" | "analytics" | "dataProcessing" | "thirdParty"> = [
    "marketing", "analytics", "dataProcessing", "thirdParty",
  ];

  for (const consentType of consentTypes) {
    await db.insert(consentHistoryTable).values({
      userId: req.user.userId,
      consentType,
      action: "granted",
      ipAddress,
      userAgent: userAgent ?? undefined,
    });

    eventBus.emit("consent.updated", {
      type: "consent.updated",
      userId: req.user.userId,
      consentType,
      action: "granted",
      ipAddress,
    });
  }

  const [userRow] = await db
    .select({ role: usersTable.role, onboardingStep: usersTable.onboardingStep })
    .from(usersTable)
    .where(eq(usersTable.id, req.user.userId));

  const needsApproval = userRow?.role === "tpo" || userRow?.role === "employer";
  const nextStep = needsApproval ? "pending_approval" : "track_selection";

  if (userRow?.onboardingStep === "consent") {
    await db
      .update(usersTable)
      .set({ onboardingStep: nextStep as "pending_approval" | "track_selection" })
      .where(eq(usersTable.id, req.user.userId));
  }

  req.log.info({ userId: req.user.userId, role: userRow?.role, nextStep }, "Consent saved");

  res.json({
    userId: consent.userId,
    marketing: consent.marketing,
    analytics: consent.analytics,
    dataProcessing: consent.dataProcessing,
    thirdParty: consent.thirdParty,
    updatedAt: consent.updatedAt.toISOString(),
    nextStep,
  });
});

router.get("/consent/history", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const history = await db
    .select()
    .from(consentHistoryTable)
    .where(eq(consentHistoryTable.userId, req.user.userId))
    .orderBy(consentHistoryTable.createdAt);

  res.json(
    history.map((h) => ({
      id: h.id,
      userId: h.userId,
      consentType: h.consentType,
      action: h.action,
      ipAddress: h.ipAddress,
      userAgent: h.userAgent ?? null,
      createdAt: h.createdAt.toISOString(),
    }))
  );
});

router.post("/consent/withdraw", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const parsed = WithdrawConsentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { consentType } = parsed.data;
  const ipAddress = getIp(req);
  const userAgent = req.headers["user-agent"] ?? null;

  const fieldMap: Record<string, Record<string, boolean>> = {
    marketing: { marketing: false },
    analytics: { analytics: false },
    dataProcessing: { dataProcessing: false },
    thirdParty: { thirdParty: false },
  };

  const [consent] = await db
    .update(consentLogsTable)
    .set(fieldMap[consentType] ?? {})
    .where(eq(consentLogsTable.userId, req.user.userId))
    .returning();

  await db.insert(consentHistoryTable).values({
    userId: req.user.userId,
    consentType: consentType as "marketing" | "analytics" | "dataProcessing" | "thirdParty",
    action: "withdrawn",
    ipAddress,
    userAgent: userAgent ?? undefined,
  });

  eventBus.emit("consent.withdrawn", {
    type: "consent.withdrawn",
    userId: req.user.userId,
    consentType,
    ipAddress,
  });

  if (!consent) {
    res.json({
      userId: req.user.userId,
      marketing: false,
      analytics: false,
      dataProcessing: false,
      thirdParty: false,
      updatedAt: new Date().toISOString(),
    });
    return;
  }

  res.json({
    userId: consent.userId,
    marketing: consent.marketing,
    analytics: consent.analytics,
    dataProcessing: consent.dataProcessing,
    thirdParty: consent.thirdParty,
    updatedAt: consent.updatedAt.toISOString(),
  });
});

interface CookiePrefs {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
}

function defaultCookiePrefs(): CookiePrefs {
  return { necessary: true, analytics: false, marketing: false, functional: false };
}

function parseCookiePrefs(v: unknown): CookiePrefs | null {
  if (typeof v !== "object" || v === null) return null;
  const o = v as Record<string, unknown>;
  return {
    necessary: true, // necessary cookies cannot be disabled
    analytics: o.analytics === true,
    marketing: o.marketing === true,
    functional: o.functional === true,
  };
}

router.get("/consent/cookies", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const [consent] = await db
    .select()
    .from(consentLogsTable)
    .where(eq(consentLogsTable.userId, req.user.userId));
  const prefs = (consent?.cookiePreferences as CookiePrefs | null) ?? defaultCookiePrefs();
  res.json({ ...prefs, updatedAt: consent?.updatedAt?.toISOString() ?? new Date().toISOString() });
});

router.post("/consent/cookies", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const prefs = parseCookiePrefs(req.body);
  if (!prefs) { res.status(400).json({ error: "Invalid cookie preferences" }); return; }
  const ipAddress = getIp(req);
  const userAgent = req.headers["user-agent"] ?? null;

  const existing = await db
    .select()
    .from(consentLogsTable)
    .where(eq(consentLogsTable.userId, req.user.userId));

  let consent;
  if (existing.length > 0) {
    [consent] = await db
      .update(consentLogsTable)
      .set({ cookiePreferences: prefs })
      .where(eq(consentLogsTable.userId, req.user.userId))
      .returning();
  } else {
    [consent] = await db
      .insert(consentLogsTable)
      .values({ userId: req.user.userId, cookiePreferences: prefs })
      .returning();
  }

  await db.insert(consentHistoryTable).values({
    userId: req.user.userId,
    consentType: "analytics",
    action: prefs.analytics ? "granted" : "withdrawn",
    ipAddress,
    userAgent: userAgent ?? undefined,
  });

  eventBus.emit("consent.updated", {
    type: "consent.updated",
    userId: req.user.userId,
    consentType: "analytics",
    action: prefs.analytics ? "granted" : "withdrawn",
    ipAddress,
  });

  const saved = (consent?.cookiePreferences as CookiePrefs | null) ?? prefs;
  res.json({ ...saved, updatedAt: consent?.updatedAt?.toISOString() ?? new Date().toISOString() });
});

router.post("/dpdp/download-request", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const recent = await db
    .select()
    .from(dataDownloadRequestsTable)
    .where(eq(dataDownloadRequestsTable.userId, req.user.userId));

  const pending = recent.filter(
    (r) => r.status === "pending" || r.status === "processing"
  );
  if (pending.length > 0) {
    res.status(429).json({ error: "A data download request is already pending." });
    return;
  }

  const [request] = await db
    .insert(dataDownloadRequestsTable)
    .values({ userId: req.user.userId })
    .returning();

  await addDataExportJob({ userId: req.user.userId, requestId: request.id });

  eventBus.emit("data_request.created", {
    type: "data_request.created",
    userId: req.user.userId,
    requestType: "download",
    requestId: request.id,
  });

  res.status(202).json({
    id: request.id,
    userId: request.userId,
    type: "download",
    status: request.status,
    notes: request.notes ?? null,
    completedAt: request.completedAt?.toISOString() ?? null,
    createdAt: request.createdAt.toISOString(),
  });
});

router.post("/dpdp/delete-request", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const parsed = RequestDataDeletionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [request] = await db
    .insert(dataDeleteRequestsTable)
    .values({ userId: req.user.userId, reason: parsed.data.reason })
    .returning();

  await addDataDeletionJob({
    userId: req.user.userId,
    requestId: request.id,
    reason: parsed.data.reason,
  });

  eventBus.emit("data_request.created", {
    type: "data_request.created",
    userId: req.user.userId,
    requestType: "deletion",
    requestId: request.id,
  });

  res.status(202).json({
    id: request.id,
    userId: request.userId,
    type: "deletion",
    status: request.status,
    notes: request.notes ?? null,
    completedAt: request.completedAt?.toISOString() ?? null,
    createdAt: request.createdAt.toISOString(),
  });
});

router.post("/dpdp/correction-request", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const parsed = RequestDataCorrectionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [request] = await db
    .insert(dataCorrectionRequestsTable)
    .values({
      userId: req.user.userId,
      field: parsed.data.field,
      currentValue: parsed.data.currentValue,
      requestedValue: parsed.data.requestedValue,
      supportingNote: parsed.data.supportingNote,
    })
    .returning();

  eventBus.emit("data_request.created", {
    type: "data_request.created",
    userId: req.user.userId,
    requestType: "correction",
    requestId: request.id,
  });

  res.status(202).json({
    id: request.id,
    userId: request.userId,
    type: "correction",
    status: request.status,
    notes: request.notes ?? null,
    completedAt: request.completedAt?.toISOString() ?? null,
    createdAt: request.createdAt.toISOString(),
  });
});

router.get("/dpdp/requests", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const [downloads, deletions, corrections] = await Promise.all([
    db.select().from(dataDownloadRequestsTable).where(eq(dataDownloadRequestsTable.userId, req.user.userId)),
    db.select().from(dataDeleteRequestsTable).where(eq(dataDeleteRequestsTable.userId, req.user.userId)),
    db.select().from(dataCorrectionRequestsTable).where(eq(dataCorrectionRequestsTable.userId, req.user.userId)),
  ]);

  const all = [
    ...downloads.map((r) => ({ id: r.id, userId: r.userId, type: "download" as const, status: r.status, notes: r.notes ?? null, completedAt: r.completedAt?.toISOString() ?? null, createdAt: r.createdAt.toISOString() })),
    ...deletions.map((r) => ({ id: r.id, userId: r.userId, type: "deletion" as const, status: r.status, notes: r.notes ?? null, completedAt: r.completedAt?.toISOString() ?? null, createdAt: r.createdAt.toISOString() })),
    ...corrections.map((r) => ({ id: r.id, userId: r.userId, type: "correction" as const, status: r.status, notes: r.notes ?? null, completedAt: r.completedAt?.toISOString() ?? null, createdAt: r.createdAt.toISOString() })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json(all);
});

export default router;
