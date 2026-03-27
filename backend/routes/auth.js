import { Router } from "express";
import {
  register,
  login,
  refreshToken,
  getProfile,
} from "../controllers/auth.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

// Public routes
router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refreshToken);

// Protected routes
router.get("/profile", authenticate, getProfile);

export default router;
