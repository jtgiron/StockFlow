// backend/utils/mpTokens.js — MercadoPago token management
import { query } from "../database.js";
import { AppError } from "./errors.js";

const MP_API_BASE = "https://api.mercadopago.com";

// Refresh token if it expires within this window
const REFRESH_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Get the active merchant for the current StockFlow instance.
 * Returns the merchant record with a valid (auto-refreshed) access token.
 */
export async function getActiveMerchant() {
  const result = await query(
    `SELECT * FROM mp_merchants
     WHERE is_active = true
     ORDER BY updated_at DESC
     LIMIT 1`,
  );

  if (result.rows.length === 0) {
    throw new AppError(
      400,
      "No hay cuenta de MercadoPago conectada. El administrador debe vincular una cuenta desde Configuración.",
    );
  }

  const merchant = result.rows[0];

  // Check if token needs refresh
  const expiresAt = new Date(merchant.token_expires_at);
  const now = new Date();

  if (expiresAt.getTime() - now.getTime() < REFRESH_THRESHOLD_MS) {
    return await refreshMerchantToken(merchant);
  }

  return merchant;
}

/**
 * Refresh a merchant's access token using the refresh_token grant.
 */
async function refreshMerchantToken(merchant) {
  const clientId = process.env.MP_CLIENT_ID;
  const clientSecret = process.env.MP_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new AppError(
      500,
      "MP_CLIENT_ID o MP_CLIENT_SECRET no configurados. No se puede renovar el token.",
    );
  }

  const response = await fetch(`${MP_API_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: merchant.mp_refresh_token,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("MP token refresh failed:", data);
    // Mark merchant as needing re-auth if refresh token is invalid
    if (response.status === 400 || response.status === 401) {
      await query(
        "UPDATE mp_merchants SET is_active = false, updated_at = NOW() WHERE id = $1",
        [merchant.id],
      );
      throw new AppError(
        401,
        "El token de MercadoPago expiró. El administrador debe reconectar la cuenta.",
      );
    }
    throw new AppError(502, "Error al renovar token de MercadoPago");
  }

  const { access_token, refresh_token, expires_in } = data;
  const expiresAt = new Date(Date.now() + expires_in * 1000);

  const updated = await query(
    `UPDATE mp_merchants
     SET mp_access_token = $1, mp_refresh_token = $2, token_expires_at = $3, updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [access_token, refresh_token, expiresAt, merchant.id],
  );

  console.log(`MP token refreshed for merchant ${merchant.id}, expires ${expiresAt.toISOString()}`);
  return updated.rows[0];
}

/**
 * Get a merchant by ID (used by webhook to resolve from pending order).
 */
export async function getMerchantById(merchantId) {
  const result = await query("SELECT * FROM mp_merchants WHERE id = $1", [
    merchantId,
  ]);

  if (result.rows.length === 0) {
    return null;
  }

  const merchant = result.rows[0];

  // Auto-refresh if needed
  const expiresAt = new Date(merchant.token_expires_at);
  const now = new Date();

  if (merchant.is_active && expiresAt.getTime() - now.getTime() < REFRESH_THRESHOLD_MS) {
    return await refreshMerchantToken(merchant);
  }

  return merchant;
}
