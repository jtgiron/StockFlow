import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Load env BEFORE any module that reads process.env
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, ".env") });

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

const PORT = process.env.PORT ?? 3000;

const app = express();

// Security headers
app.use(helmet());

// CORS
app.use(corsMiddleware());

// Compression
app.use(compression());

// Body parsing with size limits
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Global rate limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Demasiadas solicitudes, intente más tarde" },
});
app.use(globalLimiter);

// Strict rate limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Demasiados intentos de autenticación, intente más tarde",
  },
});

// Request logging (lightweight, no extra dependency)
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check (before auth)
app.get("/health", async (_req, res) => {
  try {
    const pool = getPool();
    await pool.query("SELECT 1");
    res.json({ status: "ok", uptime: process.uptime() });
  } catch {
    res.status(503).json({ status: "degraded", uptime: process.uptime() });
  }
});

// Public routes (with stricter rate limit)
app.use("/api/auth", authLimiter, authRouter);

// Protected routes
app.use("/api/products", productsRouter);
app.use("/api/users", usersRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/stock", stockRouter);
app.use("/api/cash-registers", cashRegistersRouter);
app.use("/api/sales", salesRouter);
app.use("/api/credits", creditsRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/price-lists", priceListsRouter);

// Global error handler
app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Graceful shutdown
function shutdown(signal) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    try {
      const pool = getPool();
      await pool.end();
      console.log("Database pool closed");
    } catch {
      // pool may not have been initialized
    }
    process.exit(0);
  });

  // Force exit after 10s
  setTimeout(() => {
    console.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
