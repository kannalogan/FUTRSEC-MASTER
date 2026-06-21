import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import consentRouter from "./consent";
import tracksRouter from "./tracks";
import assessmentsRouter from "./assessments";
import platformRouter from "./platform";
import dashboardRouter from "./dashboard";
import learningRouter from "./learning";
import labsRouter from "./labs";
import jobsRouter from "./jobs";
import profileRouter from "./profile";
import platformExtendedRouter from "./platform-extended";
import adminRouter from "./admin";
import aiRouter from "./ai";
import aiInterviewRouter from "./ai-interview";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(consentRouter);
router.use(tracksRouter);
router.use(assessmentsRouter);
router.use(platformRouter);
router.use(dashboardRouter);
router.use(learningRouter);
router.use(labsRouter);
router.use(jobsRouter);
router.use(profileRouter);
router.use(platformExtendedRouter);
router.use(aiRouter);
router.use(aiInterviewRouter);
router.use(adminRouter);

export default router;
