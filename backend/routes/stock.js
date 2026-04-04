// backend/routes/stock.js
import { Router } from "express";
import {
  getMovements,
  createMovement,
  getLowStock,
} from "../controllers/stock.js";
import { authenticate } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { createMovementSchema } from "../schemas/stock.js";

const router = Router();

router.get("/movements", authenticate, getMovements);
router.post("/movements", authenticate, validate(createMovementSchema), createMovement);
router.get("/low-stock", authenticate, getLowStock);

export default router;
