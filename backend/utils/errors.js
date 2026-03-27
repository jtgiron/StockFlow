// backend/utils/errors.js

export class AppError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  console.error("Unhandled error:", err);

  const isDev = process.env.NODE_ENV !== "production";
  res.status(500).json({
    message: "Error interno del servidor",
    ...(isDev && { error: err.message, stack: err.stack }),
  });
}
