// backend/controllers/mercadopago.js
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import { query } from "../database.js";
import { withTransaction } from "../utils/db.js";
import { AppError } from "../utils/errors.js";
import { getActiveMerchant, getMerchantById } from "../utils/mpTokens.js";
import { emitInvoice } from "../services/arca/index.js";
import { getArcaConfig } from "../services/arca/config.js";

const MP_API_BASE = "https://api.mercadopago.com";
const DEFAULT_MP_ORDER_TIMEOUT_MINUTES = 15;

function getMpOrderTimeoutMs() {
  const configuredMinutes = Number(process.env.MP_ORDER_TIMEOUT_MINUTES);
  const minutes = Number.isFinite(configuredMinutes) && configuredMinutes > 0
    ? configuredMinutes
    : DEFAULT_MP_ORDER_TIMEOUT_MINUTES;
  return minutes * 60 * 1000;
}

function isPendingOrderExpired(createdAt) {
  return Date.now() - new Date(createdAt).getTime() >= getMpOrderTimeoutMs();
}

function getResolvedOrderStatus(order) {
  if (order.status === "pending" && isPendingOrderExpired(order.created_at)) {
    return "expired";
  }
  return order.status;
}

function buildOrderStatusResponse(order) {
  return {
    ...order,
    status: getResolvedOrderStatus(order),
    expires_at: new Date(new Date(order.created_at).getTime() + getMpOrderTimeoutMs()).toISOString(),
  };
}

function extractResourceId(resource) {
  if (!resource) return null;
  const normalized = String(resource).trim();
  if (!normalized) return null;
  if (!normalized.startsWith("http")) return normalized;

  const pieces = normalized.split("/").filter(Boolean);
  return pieces.at(-1) || null;
}

