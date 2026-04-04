// backend/controllers/mpOauth.js — OAuth flow + merchant management
import { query } from "../database.js";
import { AppError } from "../utils/errors.js";

const MP_API_BASE = "https://api.mercadopago.com";
const MP_AUTH_BASE = "https://auth.mercadopago.com";

function getIntegratorConfig() {
  const clientId = process.env.MP_CLIENT_ID;
  const clientSecret = process.env.MP_CLIENT_SECRET;
  const sponsorId = process.env.MP_SPONSOR_ID;
  const redirectUri = process.env.MP_REDIRECT_URI;

  if (!clientId || !clientSecret) {
    throw new AppError(
      500,
      "Configuración de integrador MP incompleta. Faltan MP_CLIENT_ID o MP_CLIENT_SECRET.",
    );
  }

  return { clientId, clientSecret, sponsorId, redirectUri };
}

/**
 * GET /api/mp/oauth/authorize
 * Redirects the merchant to MercadoPago to authorize the app.
 */
export const authorize = async (req, res, next) => {
  try {
    const { clientId, redirectUri } = getIntegratorConfig();

    if (!redirectUri) {
      throw new AppError(500, "MP_REDIRECT_URI no está configurada");
    }

    // Use state to prevent CSRF and link to the admin user
    const state = Buffer.from(
      JSON.stringify({ userId: req.user.id, ts: Date.now() }),
    ).toString("base64url");

    const authUrl = new URL(`${MP_AUTH_BASE}/authorization`);
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("platform_id", "mp");
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("state", state);

    res.json({ authorization_url: authUrl.toString() });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/mp/oauth/callback
 * Receives the authorization code from MP and exchanges it for tokens.
 */
export const callback = async (req, res, next) => {
  try {
    const { clientId, clientSecret, redirectUri } = getIntegratorConfig();
    const { code, state } = req.query;

    if (!code) {
      throw new AppError(400, "Código de autorización no recibido");
    }

    // Decode state to get the admin user who initiated the flow
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, "base64url").toString());
    } catch {
      throw new AppError(400, "Estado inválido");
    }

    const adminUserId = stateData.userId;
    if (!adminUserId) {
      throw new AppError(400, "Estado inválido: falta userId");
    }

    // Exchange code for tokens
    const tokenResponse = await fetch(`${MP_API_BASE}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("MP OAuth token exchange error:", tokenData);
      throw new AppError(
        502,
        `Error de MercadoPago: ${tokenData.message || tokenData.error || "Token exchange failed"}`,
      );
    }

    const {
      access_token,
      refresh_token,
      expires_in,
      user_id: mpUserId,
    } = tokenData;

    if (!access_token || !refresh_token || !mpUserId) {
      throw new AppError(502, "Respuesta incompleta de MercadoPago OAuth");
    }

    const expiresAt = new Date(Date.now() + expires_in * 1000);

    // Fetch merchant name from MP
    let merchantName = null;
    try {
      const userRes = await fetch(`${MP_API_BASE}/users/${mpUserId}`, {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        merchantName =
          userData.nickname ||
          `${userData.first_name || ""} ${userData.last_name || ""}`.trim() ||
          null;
      }
    } catch {
      // Non-critical, continue without name
    }

    // Upsert merchant record
    const result = await query(
      `INSERT INTO mp_merchants (user_id, mp_user_id, mp_access_token, mp_refresh_token, token_expires_at, merchant_name)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (mp_user_id) DO UPDATE SET
         mp_access_token = EXCLUDED.mp_access_token,
         mp_refresh_token = EXCLUDED.mp_refresh_token,
         token_expires_at = EXCLUDED.token_expires_at,
         merchant_name = COALESCE(EXCLUDED.merchant_name, mp_merchants.merchant_name),
         is_active = true,
         updated_at = NOW()
       RETURNING *`,
      [adminUserId, mpUserId, access_token, refresh_token, expiresAt, merchantName],
    );

    const merchant = result.rows[0];

    // Create Store + POS under the merchant's MP account (if not already created)
    if (!merchant.mp_external_pos_id) {
      try {
        const storeAndPos = await createStoreAndPos(access_token, mpUserId, merchant.id);
        console.log(`MP OAuth: Store+POS created for merchant ${merchant.id}:`, storeAndPos);
      } catch (storeErr) {
        console.error(`MP OAuth: Failed to create Store+POS for merchant ${merchant.id}:`, storeErr.message);
        // Non-blocking: merchant is connected, Store/POS can be retried
      }
    }

    // Redirect to frontend success page
    const frontendUrl = process.env.CLIENT_URL || "http://localhost:5173";
    res.redirect(
      `${frontendUrl}/mp-connected?merchant_id=${merchant.id}&name=${encodeURIComponent(merchantName || mpUserId)}`,
    );
  } catch (err) {
    // If it's a redirect flow, redirect to frontend with error
    const frontendUrl = process.env.CLIENT_URL || "http://localhost:5173";
    if (!res.headersSent) {
      res.redirect(
        `${frontendUrl}/mp-connected?error=${encodeURIComponent(err.message || "Error desconocido")}`,
      );
    }
  }
};

/**
 * Creates a Store (sucursal) and POS (caja) under the merchant's MP account.
 * Uses the merchant's access_token so the resources belong to THEM.
 */
async function createStoreAndPos(accessToken, mpUserId, merchantId) {
  const sponsorId = process.env.MP_SPONSOR_ID;
  const externalStoreId = `SFSTORE${merchantId}`;
  const externalPosId = `SFPOS${merchantId}`;

  // 1. Create Store (sucursal)
  const storePayload = {
    name: "StockFlow - Sucursal Principal",
    external_id: externalStoreId,
    location: {
      street_number: "0",
      street_name: "Sin dirección",
      city_name: "Almirante Brown",
      state_name: "Buenos Aires",
      latitude: -34.6037,
      longitude: -58.3816,
    },
  };

  const storeRes = await fetch(
    `${MP_API_BASE}/users/${mpUserId}/stores`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(storePayload),
    },
  );

  let storeData;
  if (storeRes.status === 400) {
    // Store might already exist, try to find it
    const listRes = await fetch(
      `${MP_API_BASE}/users/${mpUserId}/stores/search?external_id=${externalStoreId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const listData = await listRes.json();
    storeData = listData.results?.[0];
    if (!storeData) {
      const errBody = await storeRes.text();
      throw new Error(`Failed to create store: ${errBody}`);
    }
  } else if (!storeRes.ok) {
    const errBody = await storeRes.text();
    throw new Error(`Failed to create store: HTTP ${storeRes.status} - ${errBody}`);
  } else {
    storeData = await storeRes.json();
  }

  // 2. Create POS (caja) linked to the store
  const posPayload = {
    name: "Caja StockFlow",
    external_id: externalPosId,
    external_store_id: externalStoreId,
    fixed_amount: false,
    category: 621102, // Minimarket / Kiosco
  };

  if (sponsorId) {
    posPayload.store_id = storeData.id;
  }

  const posRes = await fetch(
    `${MP_API_BASE}/pos`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(posPayload),
    },
  );

  let posData;
  if (posRes.status === 400) {
    // POS might already exist
    const listRes = await fetch(
      `${MP_API_BASE}/pos?external_id=${externalPosId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const listData = await listRes.json();
    posData = listData.results?.[0];
    if (!posData) {
      const errBody = await posRes.text();
      throw new Error(`Failed to create POS: ${errBody}`);
    }
  } else if (!posRes.ok) {
    const errBody = await posRes.text();
    throw new Error(`Failed to create POS: HTTP ${posRes.status} - ${errBody}`);
  } else {
    posData = await posRes.json();
  }

  // 3. Save Store + POS IDs + QR URL to our DB
  const qrImageUrl = posData.qr?.image || null;

  await query(
    `UPDATE mp_merchants
     SET mp_store_id = $1, mp_external_store_id = $2, mp_pos_id = $3, mp_external_pos_id = $4, qr_image_url = $5, updated_at = NOW()
     WHERE id = $6`,
    [String(storeData.id), externalStoreId, String(posData.id), externalPosId, qrImageUrl, merchantId],
  );

  return { storeId: storeData.id, posId: posData.id, externalPosId, qr_url: qrImageUrl };
}

/**
 * POST /api/mp/merchants/:id/setup-pos — retry Store+POS creation
 */
export const setupMerchantPos = async (req, res, next) => {
  try {
    const { id } = req.params;
    const merchant = await query("SELECT * FROM mp_merchants WHERE id = $1 AND is_active = true", [id]);

    if (merchant.rows.length === 0) {
      throw new AppError(404, "Comerciante no encontrado o inactivo");
    }

    const m = merchant.rows[0];
    const result = await createStoreAndPos(m.mp_access_token, m.mp_user_id, m.id);

    res.json({
      message: "Sucursal y caja creadas correctamente",
      ...result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/mp/merchants — list connected merchants
 */
export const listMerchants = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, mp_user_id, merchant_name, mp_external_pos_id, qr_image_url, is_active, created_at, updated_at,
              token_expires_at,
              CASE WHEN token_expires_at > NOW() THEN true ELSE false END AS token_valid
       FROM mp_merchants
       ORDER BY created_at DESC`,
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/mp/merchants/:id — disconnect a merchant
 */
export const disconnectMerchant = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      "UPDATE mp_merchants SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id",
      [id],
    );
    if (result.rows.length === 0) {
      throw new AppError(404, "Comerciante no encontrado");
    }
    res.json({ message: "Comerciante desconectado" });
  } catch (err) {
    next(err);
  }
};
