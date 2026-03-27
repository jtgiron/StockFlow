// backend/routes/stock.js
import { Router } from "express";
import {
  getMovements,
  createMovement,
  getLowStock,
} from "../controllers/stock.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

router.get("/movements", authenticate, getMovements);
router.post("/movements", authenticate, createMovement);
router.get("/low-stock", authenticate, getLowStock);

export default router;
