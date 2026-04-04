// backend/routes/sales.js
import { Router } from "express";
import { createSale, getSales, getSaleById } from "../controllers/sales.js";
import { authenticate } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { createSaleSchema } from "../schemas/sales.js";

const router = Router();

router.get("/", authenticate, getSales);
router.get("/:id", authenticate, getSaleById);
router.post("/", authenticate, validate(createSaleSchema), createSale);

export default router;
