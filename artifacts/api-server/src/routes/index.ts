import { Router, type IRouter } from "express";
import healthRouter from "./health";
import employersRouter from "./employers";

const router: IRouter = Router();

router.use(healthRouter);
router.use(employersRouter);

export default router;
