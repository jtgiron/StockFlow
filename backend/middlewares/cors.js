import cors from "cors";

const ACCEPTED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.CLIENT_URL,
];

export const corsMiddleware = ({ acceptedOrigins = ACCEPTED_ORIGINS } = {}) => {
  return cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, same-origin)
      if (!origin || acceptedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
  });
};
