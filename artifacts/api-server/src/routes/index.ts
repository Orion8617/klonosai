import { Router, type IRouter } from "express";
import healthRouter from "./health";
import webauthnRouter from "./webauthn";
import paymentsRouter from "./payments";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth/webauthn", webauthnRouter);
router.use("/payments", paymentsRouter);

export default router;
