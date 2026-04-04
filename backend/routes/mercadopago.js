// backend/routes/mercadopago.js
import { Router } from "express";
import {
  createOrder,
  webhook,
  getOrderStatus,
  cancelOrder,
} from "../controllers/mercadopago.js";
import {
  authorize,
  callback,
  listMerchants,
  disconnectMerchant,
  setupMerchantPos,
} from "../controllers/mpOauth.js";
import { authenticate } from "../middlewares/auth.js";
import { authorizeAdmin } from "../middlewares/auth.js";

const router = Router();

// --- OAuth flow ---
// Protected (admin only): get MP authorization URL
router.get("/oauth/authorize", authenticate, authorizeAdmin, authorize);
// Public: MP redirects here after merchant authorizes
router.get("/oauth/callback", callback);
// Protected (admin only): list connected merchants
router.get("/merchants", authenticate, authorizeAdmin, listMerchants);
// Protected (admin only): disconnect a merchant
router.delete("/merchants/:id", authenticate, authorizeAdmin, disconnectMerchant);
// Protected (admin only): retry Store+POS creation
router.post("/merchants/:id/setup-pos", authenticate, authorizeAdmin, setupMerchantPos);

// --- QR Instore flow ---
// Protected: create MP order from POS
router.post("/create-order", authenticate, createOrder);

// Protected: cancel a pending MP order
router.delete("/cancel-order/:externalReference", authenticate, cancelOrder);

// Public: MP webhook/IPN (validated internally)
router.post("/webhook", webhook);

// Protected: frontend polls this for order status
router.get("/order-status/:externalReference", authenticate, getOrderStatus);

export default router;
