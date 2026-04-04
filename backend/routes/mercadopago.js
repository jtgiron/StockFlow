// backend/routes/mercadopago.js
import { Router } from "express";
import {
  createOrder,
  webhook,
  getOrderStatus,
  cancelOrder,
} from "../controllers/mercadopago.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

// Protected: create MP order from POS
router.post("/create-order", authenticate, createOrder);

// Protected: cancel a pending MP order
router.delete("/cancel-order/:externalReference", authenticate, cancelOrder);

// Public: MP webhook/IPN (validated internally)
router.post("/webhook", webhook);

// Protected: frontend polls this for order status
router.get("/order-status/:externalReference", authenticate, getOrderStatus);

export default router;
