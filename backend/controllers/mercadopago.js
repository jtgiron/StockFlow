// backend/controllers/mercadopago.js
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import { query } from "../database.js";
import { withTransaction } from "../utils/db.js";
import { AppError } from "../utils/errors.js";

const MP_API_BASE = "https://api.mercadopago.com";

function getMpConfig() {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  const userId = process.env.MP_USER_ID;
  const externalPosId = process.env.MP_EXTERNAL_POS_ID;
  const webhookSecret = process.env.MP_WEBHOOK_SECRET;

  if (!accessToken || !userId || !externalPosId) {
    throw new AppError(
      500,
      "Configuración de Mercado Pago incompleta. Revise las variables de entorno.",
    );
  }

  return { accessToken, userId, externalPosId, webhookSecret };
}

// POST /api/mp/create-order
export const createOrder = async (req, res, next) => {
  try {
    const { accessToken, externalPosId } = getMpConfig();
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
    const idempotencyKey = uuidv4();
    const amount = Number(total_amount).toFixed(2);

    // Build MP order payload
    const mpPayload = {
      type: "qr",
      total_amount: amount,
      external_reference: externalReference,
      description: `Venta StockFlow`,
      expiration_time: "PT15M",
      config: {
        qr: {
          external_pos_id: externalPosId,
          mode: "static",
        },
      },
      transactions: {
        payments: [{ amount }],
      },
      items: items.map((item) => ({
        title: item.name || item.title || "Producto",
        unit_price: Number(item.unit_price).toFixed(2),
        quantity: Number(item.quantity),
        unit_measure: "unit",
        total_amount: (Number(item.unit_price) * Number(item.quantity)).toFixed(
          2,
        ),
      })),
    };

    // Call MP API
    const mpResponse = await fetch(`${MP_API_BASE}/v1/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(mpPayload),
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error("MP create order error:", mpData);
      throw new AppError(
        mpResponse.status === 400 ? 400 : 502,
        `Error de Mercado Pago: ${mpData.message || mpData.error || "Error desconocido"}`,
      );
    }

    // Save pending order to DB
    await query(
      `INSERT INTO mp_pending_orders (external_reference, mp_order_id, cash_register_id, user_id, items, total_amount, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
      [
        externalReference,
        mpData.id || null,
        cash_register_id,
        userId,
        JSON.stringify(items),
        amount,
      ],
    );

    res.status(201).json({
      order_id: mpData.id,
      external_reference: externalReference,
      status: mpData.status || "created",
      qr_data: mpData.type_response?.qr_data || null,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/mp/webhook — public endpoint, validates HMAC
export const webhook = async (req, res, next) => {
  try {
    const { webhookSecret } = getMpConfig();

    // Validate HMAC signature if secret is configured
    if (webhookSecret) {
      const xSignature = req.headers["x-signature"];
      const xRequestId = req.headers["x-request-id"];

      if (!xSignature) {
        console.warn("MP webhook: missing x-signature header");
        return res.status(401).json({ message: "Missing signature" });
      }

      // Parse ts and v1 from x-signature
      const parts = xSignature.split(",");
      let ts = null;
      let hash = null;
      for (const part of parts) {
        const [key, value] = part.split("=", 2).map((s) => s.trim());
        if (key === "ts") ts = value;
        if (key === "v1") hash = value;
      }

      if (!ts || !hash) {
        console.warn("MP webhook: invalid x-signature format");
        return res.status(401).json({ message: "Invalid signature format" });
      }

      // Build manifest: data.id from query params (lowercase), request-id, ts
      const dataId = (req.query["data.id"] || "").toString().toLowerCase();
      const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
      const expectedHash = crypto
        .createHmac("sha256", webhookSecret)
        .update(manifest)
        .digest("hex");

      if (expectedHash !== hash) {
        console.warn("MP webhook: HMAC mismatch");
        return res.status(401).json({ message: "Invalid signature" });
      }
    }

    // Respond 200 immediately (MP requires response within 22s)
    res.status(200).json({ received: true });

    // Process asynchronously
    const { action, data } = req.body;
    if (!action || !data) return;

    console.log(`MP webhook: action=${action}, data.id=${data.id}`);

    if (action === "order.processed") {
      await processApprovedOrder(data);
    } else if (action === "order.canceled" || action === "order.expired") {
      const newStatus = action === "order.canceled" ? "cancelled" : "expired";
      await updatePendingOrderStatus(data.external_reference, newStatus);
    }
  } catch (err) {
    // Don't propagate errors after response is sent
    console.error("MP webhook processing error:", err);
  }
};

async function processApprovedOrder(data) {
  const externalRef = data.external_reference;
  if (!externalRef) {
    console.error("MP webhook: missing external_reference in data");
    return;
  }

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
  const items = pendingOrder.items; // JSONB, already parsed
  const mpPaymentId =
    data.transactions?.payments?.[0]?.reference?.id ||
    data.transactions?.payments?.[0]?.id ||
    data.id ||
    null;

  try {
    await withTransaction(async (txQuery) => {
      // Verify cash register is still open
      const regCheck = await txQuery(
        "SELECT id, status FROM cash_registers WHERE id = $1",
        [pendingOrder.cash_register_id],
      );
      if (regCheck.rows.length === 0 || regCheck.rows[0].status !== "open") {
        console.error(
          `MP webhook: cash register ${pendingOrder.cash_register_id} not open for ref=${externalRef}`,
        );
        // Still mark as completed since MP already charged the customer
        // The sale will be created with the register ID regardless
      }

      // Calculate total and validate items
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
        const unitPrice =
          item.unit_price != null
            ? Number(item.unit_price)
            : Number(product.sell_price);
        const subtotal = unitPrice * qty;
        totalAmount += subtotal;

        itemsData.push({
          product_id: item.product_id,
          quantity: qty,
          unitPrice,
          subtotal,
          productName: product.name,
        });
      }

      // Create sale
      const saleResult = await txQuery(
        `INSERT INTO sales (cash_register_id, user_id, total_amount, status)
         VALUES ($1, $2, $3, 'completed') RETURNING *`,
        [pendingOrder.cash_register_id, pendingOrder.user_id, totalAmount],
      );
      const sale = saleResult.rows[0];

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

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};
