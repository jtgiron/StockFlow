// backend/app.js — Express app factory (used by both index.js and tests)
import express from "express";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";

import { corsMiddleware } from "./middlewares/cors.js";
import { errorHandler } from "./utils/errors.js";
import { getPool } from "./database.js";
import productsRouter from "./routes/products.js";
import authRouter from "./routes/auth.js";
import usersRouter from "./routes/users.js";
import categoriesRouter from "./routes/categories.js";
import stockRouter from "./routes/stock.js";
import cashRegistersRouter from "./routes/cashRegisters.js";
import salesRouter from "./routes/sales.js";
import creditsRouter from "./routes/credits.js";
import reportsRouter from "./routes/reports.js";
import priceListsRouter from "./routes/priceLists.js";
import mercadopagoRouter from "./routes/mercadopago.js";

export function createApp({ enableRateLimit = true } = {}) {
  const app = express();

  app.use(helmet());
  app.use(corsMiddleware());
  app.use(compression());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));

  if (enableRateLimit) {
    const globalLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 500,
      standardHeaders: true,
      legacyHeaders: false,
      message: { message: "Demasiadas solicitudes, intente más tarde" },
    });
    app.use(globalLimiter);
  }

  // Health check
  app.get("/health", async (_req, res) => {
    try {
      const pool = getPool();
      await pool.query("SELECT 1");
      res.json({ status: "ok", uptime: process.uptime() });
    } catch {
      res.status(503).json({ status: "degraded", uptime: process.uptime() });
    }
  });

  // Routes
  app.use("/api/auth", authRouter);
  app.use("/api/products", productsRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/categories", categoriesRouter);
  app.use("/api/stock", stockRouter);
  app.use("/api/cash-registers", cashRegistersRouter);
  app.use("/api/sales", salesRouter);
  app.use("/api/credits", creditsRouter);
  app.use("/api/reports", reportsRouter);
  app.use("/api/price-lists", priceListsRouter);
  app.use("/api/mp", mercadopagoRouter);

  app.use(errorHandler);

  return app;
}
