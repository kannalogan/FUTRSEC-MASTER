import { Router, type Response, type NextFunction } from "express";
import { eq, and, or, inArray, desc, ilike } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  usersTable,
  studentProfilesTable,
  tpoProfilesTable,
  studentTpoMapTable,
  eventsTable,
  eventRegistrationsTable,
  ftsScoresTable,
  jobApplicationsTable,
  interviewsTable,
  offersTable,
  jobsTable,
} from "@workspace/db";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth";
import { createAuditLog } from "../lib/audit";

const router = Router();

const CAREER_TRACKS = ["soc", "vapt", "grc"] as const;
type CareerTrack = (typeof CAREER_TRACKS)[number];
function isCareerTrack(v: unknown): v is CareerTrack {
  return typeof v === "string" && (CAREER_TRACKS as readonly string[]).includes(v);
}

// ── Guards ───────────────────────────────────────────────────────────────────
async function loadTpoProfile(userId: number) {
  return db.query.tpoProfilesTable.findFirst({
    where: eq(tpoProfilesTable.userId, userId),
  });
}

async function requireApprovedTpo(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const me = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, req.user.userId),
  });
  if (!me || me.role !== "tpo") {
    res.status(403).json({ error: "TPO access required" });
    return;
  }
  if (!me.isActive) {
    res.status(403).json({ error: "Your TPO account is deactivated" });
    return;
  }
  const profile = await loadTpoProfile(req.user.userId);
  if (!profile || profile.approvalStatus !== "approved") {
    res.status(403).json({
      error: "TPO account pending admin approval",
      code: "PENDING_APPROVAL",
      approvalStatus: profile?.approvalStatus ?? "pending",
    });
    return;
  }
  next();
}

const tpoGuards = [requireAuth, requireRole("tpo"), requireApprovedTpo];

// Resolve the set of student userIds visible to this TPO:
//   explicitly mapped (student_tpo_map) ∪ students whose college == institution
async function getTpoStudentIds(
  tpoUserId: number,
  institution: string | null
): Promise<number[]> {
  const mapped = await db
    .select({ studentId: studentTpoMapTable.studentId })
    .from(studentTpoMapTable)
    .where(eq(studentTpoMapTable.tpoId, tpoUserId));
  const ids = new Set<number>(mapped.map((m) => m.studentId));

  if (institution) {
    const byCollege = await db
      .select({ userId: studentProfilesTable.userId })
      .from(studentProfilesTable)
      .where(ilike(studentProfilesTable.college, institution));
    for (const r of byCollege) ids.add(r.userId);
  }
  return [...ids];
}

// ── GET /tpo/me — profile + approval status ──────────────────────────────────
router.get(
  "/tpo/me",
  requireAuth,
  requireRole("tpo"),
  async (req: AuthRequest, res): Promise<void> => {
    const me = await db.query.usersTable.findFirst({
      where: eq(usersTable.id, req.user!.userId),
    });
    const profile = await loadTpoProfile(req.user!.userId);
    res.json({
      profile: {
        id: me?.id,
        email: me?.email,
        fullName: me?.fullName,
        isActive: me?.isActive ?? false,
        institution: profile?.institution ?? null,
        institutionCode: profile?.institutionCode ?? null,
        designation: profile?.designation ?? null,
        approvalStatus: profile?.approvalStatus ?? "pending",
        rejectionReason: profile?.rejectionReason ?? null,
      },
    });
  }
);

// ── GET /tpo/overview — dashboard cards ──────────────────────────────────────
router.get(
  "/tpo/overview",
  ...tpoGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const profile = await loadTpoProfile(req.user!.userId);
    const studentIds = await getTpoStudentIds(
      req.user!.userId,
      profile?.institution ?? null
    );

    if (studentIds.length === 0) {
      res.json({
        totalStudents: 0,
        byTrack: { soc: 0, vapt: 0, grc: 0 },
        applications: 0,
        interviews: 0,
        offers: 0,
        placed: 0,
        events: 0,
      });
      return;
    }

    const students = await db
      .select({ id: usersTable.id, careerTrack: usersTable.careerTrack })
      .from(usersTable)
      .where(inArray(usersTable.id, studentIds));

    const byTrack = { soc: 0, vapt: 0, grc: 0 };
    for (const s of students) {
      if (s.careerTrack && s.careerTrack in byTrack) {
        byTrack[s.careerTrack as CareerTrack] += 1;
      }
    }

    const [apps, ints, offs, events] = await Promise.all([
      db
        .select({ id: jobApplicationsTable.id })
        .from(jobApplicationsTable)
        .where(inArray(jobApplicationsTable.studentId, studentIds)),
      db
        .select({ id: interviewsTable.id })
        .from(interviewsTable)
        .innerJoin(
          jobApplicationsTable,
          eq(interviewsTable.applicationId, jobApplicationsTable.id)
        )
        .where(inArray(jobApplicationsTable.studentId, studentIds)),
      db
        .select({ id: offersTable.id, status: offersTable.status })
        .from(offersTable)
        .where(inArray(offersTable.studentId, studentIds)),
      db
        .select({ id: eventsTable.id })
        .from(eventsTable)
        .where(eq(eventsTable.tpoId, req.user!.userId)),
    ]);

    res.json({
      totalStudents: students.length,
      byTrack,
      applications: apps.length,
      interviews: ints.length,
      offers: offs.length,
      placed: offs.filter((o) => o.status === "accepted").length,
      events: events.length,
    });
  }
);

