// backend/routes/mercadopago.js
import { Router } from "express";
import {
  createOrder,
  webhook,
  getOrderStatus,
} from "../controllers/mercadopago.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

// Protected: create MP order from POS
router.post("/create-order", authenticate, createOrder);

// Public: MP webhook (HMAC-validated internally)
router.post("/webhook", webhook);

// Protected: frontend polls this for order status
router.get("/order-status/:externalReference", authenticate, getOrderStatus);

export default router;
