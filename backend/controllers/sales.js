// backend/controllers/sales.js
import { withTransaction } from "../utils/db.js";
import { query } from "../database.js";
import { AppError } from "../utils/errors.js";

export const createSale = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { cash_register_id, items, payments, credit_account_id } = req.body;

    const result = await withTransaction(async (txQuery) => {
      // Verify cash register is open
      const regCheck = await txQuery(
        "SELECT id, status FROM cash_registers WHERE id = $1",
        [cash_register_id],
      );
      if (regCheck.rows.length === 0 || regCheck.rows[0].status !== "open") {
        throw new AppError(400, "La caja no está abierta");
      }

      // Calculate total server-side from items
      let totalAmount = 0;

      // Insert items & update stock
      const itemsData = [];
      for (const item of items) {
        // Verify product exists and get authoritative price
        const productResult = await txQuery(
          "SELECT id, stock_quantity, name, sell_price FROM products WHERE id = $1",
          [item.product_id],
        );
        if (productResult.rows.length === 0) {
          throw new AppError(400, `Producto ${item.product_id} no encontrado`);
        }

        const product = productResult.rows[0];
        const qty = Number(item.quantity);
        if (!Number.isInteger(qty) || qty < 1) {
          throw new AppError(400, `Cantidad inválida para "${product.name}"`);
        }

        if (product.stock_quantity < qty) {
          throw new AppError(400, `Stock insuficiente para "${product.name}"`);
        }

        // Use client-sent unit_price if provided, otherwise use current sell_price
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

      // Create sale with server-calculated total
      const saleResult = await txQuery(
        `INSERT INTO sales (cash_register_id, user_id, total_amount, status)
         VALUES ($1, $2, $3, 'completed') RETURNING *`,
        [cash_register_id, userId, totalAmount],
      );
      const sale = saleResult.rows[0];

      for (const d of itemsData) {
        // Insert sale item
        await txQuery(
          `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal)
           VALUES ($1, $2, $3, $4, $5)`,
          [sale.id, d.product_id, d.quantity, d.unitPrice, d.subtotal],
        );

        // Deduct stock
        await txQuery(
          "UPDATE products SET stock_quantity = stock_quantity - $1, updated_at = NOW() WHERE id = $2",
          [d.quantity, d.product_id],
        );

        // Record stock movement
        await txQuery(
          `INSERT INTO stock_movements (product_id, movement_type, quantity, reason, user_id)
           VALUES ($1, 'exit', $2, $3, $4)`,
          [d.product_id, d.quantity, `Venta #${sale.id}`, userId],
        );
      }

      // Validate payments total matches sale total
      const paymentsTotal = payments.reduce(
        (sum, p) => sum + Number(p.amount || 0),
        0,
      );
      if (Math.abs(paymentsTotal - totalAmount) > 0.01) {
        throw new AppError(
          400,
          `El total de pagos (${paymentsTotal}) no coincide con el total de la venta (${totalAmount})`,
        );
      }

      // Insert payments
      for (const payment of payments) {
        await txQuery(
          `INSERT INTO sale_payments (sale_id, payment_method, amount, mp_payment_id)
           VALUES ($1, $2, $3, $4)`,
          [
            sale.id,
            payment.payment_method,
            payment.amount,
            payment.mp_payment_id || null,
          ],
        );
      }

      // Handle credit (fiado) payment
      const creditPayment = payments.find((p) => p.payment_method === "credit");
      if (creditPayment && credit_account_id) {
        await txQuery(
          `INSERT INTO credit_transactions (credit_account_id, sale_id, amount, type, notes, user_id)
           VALUES ($1, $2, $3, 'charge', $4, $5)`,
          [
            credit_account_id,
            sale.id,
            creditPayment.amount,
            `Venta #${sale.id}`,
            userId,
          ],
        );

        await txQuery(
          "UPDATE credit_accounts SET balance = balance + $1, updated_at = NOW() WHERE id = $2",
          [creditPayment.amount, credit_account_id],
        );
      }

      // Fetch complete sale with items and payments
      const fullSale = await txQuery(
        `SELECT s.*,
                json_build_object('id', u.id, 'full_name', u.full_name, 'role', u.role) AS profile
         FROM sales s
         JOIN users u ON u.id = s.user_id
         WHERE s.id = $1`,
        [sale.id],
      );

      const saleItems = await txQuery(
        `SELECT si.*, row_to_json(p) AS product
         FROM sale_items si
         JOIN products p ON p.id = si.product_id
         WHERE si.sale_id = $1`,
        [sale.id],
      );

      const salePayments = await txQuery(
        "SELECT * FROM sale_payments WHERE sale_id = $1",
        [sale.id],
      );

      return {
        ...fullSale.rows[0],
        sale_items: saleItems.rows,
        sale_payments: salePayments.rows,
      };
    });

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

export const getSales = async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 200);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);

    const countResult = await query("SELECT COUNT(*) FROM sales");
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT s.*,
              json_build_object('id', u.id, 'full_name', u.full_name, 'role', u.role) AS profile
       FROM sales s
       JOIN users u ON u.id = s.user_id
       ORDER BY s.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    );

    res.json({ items: result.rows, total });
  } catch (err) {
    next(err);
  }
};

export const getSaleById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const saleResult = await query(
      `SELECT s.*,
              json_build_object('id', u.id, 'full_name', u.full_name, 'role', u.role) AS profile
       FROM sales s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = $1`,
      [id],
    );

    if (saleResult.rows.length === 0) {
      throw new AppError(404, "Venta no encontrada");
    }

    const saleItems = await query(
      `SELECT si.*, row_to_json(p) AS product
       FROM sale_items si
       JOIN products p ON p.id = si.product_id
       WHERE si.sale_id = $1`,
      [id],
    );

    const salePayments = await query(
      "SELECT * FROM sale_payments WHERE sale_id = $1",
      [id],
    );

    res.json({
      ...saleResult.rows[0],
      sale_items: saleItems.rows,
      sale_payments: salePayments.rows,
    });
  } catch (err) {
    next(err);
  }
};