// ── GET /tpo/students — student directory ────────────────────────────────────
router.get(
  "/tpo/students",
  ...tpoGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const profile = await loadTpoProfile(req.user!.userId);
    const studentIds = await getTpoStudentIds(
      req.user!.userId,
      profile?.institution ?? null
    );
    if (studentIds.length === 0) {
      res.json({ students: [] });
      return;
    }

    const trackFilter = isCareerTrack(req.query.track) ? req.query.track : null;
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";

    const conds = [inArray(usersTable.id, studentIds)];
    if (trackFilter) conds.push(eq(usersTable.careerTrack, trackFilter));
    if (search) {
      const sf = or(
        ilike(usersTable.fullName, `%${search}%`),
        ilike(usersTable.email, `%${search}%`)
      );
      if (sf) conds.push(sf);
    }

    const rows = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        fullName: usersTable.fullName,
        careerTrack: usersTable.careerTrack,
        isActive: usersTable.isActive,
        createdAt: usersTable.createdAt,
        college: studentProfilesTable.college,
        graduationYear: studentProfilesTable.graduationYear,
        city: studentProfilesTable.city,
        resumeUrl: studentProfilesTable.resumeUrl,
      })
      .from(usersTable)
      .leftJoin(
        studentProfilesTable,
        eq(studentProfilesTable.userId, usersTable.id)
      )
      .where(and(...conds))
      .orderBy(desc(usersTable.createdAt))
      .limit(500);

    const fts = await db
      .select()
      .from(ftsScoresTable)
      .where(inArray(ftsScoresTable.userId, studentIds));
    const ftsMap = new Map(fts.map((f) => [f.userId, f]));

    res.json({
      students: rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        ftsScore: ftsMap.get(r.id)?.totalScore ?? 0,
      })),
    });
  }
);

// ── GET /tpo/analytics — student analytics ───────────────────────────────────
router.get(
  "/tpo/analytics",
  ...tpoGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const profile = await loadTpoProfile(req.user!.userId);
    const studentIds = await getTpoStudentIds(
      req.user!.userId,
      profile?.institution ?? null
    );
    if (studentIds.length === 0) {
      res.json({ trackDistribution: [], ftsBuckets: [], avgFts: 0 });
      return;
    }

    const students = await db
      .select({ id: usersTable.id, careerTrack: usersTable.careerTrack })
      .from(usersTable)
      .where(inArray(usersTable.id, studentIds));
    const trackCounts = { soc: 0, vapt: 0, grc: 0 };
    for (const s of students) {
      if (s.careerTrack && s.careerTrack in trackCounts)
        trackCounts[s.careerTrack as CareerTrack] += 1;
    }

    const fts = await db
      .select()
      .from(ftsScoresTable)
      .where(inArray(ftsScoresTable.userId, studentIds));
    const buckets = [
      { label: "0–25", min: 0, max: 25, count: 0 },
      { label: "25–50", min: 25, max: 50, count: 0 },
      { label: "50–75", min: 50, max: 75, count: 0 },
      { label: "75–100", min: 75, max: 100, count: 0 },
    ];
    let sum = 0;
    for (const f of fts) {
      sum += f.totalScore;
      const b = buckets.find(
        (x) => f.totalScore >= x.min && f.totalScore <= x.max
      );
      if (b) b.count += 1;
    }

    res.json({
      trackDistribution: (Object.keys(trackCounts) as CareerTrack[]).map(
        (t) => ({ track: t, count: trackCounts[t] })
      ),
      ftsBuckets: buckets.map((b) => ({ label: b.label, count: b.count })),
      avgFts: fts.length ? Math.round((sum / fts.length) * 10) / 10 : 0,
    });
  }
);

