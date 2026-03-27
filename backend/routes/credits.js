// backend/routes/credits.js
import { Router } from "express";
import {
  getAccounts,
  createAccount,
  updateAccount,
  toggleAccountActive,
  getTransactions,
  addPayment,
} from "../controllers/credits.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

// Accounts
router.get("/accounts", authenticate, getAccounts);
router.post("/accounts", authenticate, createAccount);
router.patch("/accounts/:id", authenticate, updateAccount);
router.patch("/accounts/:id/toggle-active", authenticate, toggleAccountActive);

// Transactions
router.get("/accounts/:accountId/transactions", authenticate, getTransactions);
router.post("/accounts/:accountId/payments", authenticate, addPayment);

export default router;
