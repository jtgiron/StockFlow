import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";

let _secret = null;
let _validated = false;

function getSecret() {
  if (!_validated) {
    _secret = process.env.JWT_SECRET;
    if (!_secret || _secret.includes("change-this")) {
      throw new Error(
        "FATAL: JWT_SECRET is not set or still has the placeholder value. Set a strong secret in .env",
      );
    }
    _validated = true;
  }
  return _secret;
}

function getAccessExpiry() {
  return process.env.JWT_ACCESS_EXPIRY || "1h";
}

function getRefreshExpiry() {
  return process.env.JWT_REFRESH_EXPIRY || "7d";
}

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
    getSecret(),
    { expiresIn: getAccessExpiry() },
  );
};

export const generateRefreshToken = (user) => {
  return jwt.sign({ id: user.id, type: "refresh" }, getSecret(), {
    expiresIn: getRefreshExpiry(),
  });
};

/** @deprecated Use generateAccessToken instead */
export const generateToken = generateAccessToken;

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, getSecret());
  } catch (error) {
    return null;
  }
};

export const generateSecret = () => crypto.randomBytes(64).toString("hex");

/**
 * Parse a JWT expiry string (e.g. "7d", "24h", "30m") into milliseconds.
 */
function parseExpiryToMs(expiry) {
  const match = /^(\d+)(s|m|h|d)$/.exec(expiry);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7d
  const n = Number(match[1]);
  const unit = match[2];
  const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return n * multipliers[unit];
}

/**
 * Build cookie options for the refresh token HttpOnly cookie.
 */
export function getRefreshCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    path: "/api/auth",
    maxAge: parseExpiryToMs(getRefreshExpiry()),
  };
}

export const REFRESH_COOKIE_NAME = "refresh_token";
