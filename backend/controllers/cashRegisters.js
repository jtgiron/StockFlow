// backend/controllers/cashRegisters.js
import { query } from "../database.js";
import { AppError } from "../utils/errors.js";

const UUID_V4_OR_V1_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CASH_REGISTER_COLUMN_CANDIDATES = {
  opening: ["opening_cash_amount", "openingcash_amount"],
  closingCash: ["closing_cash_amount", "closingcash_amount"],
  closingQr: ["closing_qr_amount", "closingqr_amount"],
  expectedCash: ["expected_cash_amount", "expectedcash_amount"],
  expectedQr: ["expected_qr_amount", "expectedqr_amount"],
};

let cachedCashRegisterColumns = null;

async function getCashRegisterColumns() {
  if (cachedCashRegisterColumns) return cachedCashRegisterColumns;

  const allCandidates = Object.values(CASH_REGISTER_COLUMN_CANDIDATES).flat();
  const placeholders = allCandidates.map((_, idx) => `$${idx + 1}`).join(", ");
  const result = await query(
    `SELECT column_name
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'cash_registers'
        AND column_name IN (${placeholders})`,
    allCandidates,
  );

  const existing = new Set(result.rows.map((r) => r.column_name));
  const pick = (options, label) => {
    const found = options.find((col) => existing.has(col));
    if (!found) {
      throw new AppError(
        500,
        `Esquema incompatible en cash_registers: falta columna ${label}`,
      );
    }
    return found;
  };

  cachedCashRegisterColumns = {
    opening: pick(CASH_REGISTER_COLUMN_CANDIDATES.opening, "opening amount"),
    closingCash: pick(
      CASH_REGISTER_COLUMN_CANDIDATES.closingCash,
      "closing cash amount",
    ),
    closingQr: pick(
      CASH_REGISTER_COLUMN_CANDIDATES.closingQr,
      "closing qr amount",
    ),
    expectedCash: pick(
      CASH_REGISTER_COLUMN_CANDIDATES.expectedCash,
      "expected cash amount",
    ),
    expectedQr: pick(
      CASH_REGISTER_COLUMN_CANDIDATES.expectedQr,
      "expected qr amount",
    ),
  };

  return cachedCashRegisterColumns;
}

function parseNumericFromRow(row, ...keys) {
  for (const key of keys) {
    const value = row?.[key];
    if (value != null) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
}

export const getCurrent = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await query(
      `SELECT cr.*,
              json_build_object('id', opener.id, 'full_name', opener.full_name, 'role', opener.role) AS opened_by_user,
              CASE
                WHEN closer.id IS NULL THEN NULL
                ELSE json_build_object('id', closer.id, 'full_name', closer.full_name, 'role', closer.role)
              END AS closed_by_user
       FROM cash_registers cr
       JOIN users opener ON opener.id = cr.user_id
       LEFT JOIN users closer ON closer.id = cr.closed_by_user_id
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
    const columns = await getCashRegisterColumns();
    const userId = req.user?.id;
    const amount = req.body.opening_cash_amount;

    if (
      !userId ||
      typeof userId !== "string" ||
      !UUID_V4_OR_V1_REGEX.test(userId)
    ) {
      throw new AppError(401, "Sesion invalida. Inicia sesion nuevamente");
    }

    // Check if user already has an open register
    const existing = await query(
      "SELECT id FROM cash_registers WHERE user_id = $1 AND status = 'open'",
      [userId],
    );
    if (existing.rows.length > 0) {
      throw new AppError(400, "Ya tienes una caja abierta");
    }

    const result = await query(
      `INSERT INTO cash_registers (user_id, ${columns.opening}, status)
       VALUES ($1, $2, 'open') RETURNING *`,
      [userId, amount],
    );

    res.status(201).json(mapRegister(result.rows[0]));
  } catch (err) {
    console.error("openRegister error", {
      code: err?.code,
      message: err?.message,
      detail: err?.detail,
      hint: err?.hint,
      userId: req.user?.id,
      body: req.body,
    });

    if (err.code === "23505") {
      return next(new AppError(400, "Ya tienes una caja abierta"));
    }
    if (err.code === "22P02") {
      return next(new AppError(400, "El monto inicial es invalido"));
    }
    if (err.code === "23503") {
      return next(new AppError(401, "Sesion invalida. Inicia sesion nuevamente"));
    }
    if (err.code === "42P01") {
      return next(new AppError(500, "Falta la tabla cash_registers"));
    }
    next(err);
  }
};

export const closeRegister = async (req, res, next) => {
  try {
    const columns = await getCashRegisterColumns();
    const { id } = req.params;
    const userId = req.user.id;
    const { closing_cash_amount, closing_qr_amount, notes } = req.body;

    const cashAmount = closing_cash_amount;
    const qrAmount = closing_qr_amount;

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
      parseNumericFromRow(
        register,
        columns.opening,
        ...CASH_REGISTER_COLUMN_CANDIDATES.opening,
      );
    const expectedQr = parseFloat(salesResult.rows[0].expected_qr);
    const difference = cashAmount - expectedCash;

    const result = await query(
      `UPDATE cash_registers
       SET closed_at = NOW(),
           ${columns.closingCash} = $1,
           ${columns.closingQr} = $2,
           ${columns.expectedCash} = $3,
           ${columns.expectedQr} = $4,
           difference = $5,
           status = 'closed',
           notes = $6,
           closed_by_user_id = $7
       WHERE id = $8
       RETURNING *`,
      [
        cashAmount,
        qrAmount,
        expectedCash,
        expectedQr,
        difference,
        notes || null,
        userId,
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
              json_build_object('id', opener.id, 'full_name', opener.full_name, 'role', opener.role) AS opened_by_user,
              CASE
                WHEN closer.id IS NULL THEN NULL
                ELSE json_build_object('id', closer.id, 'full_name', closer.full_name, 'role', closer.role)
              END AS closed_by_user
       FROM cash_registers cr
       JOIN users opener ON opener.id = cr.user_id
       LEFT JOIN users closer ON closer.id = cr.closed_by_user_id
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
    closed_by_user_id: row.closed_by_user_id,
    opened_at: row.opened_at,
    closed_at: row.closed_at,
    openingcash_amount: parseNumericFromRow(
      row,
      "opening_cash_amount",
      "openingcash_amount",
    ),
    closingcash_amount:
      row.closing_cash_amount != null || row.closingcash_amount != null
        ? parseNumericFromRow(row, "closing_cash_amount", "closingcash_amount")
        : null,
    closingqr_amount:
      row.closing_qr_amount != null || row.closingqr_amount != null
        ? parseNumericFromRow(row, "closing_qr_amount", "closingqr_amount")
        : null,
    expectedcash_amount:
      row.expected_cash_amount != null || row.expectedcash_amount != null
        ? parseNumericFromRow(
            row,
            "expected_cash_amount",
            "expectedcash_amount",
          )
        : null,
    expectedqr_amount:
      row.expected_qr_amount != null || row.expectedqr_amount != null
        ? parseNumericFromRow(row, "expected_qr_amount", "expectedqr_amount")
        : null,
    difference: row.difference != null ? parseFloat(row.difference) : null,
    status: row.status,
    notes: row.notes,
    profile: row.opened_by_user ?? undefined,
    user: row.opened_by_user ?? undefined,
    opened_by_user: row.opened_by_user ?? undefined,
    closed_by_user: row.closed_by_user ?? undefined,
  };
}
