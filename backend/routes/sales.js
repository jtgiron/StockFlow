// backend/routes/sales.js
import { Router } from "express";
import { createSale, getSales, getSaleById } from "../controllers/sales.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

router.get("/", authenticate, getSales);
router.get("/:id", authenticate, getSaleById);
router.post("/", authenticate, createSale);

export default router;
