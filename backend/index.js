import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Load env BEFORE any module that reads process.env
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, ".env") });

import { createApp } from "./app.js";
import { getPool } from "./database.js";

const PORT = process.env.PORT ?? 3000;

const app = createApp();

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
