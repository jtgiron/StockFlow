// backend/controllers/credits.js
import { query } from "../database.js";
import { withTransaction } from "../utils/db.js";
import { AppError } from "../utils/errors.js";

// ============ Credit Accounts ============

export const getAccounts = async (req, res, next) => {
  try {
    const result = await query(
      "SELECT * FROM credit_accounts ORDER BY customer_name",
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

export const createAccount = async (req, res, next) => {
  try {
    const { customer_name, phone } = req.body;

    const result = await query(
      `INSERT INTO credit_accounts (customer_name, phone)
       VALUES ($1, $2) RETURNING *`,
      [customer_name, phone || null],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

export const updateAccount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { customer_name, phone } = req.body;

    const fields = [];
    const values = [];
    let idx = 1;

    if (customer_name !== undefined) {
      fields.push(`customer_name = $${idx++}`);
      values.push(customer_name);
    }

    if (phone !== undefined) {
      fields.push(`phone = $${idx++}`);
      values.push(phone || null);
    }

    if (fields.length === 0) {
      throw new AppError(400, "No se enviaron campos para actualizar");
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE credit_accounts SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      throw new AppError(404, "Cuenta no encontrada");
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

export const toggleAccountActive = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE credit_accounts SET is_active = NOT is_active, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id],
    );

    if (result.rows.length === 0) {
      throw new AppError(404, "Cuenta no encontrada");
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

// ============ Credit Transactions ============

export const getTransactions = async (req, res, next) => {
  try {
    const { accountId } = req.params;
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 200);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);

    const countResult = await query(
      "SELECT COUNT(*) FROM credit_transactions WHERE credit_account_id = $1",
      [accountId],
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT ct.*,
              json_build_object('id', u.id, 'full_name', u.full_name, 'role', u.role) AS profile
       FROM credit_transactions ct
       JOIN users u ON u.id = ct.user_id
       WHERE ct.credit_account_id = $1
       ORDER BY ct.created_at DESC
       LIMIT $2 OFFSET $3`,
      [accountId, limit, offset],
    );

    res.json({ items: result.rows, total });
  } catch (err) {
    next(err);
  }
};

export const addPayment = async (req, res, next) => {
  try {
    const { accountId } = req.params;
    const userId = req.user.id;
    const { amount, notes } = req.body;

    const result = await withTransaction(async (txQuery) => {
      // Verify account exists and is active
      const account = await txQuery(
        "SELECT * FROM credit_accounts WHERE id = $1",
        [accountId],
      );
      if (account.rows.length === 0) {
        throw new AppError(404, "Cuenta no encontrada");
      }
      if (!account.rows[0].is_active) {
        throw new AppError(400, "La cuenta está inactiva");
      }

      // Insert payment transaction
      const tx = await txQuery(
        `INSERT INTO credit_transactions (credit_account_id, amount, type, notes, user_id)
         VALUES ($1, $2, 'payment', $3, $4) RETURNING *`,
        [accountId, amount, notes || "Pago de deuda", userId],
      );

      // Update balance
      await txQuery(
        "UPDATE credit_accounts SET balance = balance - $1, updated_at = NOW() WHERE id = $2",
        [amount, accountId],
      );

      return tx.rows[0];
    });

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};