// POST /api/mp/create-order — Instore QR static model
export const createOrder = async (req, res, next) => {
  try {
    const merchant = await getActiveMerchant();
    const accessToken = merchant.mp_access_token;
    const mpUserId = merchant.mp_user_id;
    const externalPosId = merchant.mp_external_pos_id;
    const notificationUrl = process.env.MP_NOTIFICATION_URL;
    const sponsorId = process.env.MP_SPONSOR_ID;

    if (!externalPosId) {
      throw new AppError(
        400,
        "La cuenta de MercadoPago no tiene una caja (POS) configurada. El administrador debe configurarla.",
      );
    }

    const userId = req.user.id;
    const { cash_register_id, items, total_amount } = req.body;

    if (!cash_register_id) {
      throw new AppError(400, "cash_register_id es obligatorio");
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new AppError(400, "Se requiere al menos un item");
    }
    if (!total_amount || Number(total_amount) <= 0) {
      throw new AppError(400, "total_amount debe ser mayor a 0");
    }

    // Verify cash register is open
    const regCheck = await query(
      "SELECT id, status FROM cash_registers WHERE id = $1",
      [cash_register_id],
    );
    if (regCheck.rows.length === 0 || regCheck.rows[0].status !== "open") {
      throw new AppError(400, "La caja no está abierta");
    }

    const externalReference = `SF-${Date.now()}-${uuidv4().slice(0, 8)}`;

    // Resolve authoritative prices from DB — never trust client-sent prices
    const verifiedItems = [];
    let verifiedTotal = 0;
    for (const item of items) {
      const productResult = await query(
        "SELECT id, name, sell_price FROM products WHERE id = $1 AND is_active = true",
        [item.product_id],
      );
      if (productResult.rows.length === 0) {
        throw new AppError(400, `Producto ${item.product_id} no encontrado o inactivo`);
      }
      const product = productResult.rows[0];
      const qty = Number(item.quantity);
      const unitPrice = Number(product.sell_price);
      verifiedItems.push({
        product_id: product.id,
        name: product.name,
        unit_price: unitPrice,
        quantity: qty,
      });
      verifiedTotal += Math.round(unitPrice * qty * 100) / 100;
    }
    verifiedTotal = Math.round(verifiedTotal * 100) / 100;

    // Build Instore QR order payload
    // Docs: https://www.mercadopago.com.ar/developers/es/reference/instore_orders_v2/_instore_qr_seller_collectors_user_id_stores_external_store_id_pos_external_pos_id_orders/put
    const mpPayload = {
      external_reference: externalReference,
      title: "Venta StockFlow",
      description: `Venta de ${verifiedItems.length} producto(s)`,
      total_amount: verifiedTotal,
      items: verifiedItems.map((item) => {
        const subtotal = Math.round(item.unit_price * item.quantity * 100) / 100;
        // MP QR doesn't accept fractional quantities with unit_measure "unit"
        // Normalize: send qty=1 with subtotal as unit_price
        const isInteger = Number.isInteger(item.quantity);
        return {
          sku_number: String(item.product_id),
          category: "marketplace",
          title: item.name,
          unit_price: isInteger ? item.unit_price : subtotal,
          quantity: isInteger ? item.quantity : 1,
          unit_measure: "unit",
          total_amount: subtotal,
        };
      }),
      cash_out: { amount: 0 },
    };

    // sponsor_id identifies StockFlow as the integrator
    if (sponsorId) {
      mpPayload.sponsor = { id: Number(sponsorId) };
    }

    // Add notification URL if configured
    if (notificationUrl) {
      mpPayload.notification_url = notificationUrl;
    }

    // PUT to Instore QR endpoint (creates/replaces order on the POS QR)
    const mpUrl = `${MP_API_BASE}/instore/qr/seller/collectors/${mpUserId}/pos/${externalPosId}/orders`;

    const mpResponse = await fetch(mpUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(mpPayload),
    });

    const mpText = await mpResponse.text();
    let mpData;
    try {
      mpData = mpText ? JSON.parse(mpText) : {};
    } catch {
      mpData = {};
    }

    if (!mpResponse.ok) {
      console.error("MP create order error:", mpResponse.status, mpText);
      throw new AppError(
        mpResponse.status === 400 ? 400 : 502,
        `Error de Mercado Pago: ${mpData.message || mpData.error || `HTTP ${mpResponse.status}`}`,
      );
    }

    // Save pending order to DB with verified prices (merchant_id for webhook token resolution)
    await query(
      `INSERT INTO mp_pending_orders (external_reference, mp_order_id, cash_register_id, user_id, items, total_amount, status, merchant_id)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)`,
      [
        externalReference,
        mpData.in_store_order_id || null,
        cash_register_id,
        userId,
        JSON.stringify(verifiedItems),
        verifiedTotal,
        merchant.id,
      ],
    );

    res.status(201).json({
      order_id: mpData.in_store_order_id || null,
      external_reference: externalReference,
      status: "pending",
      qr_data: null, // QR estático — el QR físico ya está en la caja
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/mp/webhook — public endpoint, handles IPN notifications
export const webhook = async (req, res) => {
  try {
    const webhookSecret = process.env.MP_WEBHOOK_SECRET;

    // Validate HMAC signature when secret is configured
    if (webhookSecret) {
      const xSignature = req.headers["x-signature"];
      const xRequestId = req.headers["x-request-id"];

      // Reject requests without signature when secret is configured
      if (!xSignature) {
        console.warn("MP webhook: missing x-signature header (secret is configured)");
        return res.status(401).json({ message: "Missing signature" });
      }

      const parts = xSignature.split(",");
      let ts = null;
      let hash = null;
      for (const part of parts) {
        const [key, value] = part.split("=", 2).map((s) => s.trim());
        if (key === "ts") ts = value;
        if (key === "v1") hash = value;
      }

      if (!ts || !hash) {
        console.warn("MP webhook: malformed x-signature header");
        return res.status(401).json({ message: "Malformed signature" });
      }

      const dataId = (req.query["data.id"] || req.query["id"] || "").toString();
      const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
      const expectedHash = crypto
        .createHmac("sha256", webhookSecret)
        .update(manifest)
        .digest("hex");

      // Timing-safe comparison to prevent timing attacks
      const expectedBuf = Buffer.from(expectedHash, "utf8");
      const receivedBuf = Buffer.from(hash, "utf8");
      if (expectedBuf.length !== receivedBuf.length || !crypto.timingSafeEqual(expectedBuf, receivedBuf)) {
        console.warn("MP webhook: HMAC mismatch");
        return res.status(401).json({ message: "Invalid signature" });
      }
    }

    // Respond 200 immediately (MP requires fast response)
    res.status(200).json({ received: true });

    // Determine notification type
    const topic = req.body.topic || req.query.topic || req.body.type;
    const resourceId = req.body.resource || req.query["data.id"] || req.body.data?.id;

    console.log(`MP webhook: topic=${topic}, resource=${resourceId}, body=${JSON.stringify(req.body).substring(0, 200)}`);

    if (!topic || !resourceId) return;

    // QR static model sends "merchant_order" notifications
    // Token is resolved per-order from mp_pending_orders.merchant_id
    if (topic === "merchant_order") {
      await processMerchantOrder(resourceId);
    } else if (topic === "payment") {
      await processPaymentNotification(resourceId);
    }
  } catch (err) {
    console.error("MP webhook processing error:", err);
    if (!res.headersSent) {
      res.status(500).json({ message: "Webhook processing error" });
    }
  }
};

/**
 * Process a merchant_order notification (QR static model).
 * Resolves the merchant's access token from the pending order,
 * fetches the merchant order from MP API, checks if fully paid,
 * then creates the sale in our system.
 */
async function processMerchantOrder(resourceUrl) {
  const merchantOrderId = extractResourceId(resourceUrl);
  const accessToken = await resolveWebhookToken({ merchantOrderId });
  if (!accessToken) {
    console.error("MP webhook: no access token available to fetch merchant_order");
    return;
  }

  const url = resourceUrl.startsWith("http")
    ? resourceUrl
    : `${MP_API_BASE}/merchant_orders/${resourceUrl}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    console.error(`MP webhook: failed to fetch merchant_order: ${response.status}`);
    return;
  }

  const order = await response.json();
  const externalRef = order.external_reference;

  if (!externalRef) {
    console.warn("MP webhook: merchant_order missing external_reference");
    return;
  }

  // Check if all payments are approved and cover the total
  const paidAmount = (order.payments || [])
    .filter((p) => p.status === "approved")
    .reduce((sum, p) => sum + p.transaction_amount, 0);

  if (paidAmount < order.total_amount) {
    console.log(`MP webhook: merchant_order ${order.id} not fully paid yet (${paidAmount}/${order.total_amount})`);
    return;
  }

  // Get the payment ID for reference
  const approvedPayment = (order.payments || []).find((p) => p.status === "approved");
  const mpPaymentId = approvedPayment ? String(approvedPayment.id) : null;

  console.log(`MP webhook: merchant_order ${order.id} fully paid, ref=${externalRef}, payment=${mpPaymentId}`);

  await createSaleFromPendingOrder(externalRef, mpPaymentId);
}

async function findPendingOrderMerchantId({ merchantOrderId, externalReference }) {
  if (merchantOrderId) {
    const byOrderId = await query(
      `SELECT merchant_id
       FROM mp_pending_orders
       WHERE mp_order_id = $1 AND merchant_id IS NOT NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [merchantOrderId],
    );
    if (byOrderId.rows.length > 0) {
      return byOrderId.rows[0].merchant_id;
    }
  }

  if (externalReference) {
    const byReference = await query(
      `SELECT merchant_id
       FROM mp_pending_orders
       WHERE external_reference = $1 AND merchant_id IS NOT NULL
       LIMIT 1`,
      [externalReference],
    );
    if (byReference.rows.length > 0) {
      return byReference.rows[0].merchant_id;
    }
  }

  return null;
}

/**
 * Resolve an access token for webhook processing.
 * Prefers the merchant tied to the pending order, falls back to the active merchant.
 */
async function resolveWebhookToken({ merchantOrderId = null, externalReference = null } = {}) {
  try {
    const merchantId = await findPendingOrderMerchantId({ merchantOrderId, externalReference });
    if (merchantId) {
      const merchant = await getMerchantById(merchantId);
      if (merchant?.is_active) {
        return merchant.mp_access_token;
      }
    }

    const merchant = await getActiveMerchant();
    return merchant.mp_access_token;
  } catch {
    return null;
  }
}

/**
 * Process a payment notification (fallback).
 * Fetches payment details, then checks the merchant_order.
 */
async function processPaymentNotification(paymentId) {
  const accessToken = await resolveWebhookToken();
  if (!accessToken) {
    console.error("MP webhook: no access token available to fetch payment");
    return;
  }

  const url = `${MP_API_BASE}/v1/payments/${paymentId}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    console.error(`MP webhook: failed to fetch payment ${paymentId}: ${response.status}`);
    return;
  }

  const payment = await response.json();

  if (payment.status !== "approved") {
    console.log(`MP webhook: payment ${paymentId} status=${payment.status}, ignoring`);
    return;
  }

  const externalRef = payment.external_reference;
  if (!externalRef) {
    console.warn(`MP webhook: payment ${paymentId} has no external_reference`);
    return;
  }

  console.log(`MP webhook: payment ${paymentId} approved, ref=${externalRef}`);
  await createSaleFromPendingOrder(externalRef, String(paymentId));
}

/**
 * Atomically claim a pending order and create the sale + stock movements.
 */
async function createSaleFromPendingOrder(externalRef, mpPaymentId) {
  // Atomically claim the pending order (prevents double processing)
  const claimResult = await query(
    `UPDATE mp_pending_orders
     SET status = 'completed', updated_at = NOW()
     WHERE external_reference = $1 AND status = 'pending'
     RETURNING *`,
    [externalRef],
  );

  if (claimResult.rows.length === 0) {
    console.warn(
      `MP webhook: no pending order found for ref=${externalRef} (already processed or not found)`,
    );
    return;
  }

  const pendingOrder = claimResult.rows[0];
  const items = pendingOrder.items;
  let createdSaleId = null;
  let createdTotal = 0;

  try {
    await withTransaction(async (txQuery) => {
      let totalAmount = 0;
      const itemsData = [];

      for (const item of items) {
        const productResult = await txQuery(
          "SELECT id, stock_quantity, name, sell_price FROM products WHERE id = $1",
          [item.product_id],
        );

        if (productResult.rows.length === 0) {
          console.error(
            `MP webhook: product ${item.product_id} not found for ref=${externalRef}`,
          );
          continue;
        }

        const product = productResult.rows[0];
        const qty = Number(item.quantity);
        // Always use authoritative price from DB — never trust stored client prices
        const unitPrice = Number(product.sell_price);
        const subtotal = unitPrice * qty;
        totalAmount += subtotal;

        itemsData.push({
          product_id: item.product_id,
          quantity: qty,
          unitPrice,
          subtotal,
        });
      }

      // Create sale
      const saleResult = await txQuery(
        `INSERT INTO sales (cash_register_id, user_id, total_amount, status)
         VALUES ($1, $2, $3, 'completed') RETURNING *`,
        [pendingOrder.cash_register_id, pendingOrder.user_id, totalAmount],
      );
      const sale = saleResult.rows[0];
      createdSaleId = sale.id;
      createdTotal = totalAmount;

      // Insert items & update stock
      for (const d of itemsData) {
        await txQuery(
          `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal)
           VALUES ($1, $2, $3, $4, $5)`,
          [sale.id, d.product_id, d.quantity, d.unitPrice, d.subtotal],
        );

        await txQuery(
          "UPDATE products SET stock_quantity = stock_quantity - $1, updated_at = NOW() WHERE id = $2",
          [d.quantity, d.product_id],
        );

        await txQuery(
          `INSERT INTO stock_movements (product_id, movement_type, quantity, reason, user_id)
           VALUES ($1, 'exit', $2, $3, $4)`,
          [
            d.product_id,
            d.quantity,
            `Venta #${sale.id} (MercadoPago)`,
            pendingOrder.user_id,
          ],
        );
      }

      // Insert payment
      await txQuery(
        `INSERT INTO sale_payments (sale_id, payment_method, amount, mp_payment_id)
         VALUES ($1, 'mercadopago', $2, $3)`,
        [sale.id, totalAmount, mpPaymentId],
      );

      console.log(
        `MP webhook: sale #${sale.id} created for ref=${externalRef}, mp_payment_id=${mpPaymentId}`,
      );
    });

    // Fire-and-forget ARCA invoice for MP sale
    if (createdSaleId && getArcaConfig().enabled) {
      emitInvoice(createdSaleId, createdTotal).catch((err) => {
        console.error(`[ARCA] Unhandled error in emitInvoice for MP sale #${createdSaleId}:`, err);
      });
    }
  } catch (err) {
    console.error(
      `MP webhook: error creating sale for ref=${externalRef}:`,
      err,
    );
    // Revert the pending order status so it can be retried
    await query(
      `UPDATE mp_pending_orders SET status = 'pending', updated_at = NOW()
       WHERE external_reference = $1 AND status = 'completed'`,
      [externalRef],
    );
  }
}

