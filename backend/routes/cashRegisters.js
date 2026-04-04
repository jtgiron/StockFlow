// backend/routes/cashRegisters.js
import { Router } from "express";
import {
  getCurrent,
  openRegister,
  closeRegister,
  getHistory,
} from "../controllers/cashRegisters.js";
import { authenticate } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { openRegisterSchema, closeRegisterSchema } from "../schemas/cashRegisters.js";

const router = Router();

router.get("/current", authenticate, getCurrent);
router.get("/", authenticate, getHistory);
router.post("/open", authenticate, validate(openRegisterSchema), openRegister);
router.post("/:id/close", authenticate, validate(closeRegisterSchema), closeRegister);

export default router;
