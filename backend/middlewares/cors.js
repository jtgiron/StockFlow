import cors from "cors";

const DEFAULT_ORIGINS = ["http://localhost:5173", "http://localhost:3000"];

function getAllowedOrigins() {
  const origins = [...DEFAULT_ORIGINS];
  if (process.env.CLIENT_URL) {
    origins.push(process.env.CLIENT_URL);
  }
  return origins.filter(Boolean);
}

export const corsMiddleware = ({ acceptedOrigins } = {}) => {
  const allowed = acceptedOrigins || getAllowedOrigins();

  return cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, same-origin)
      if (!origin || allowed.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  });
};
