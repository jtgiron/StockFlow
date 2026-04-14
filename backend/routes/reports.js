// backend/routes/reports.js
import { Router } from "express";
import {
  getSalesSummary,
  getProfitSummary,
} from "../controllers/reports.js";
import { authenticate, authorize } from "../middlewares/auth.js";

const router = Router();

router.get("/sales-summary", authenticate, authorize("admin"), getSalesSummary);
router.get(
  "/profit-summary",
  authenticate,
  authorize("admin"),
  getProfitSummary,
);

export default router;
