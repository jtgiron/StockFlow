// backend/controllers/stock.js
import { query } from "../database.js";
import { withTransaction } from "../utils/db.js";
import { AppError } from "../utils/errors.js";

const VALID_MOVEMENT_TYPES = new Set(["entry", "exit", "adjustment"]);

export const getMovements = async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 200);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);

    const countResult = await query("SELECT COUNT(*) FROM stock_movements");
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT sm.*,
              row_to_json(p) AS product,
              json_build_object('id', u.id, 'full_name', u.full_name, 'role', u.role) AS user
       FROM stock_movements sm
       JOIN products p ON p.id = sm.product_id
       JOIN users u ON u.id = sm.user_id
       ORDER BY sm.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    );

    res.json({ items: result.rows, total });
  } catch (err) {
    next(err);
  }
};

export const createMovement = async (req, res, next) => {
  try {
    const { product_id, movement_type, quantity, reason } = req.body;
    const userId = req.user.id;

    if (!product_id || !movement_type || quantity == null) {
      throw new AppError(
        400,
        "product_id, movement_type y quantity son obligatorios",
      );
    }

    if (!VALID_MOVEMENT_TYPES.has(movement_type)) {
      throw new AppError(
        400,
        "movement_type debe ser entry, exit o adjustment",
      );
    }

    const qty = parseInt(quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new AppError(400, "quantity debe ser un entero positivo");
    }

    const result = await withTransaction(async (txQuery) => {
      // Verify product exists
      const product = await txQuery(
        "SELECT id, stock_quantity FROM products WHERE id = $1",
        [product_id],
      );
      if (product.rows.length === 0) {
        throw new AppError(404, "Producto no encontrado");
      }

      const currentStock = product.rows[0].stock_quantity;
      let newStock;

      switch (movement_type) {
        case "entry":
          newStock = currentStock + qty;
          break;
        case "exit":
          if (currentStock < qty) {
            throw new AppError(400, "Stock insuficiente");
          }
          newStock = currentStock - qty;
          break;
        case "adjustment":
          // For adjustment, quantity IS the new stock level
          newStock = qty;
          break;
      }

      // Update product stock
      await txQuery(
        "UPDATE products SET stock_quantity = $1, updated_at = NOW() WHERE id = $2",
        [newStock, product_id],
      );

      // Insert movement record
      const movement = await txQuery(
        `INSERT INTO stock_movements (product_id, movement_type, quantity, reason, user_id)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [product_id, movement_type, qty, reason || null, userId],
      );

      return movement.rows[0];
    });

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

export const getLowStock = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT * FROM products
       WHERE is_active = true
         AND stock_quantity <= min_stock_alert
         AND min_stock_alert > 0
       ORDER BY stock_quantity ASC`,
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};
