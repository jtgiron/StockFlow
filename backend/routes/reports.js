// backend/routes/reports.js
import { Router } from "express";
import { getSalesSummary } from "../controllers/reports.js";
import { authenticate, authorize } from "../middlewares/auth.js";

const router = Router();

router.get("/sales-summary", authenticate, authorize("admin"), getSalesSummary);

export default router;
