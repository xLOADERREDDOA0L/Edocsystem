import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import departmentsRouter from "./departments";
import categoriesRouter from "./categories";
import documentsRouter from "./documents";
import revisionsRouter from "./revisions";
import requestsRouter from "./requests";
import printingRouter from "./printing";
import verificationRouter from "./verification";
import dashboardRouter from "./dashboard";
import auditLogsRouter from "./auditLogs";
import reportsRouter from "./reports";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(departmentsRouter);
router.use(categoriesRouter);
router.use(documentsRouter);
router.use(revisionsRouter);
router.use(requestsRouter);
router.use(printingRouter);
router.use(verificationRouter);
router.use(dashboardRouter);
router.use(auditLogsRouter);
router.use(reportsRouter);
router.use(storageRouter);

export default router;
