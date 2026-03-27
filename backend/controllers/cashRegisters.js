// backend/controllers/cashRegisters.js
import { query } from "../database.js";
import { AppError } from "../utils/errors.js";

export const getCurrent = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await query(
      `SELECT cr.*,
              json_build_object('id', u.id, 'full_name', u.full_name, 'role', u.role) AS user
       FROM cash_registers cr
       JOIN users u ON u.id = cr.user_id
       WHERE cr.user_id = $1 AND cr.status = 'open'
       ORDER BY cr.opened_at DESC LIMIT 1`,
      [userId],
    );

    if (result.rows.length === 0) {
      return res.json(null);
    }

    const row = result.rows[0];
    res.json(mapRegister(row));
  } catch (err) {
    next(err);
  }
};

export const openRegister = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { opening_cash_amount, openingcash_amount } = req.body;
    const amount = parseFloat(opening_cash_amount ?? openingcash_amount ?? 0);

    // Check if user already has an open register
    const existing = await query(
      "SELECT id FROM cash_registers WHERE user_id = $1 AND status = 'open'",
      [userId],
    );
    if (existing.rows.length > 0) {
      throw new AppError(400, "Ya tienes una caja abierta");
    }

    const result = await query(
      `INSERT INTO cash_registers (user_id, opening_cash_amount, status)
       VALUES ($1, $2, 'open') RETURNING *`,
      [userId, amount],
    );

    res.status(201).json(mapRegister(result.rows[0]));
  } catch (err) {
    next(err);
  }
};

export const closeRegister = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const {
      closing_cash_amount,
      closingcash_amount,
      closing_qr_amount,
      closingqr_amount,
      notes,
    } = req.body;

    const cashAmount = parseFloat(
      closing_cash_amount ?? closingcash_amount ?? 0,
    );
    const qrAmount = parseFloat(closing_qr_amount ?? closingqr_amount ?? 0);

    // Verify register belongs to user and is open
    const regResult = await query(
      "SELECT * FROM cash_registers WHERE id = $1 AND status = 'open'",
      [id],
    );
    if (regResult.rows.length === 0) {
      throw new AppError(404, "Caja no encontrada o ya cerrada");
    }

    const register = regResult.rows[0];

    // Only admin or the same user can close
    if (register.user_id !== userId && req.user.role !== "admin") {
      throw new AppError(403, "No tienes permiso para cerrar esta caja");
    }

    // Calculate expected amounts from sales in this register
    const salesResult = await query(
      `SELECT
         COALESCE(SUM(CASE WHEN sp.payment_method = 'cash' THEN sp.amount ELSE 0 END), 0) AS expected_cash,
         COALESCE(SUM(CASE WHEN sp.payment_method IN ('qr','mercadopago') THEN sp.amount ELSE 0 END), 0) AS expected_qr
       FROM sales s
       JOIN sale_payments sp ON sp.sale_id = s.id
       WHERE s.cash_register_id = $1 AND s.status = 'completed'`,
      [id],
    );

    const expectedCash =
      parseFloat(salesResult.rows[0].expected_cash) +
      register.opening_cash_amount;
    const expectedQr = parseFloat(salesResult.rows[0].expected_qr);
    const difference = cashAmount + qrAmount - (expectedCash + expectedQr);

    const result = await query(
      `UPDATE cash_registers
       SET closed_at = NOW(),
           closing_cash_amount = $1,
           closing_qr_amount = $2,
           expected_cash_amount = $3,
           expected_qr_amount = $4,
           difference = $5,
           status = 'closed',
           notes = $6
       WHERE id = $7
       RETURNING *`,
      [
        cashAmount,
        qrAmount,
        expectedCash,
        expectedQr,
        difference,
        notes || null,
        id,
      ],
    );

    res.json(mapRegister(result.rows[0]));
  } catch (err) {
    next(err);
  }
};

export const getHistory = async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 200);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);

    const countResult = await query("SELECT COUNT(*) FROM cash_registers");
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT cr.*,
              json_build_object('id', u.id, 'full_name', u.full_name, 'role', u.role) AS user
       FROM cash_registers cr
       JOIN users u ON u.id = cr.user_id
       ORDER BY cr.opened_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    );

    res.json({
      items: result.rows.map(mapRegister),
      total,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Map DB column names to the format expected by frontend
 */
function mapRegister(row) {
  if (!row) return row;
  return {
    id: row.id,
    user_id: row.user_id,
    opened_at: row.opened_at,
    closed_at: row.closed_at,
    openingcash_amount: parseFloat(row.opening_cash_amount ?? 0),
    closingcash_amount:
      row.closing_cash_amount != null
        ? parseFloat(row.closing_cash_amount)
        : null,
    closingqr_amount:
      row.closing_qr_amount != null ? parseFloat(row.closing_qr_amount) : null,
    expectedcash_amount:
      row.expected_cash_amount != null
        ? parseFloat(row.expected_cash_amount)
        : null,
    expectedqr_amount:
      row.expected_qr_amount != null
        ? parseFloat(row.expected_qr_amount)
        : null,
    difference: row.difference != null ? parseFloat(row.difference) : null,
    status: row.status,
    notes: row.notes,
    profile: row.user ?? undefined,
    user: row.user ?? undefined,
  };
}
