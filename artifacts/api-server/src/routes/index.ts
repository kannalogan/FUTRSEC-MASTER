import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import consentRouter from "./consent";
import tracksRouter from "./tracks";
import assessmentsRouter from "./assessments";
import platformRouter from "./platform";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(consentRouter);
router.use(tracksRouter);
router.use(assessmentsRouter);
router.use(platformRouter);

export default router;