// ── GET /tpo/placements — placement analytics ────────────────────────────────
router.get(
  "/tpo/placements",
  ...tpoGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const profile = await loadTpoProfile(req.user!.userId);
    const studentIds = await getTpoStudentIds(
      req.user!.userId,
      profile?.institution ?? null
    );
    if (studentIds.length === 0) {
      res.json({
        funnel: { applied: 0, shortlisted: 0, interviewed: 0, offered: 0, placed: 0 },
        offers: [],
      });
      return;
    }

    const apps = await db
      .select()
      .from(jobApplicationsTable)
      .where(inArray(jobApplicationsTable.studentId, studentIds));
    const appIds = apps.map((a) => a.id);

    const ints = appIds.length
      ? await db
          .select()
          .from(interviewsTable)
          .where(inArray(interviewsTable.applicationId, appIds))
      : [];

    const offers = await db
      .select()
      .from(offersTable)
      .where(inArray(offersTable.studentId, studentIds))
      .orderBy(desc(offersTable.createdAt));

    const offerJobIds = [...new Set(offers.map((o) => o.jobId))];
    const offerStudentIds = [...new Set(offers.map((o) => o.studentId))];
    const [jobs, offerStudents] = await Promise.all([
      offerJobIds.length
        ? db.select().from(jobsTable).where(inArray(jobsTable.id, offerJobIds))
        : Promise.resolve([]),
      offerStudentIds.length
        ? db
            .select({
              id: usersTable.id,
              fullName: usersTable.fullName,
              email: usersTable.email,
            })
            .from(usersTable)
            .where(inArray(usersTable.id, offerStudentIds))
        : Promise.resolve([]),
    ]);
    const jobMap = new Map(jobs.map((j) => [j.id, j]));
    const stuMap = new Map(offerStudents.map((s) => [s.id, s]));

    res.json({
      funnel: {
        applied: apps.length,
        shortlisted: apps.filter((a) => a.status === "shortlisted").length,
        interviewed: ints.length,
        offered: offers.length,
        placed: offers.filter((o) => o.status === "accepted").length,
      },
      offers: offers.map((o) => ({
        id: o.id,
        status: o.status,
        salary: o.salary,
        joiningDate: o.joiningDate,
        createdAt: o.createdAt.toISOString(),
        student: stuMap.get(o.studentId) ?? null,
        job: jobMap.get(o.jobId)
          ? { id: o.jobId, title: jobMap.get(o.jobId)!.title }
          : null,
      })),
    });
  }
);

// ── GET /tpo/reports/tracks — track-wise reports ─────────────────────────────
router.get(
  "/tpo/reports/tracks",
  ...tpoGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const profile = await loadTpoProfile(req.user!.userId);
    const studentIds = await getTpoStudentIds(
      req.user!.userId,
      profile?.institution ?? null
    );
    if (studentIds.length === 0) {
      res.json({ rows: [] });
      return;
    }

    const students = await db
      .select({ id: usersTable.id, careerTrack: usersTable.careerTrack })
      .from(usersTable)
      .where(inArray(usersTable.id, studentIds));
    const [apps, offers, fts] = await Promise.all([
      db
        .select({
          studentId: jobApplicationsTable.studentId,
        })
        .from(jobApplicationsTable)
        .where(inArray(jobApplicationsTable.studentId, studentIds)),
      db
        .select({
          studentId: offersTable.studentId,
          status: offersTable.status,
        })
        .from(offersTable)
        .where(inArray(offersTable.studentId, studentIds)),
      db
        .select()
        .from(ftsScoresTable)
        .where(inArray(ftsScoresTable.userId, studentIds)),
    ]);

    const trackOf = new Map(students.map((s) => [s.id, s.careerTrack]));
    const ftsMap = new Map(fts.map((f) => [f.userId, f.totalScore]));

    const rows = CAREER_TRACKS.map((track) => {
      const sIds = students
        .filter((s) => s.careerTrack === track)
        .map((s) => s.id);
      const trackApps = apps.filter((a) => trackOf.get(a.studentId) === track);
      const trackOffers = offers.filter(
        (o) => trackOf.get(o.studentId) === track
      );
      const ftsVals = sIds
        .map((id) => ftsMap.get(id))
        .filter((v): v is number => typeof v === "number");
      const avgFts = ftsVals.length
        ? Math.round((ftsVals.reduce((a, b) => a + b, 0) / ftsVals.length) * 10) /
          10
        : 0;
      return {
        track,
        students: sIds.length,
        applications: trackApps.length,
        offers: trackOffers.length,
        placed: trackOffers.filter((o) => o.status === "accepted").length,
        avgFts,
      };
    });

    res.json({ rows });
  }
);

