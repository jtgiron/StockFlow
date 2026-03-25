import express from "express";

import crypto from "crypto";
import { corsMiddleware } from "./middlewares/cors.js";
import productsRouter from "./routes/products.js";
import authRouter from "./routes/auth.js";
import usersRouter from "./routes/users.js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, ".env") });

const PORT = process.env.PORT ?? 3000;

const app = express();

app.use(corsMiddleware());
app.use(express.json());

// Public routes
app.use("/api/auth", authRouter);
app.use("/api/products", productsRouter);
app.use("/api/users", usersRouter);

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
  });
});

app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from the backend!" });
});

// Protected route example
app.get("/api/protected", (req, res) => {
  res.json({ message: "This is a protected route" });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
