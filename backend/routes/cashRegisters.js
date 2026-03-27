// backend/routes/cashRegisters.js
import { Router } from "express";
import {
  getCurrent,
  openRegister,
  closeRegister,
  getHistory,
} from "../controllers/cashRegisters.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

router.get("/current", authenticate, getCurrent);
router.get("/", authenticate, getHistory);
router.post("/open", authenticate, openRegister);
router.post("/:id/close", authenticate, closeRegister);

export default router;
