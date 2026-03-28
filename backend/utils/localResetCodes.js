import crypto from "node:crypto";

const DEFAULT_LOCAL_RESET_TTL_MINUTES = 15;

export function generateLocalResetCode() {
  const num = crypto.randomInt(0, 1_000_000);
  return String(num).padStart(6, "0");
}

export function hashLocalResetCode(code) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export function getLocalResetCodeExpiryMinutes() {
  const ttl = Number.parseInt(
    process.env.LOCAL_PASSWORD_RESET_TTL_MINUTES ?? "",
    10,
  );
  if (Number.isNaN(ttl) || ttl <= 0) {
    return DEFAULT_LOCAL_RESET_TTL_MINUTES;
  }
  return ttl;
}

export function getLocalResetCodeExpiryDate() {
  return new Date(Date.now() + getLocalResetCodeExpiryMinutes() * 60 * 1000);
}
