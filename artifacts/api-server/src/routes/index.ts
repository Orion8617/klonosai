import { Router, type IRouter } from "express";
import healthRouter from "./health";
import webauthnRouter from "./webauthn";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth/webauthn", webauthnRouter);

export default router;