async function updatePendingOrderStatus(externalRef, newStatus) {
  if (!externalRef) return;

  const result = await query(
    `UPDATE mp_pending_orders
     SET status = $1, updated_at = NOW()
     WHERE external_reference = $2 AND status = 'pending'`,
    [newStatus, externalRef],
  );

  if (result.rowCount > 0) {
    console.log(`MP webhook: order ref=${externalRef} marked as ${newStatus}`);
  }
}

// DELETE /api/mp/cancel-order — remove pending order from POS QR
export const cancelOrder = async (req, res, next) => {
  try {
    const merchant = await getActiveMerchant();
    const { externalReference } = req.params;

    if (!merchant.mp_external_pos_id) {
      throw new AppError(400, "No hay POS configurado para este comerciante");
    }

    // Delete order from POS QR
    const mpResponse = await fetch(
      `${MP_API_BASE}/instore/qr/seller/collectors/${merchant.mp_user_id}/pos/${merchant.mp_external_pos_id}/orders`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${merchant.mp_access_token}` },
      },
    );

    if (!mpResponse.ok && mpResponse.status !== 404) {
      console.error("MP cancel order error:", mpResponse.status);
    }

    // Mark as cancelled in DB
    if (externalReference) {
      await updatePendingOrderStatus(externalReference, "cancelled");
    }

    res.json({ message: "Orden cancelada" });
  } catch (err) {
    next(err);
  }
};

// GET /api/mp/order-status/:externalReference
export const getOrderStatus = async (req, res, next) => {
  try {
    const { externalReference } = req.params;

    const result = await query(
      "SELECT status, mp_order_id, total_amount, created_at, updated_at FROM mp_pending_orders WHERE external_reference = $1",
      [externalReference],
    );

    if (result.rows.length === 0) {
      throw new AppError(404, "Orden no encontrada");
    }

    res.json(buildOrderStatusResponse(result.rows[0]));
  } catch (err) {
    next(err);
  }
};