// ── Events CRUD ──────────────────────────────────────────────────────────────
router.get(
  "/tpo/events",
  ...tpoGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const events = await db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.tpoId, req.user!.userId))
      .orderBy(desc(eventsTable.createdAt));

    const eventIds = events.map((e) => e.id);
    const regs = eventIds.length
      ? await db
          .select({ eventId: eventRegistrationsTable.eventId })
          .from(eventRegistrationsTable)
          .where(inArray(eventRegistrationsTable.eventId, eventIds))
      : [];
    const regCount = new Map<number, number>();
    for (const r of regs)
      regCount.set(r.eventId, (regCount.get(r.eventId) ?? 0) + 1);

    res.json({
      events: events.map((e) => ({
        ...e,
        startsAt: e.startsAt?.toISOString() ?? null,
        endsAt: e.endsAt?.toISOString() ?? null,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
        registrations: regCount.get(e.id) ?? 0,
      })),
    });
  }
);

router.post(
  "/tpo/events",
  ...tpoGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const {
      title,
      description,
      type,
      location,
      isOnline,
      meetingUrl,
      careerTrack,
      startsAt,
      endsAt,
      maxAttendees,
      status,
    } = req.body ?? {};

    if (typeof title !== "string" || title.trim().length < 2) {
      res.status(400).json({ error: "title is required" });
      return;
    }
    if (careerTrack != null && !isCareerTrack(careerTrack)) {
      res.status(400).json({ error: "careerTrack must be soc, vapt, or grc" });
      return;
    }
    const allowedStatus = ["draft", "published", "cancelled"];
    const eventStatus =
      typeof status === "string" && allowedStatus.includes(status)
        ? status
        : "draft";

    const [event] = await db
      .insert(eventsTable)
      .values({
        tpoId: req.user!.userId,
        title: title.trim(),
        description: description ?? null,
        type: typeof type === "string" && type ? type : "placement_drive",
        location: location ?? null,
        isOnline: !!isOnline,
        meetingUrl: meetingUrl ?? null,
        careerTrack: careerTrack ?? null,
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
        maxAttendees:
          typeof maxAttendees === "number" ? maxAttendees : null,
        status: eventStatus,
      })
      .returning();

    await createAuditLog({
      userId: req.user!.userId,
      action: "tpo.event.created",
      entityType: "event",
      entityId: event.id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: { title: event.title, status: eventStatus },
    });

    res.status(201).json({ event });
  }
);

router.patch(
  "/tpo/events/:id",
  ...tpoGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid event id" });
      return;
    }
    const existing = await db.query.eventsTable.findFirst({
      where: eq(eventsTable.id, id),
    });
    if (!existing) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    if (existing.tpoId !== req.user!.userId) {
      res.status(403).json({ error: "This event does not belong to you" });
      return;
    }

    const b = req.body ?? {};
    if (b.careerTrack != null && !isCareerTrack(b.careerTrack)) {
      res.status(400).json({ error: "careerTrack must be soc, vapt, or grc" });
      return;
    }
    const allowedStatus = ["draft", "published", "cancelled"];

    const [updated] = await db
      .update(eventsTable)
      .set({
        ...(typeof b.title === "string" ? { title: b.title.trim() } : {}),
        ...(b.description !== undefined ? { description: b.description } : {}),
        ...(typeof b.type === "string" ? { type: b.type } : {}),
        ...(b.location !== undefined ? { location: b.location } : {}),
        ...(b.isOnline !== undefined ? { isOnline: !!b.isOnline } : {}),
        ...(b.meetingUrl !== undefined ? { meetingUrl: b.meetingUrl } : {}),
        ...(b.careerTrack !== undefined
          ? { careerTrack: b.careerTrack ?? null }
          : {}),
        ...(b.startsAt !== undefined
          ? { startsAt: b.startsAt ? new Date(b.startsAt) : null }
          : {}),
        ...(b.endsAt !== undefined
          ? { endsAt: b.endsAt ? new Date(b.endsAt) : null }
          : {}),
        ...(b.maxAttendees !== undefined
          ? { maxAttendees: b.maxAttendees ?? null }
          : {}),
        ...(typeof b.status === "string" && allowedStatus.includes(b.status)
          ? { status: b.status }
          : {}),
      })
      .where(eq(eventsTable.id, id))
      .returning();

    await createAuditLog({
      userId: req.user!.userId,
      action: "tpo.event.updated",
      entityType: "event",
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ event: updated });
  }
);

router.delete(
  "/tpo/events/:id",
  ...tpoGuards,
  async (req: AuthRequest, res): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid event id" });
      return;
    }
    const existing = await db.query.eventsTable.findFirst({
      where: eq(eventsTable.id, id),
    });
    if (!existing) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    if (existing.tpoId !== req.user!.userId) {
      res.status(403).json({ error: "This event does not belong to you" });
      return;
    }
    await db.delete(eventsTable).where(eq(eventsTable.id, id));
    await createAuditLog({
      userId: req.user!.userId,
      action: "tpo.event.deleted",
      entityType: "event",
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });
    res.json({ success: true });
  }
);

export default router;
