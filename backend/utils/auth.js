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
