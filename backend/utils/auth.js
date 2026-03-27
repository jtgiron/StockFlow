import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.includes("change-this")) {
  throw new Error(
    "FATAL: JWT_SECRET is not set or still has the placeholder value. Set a strong secret in .env",
  );
}

const JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || "1h";
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || "7d";

export const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

export const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_ACCESS_EXPIRY },
  );
};

export const generateRefreshToken = (user) => {
  return jwt.sign({ id: user.id, type: "refresh" }, JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRY,
  });
};

/** @deprecated Use generateAccessToken instead */
export const generateToken = generateAccessToken;

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

/**
 * Generate a cryptographically strong random secret.
 * Useful for initial setup: node -e "import('./utils/auth.js')"
 */
export const generateSecret = () => crypto.randomBytes(64).toString("hex");
