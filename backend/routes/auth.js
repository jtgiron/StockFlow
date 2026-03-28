import { Router } from "express";
import {
  register,
  login,
  refreshToken,
  getProfile,
  resetPasswordWithCode,
} from "../controllers/auth.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

// Public routes
router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refreshToken);
router.post("/reset-password-with-code", resetPasswordWithCode);

// Protected routes
router.get("/profile", authenticate, getProfile);

export default router;
