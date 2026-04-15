// backend/routes/sales.js
import { Router } from "express";
import { createSale, getSales, getSaleById, retryInvoice } from "../controllers/sales.js";
import { authenticate } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { createSaleSchema } from "../schemas/sales.js";

const router = Router();

router.get("/", authenticate, getSales);
router.get("/:id", authenticate, getSaleById);
router.post("/", authenticate, validate(createSaleSchema), createSale);
router.post("/:id/retry-invoice", authenticate, retryInvoice);

export default router;
