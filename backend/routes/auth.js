import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  resetPasswordWithCode,
} from "../controllers/auth.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

// Strict rate limiter for sensitive auth endpoints (10 attempts / 15 min per IP)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Demasiados intentos, intente de nuevo en 15 minutos" },
});

// Public routes
router.post("/register", register);
router.post("/login", authLimiter, login);
router.post("/refresh", refreshToken);
router.post("/reset-password-with-code", authLimiter, resetPasswordWithCode);

// Public (clears HttpOnly cookie)
router.post("/logout", logout);

// Protected routes
router.get("/profile", authenticate, getProfile);

export default router;
