import crypto from "node:crypto";

const DEFAULT_LOCAL_RESET_TTL_MINUTES = 15;

export function generateLocalResetCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const length = 8;
  const bytes = crypto.randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i++) {
    code += alphabet[bytes[i] % alphabet.length];
  }
  return code;
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
