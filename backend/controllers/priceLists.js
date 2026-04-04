// backend/controllers/priceLists.js
import { query } from "../database.js";
import { withTransaction } from "../utils/db.js";
import { AppError } from "../utils/errors.js";

// ============ Price Lists CRUD ============

export const getLists = async (req, res, next) => {
  try {
    const result = await query(
      "SELECT * FROM price_lists ORDER BY created_at DESC",
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

export const createList = async (req, res, next) => {
  try {
    const { name } = req.body;

    const result = await query(
      "INSERT INTO price_lists (name) VALUES ($1) RETURNING *",
      [name],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

export const updateList = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const result = await query(
      "UPDATE price_lists SET name = $1 WHERE id = $2 AND status = 'draft' RETURNING *",
      [name, id],
    );

    if (result.rows.length === 0) {
      throw new AppError(404, "Lista no encontrada o ya fue aplicada");
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

export const deleteList = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      "DELETE FROM price_lists WHERE id = $1 AND status = 'draft' RETURNING id",
      [id],
    );
    if (result.rows.length === 0) {
      throw new AppError(404, "Lista no encontrada o ya fue aplicada");
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// ============ Price List Items ============

export const getItems = async (req, res, next) => {
  try {
    const { listId } = req.params;
    const result = await query(
      `SELECT pli.*, row_to_json(p) AS product
       FROM price_list_items pli
       JOIN products p ON p.id = pli.product_id
       WHERE pli.price_list_id = $1
       ORDER BY p.name`,
      [listId],
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

export const addItem = async (req, res, next) => {
  try {
    const { listId } = req.params;
    const { product_id, new_price } = req.body;

    // Get current price
    const product = await query(
      "SELECT id, sell_price FROM products WHERE id = $1",
      [product_id],
    );
    if (product.rows.length === 0) {
      throw new AppError(404, "Producto no encontrado");
    }

    // Check list is draft
    const list = await query(
      "SELECT id FROM price_lists WHERE id = $1 AND status = 'draft'",
      [listId],
    );
    if (list.rows.length === 0) {
      throw new AppError(404, "Lista no encontrada o ya fue aplicada");
    }

    // Check for duplicate
    const existing = await query(
      "SELECT id FROM price_list_items WHERE price_list_id = $1 AND product_id = $2",
      [listId, product_id],
    );
    if (existing.rows.length > 0) {
      // Update existing item
      const result = await query(
        `UPDATE price_list_items SET new_price = $1, old_price = $2
         WHERE price_list_id = $3 AND product_id = $4 RETURNING *`,
        [new_price, product.rows[0].sell_price, listId, product_id],
      );
      return res.json(result.rows[0]);
    }

    const result = await query(
      `INSERT INTO price_list_items (price_list_id, product_id, old_price, new_price)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [listId, product_id, product.rows[0].sell_price, new_price],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

export const removeItem = async (req, res, next) => {
  try {
    const { listId, itemId } = req.params;
    const result = await query(
      "DELETE FROM price_list_items WHERE id = $1 AND price_list_id = $2 RETURNING id",
      [itemId, listId],
    );
    if (result.rows.length === 0) {
      throw new AppError(404, "Item no encontrado");
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// ============ Apply Price List ============

export const applyList = async (req, res, next) => {
  try {
    const { listId } = req.params;
    const userId = req.user.id;

    const result = await withTransaction(async (txQuery) => {
      // Verify list is draft
      const list = await txQuery(
        "SELECT * FROM price_lists WHERE id = $1 AND status = 'draft'",
        [listId],
      );
      if (list.rows.length === 0) {
        throw new AppError(404, "Lista no encontrada o ya fue aplicada");
      }

      // Get all items
      const items = await txQuery(
        "SELECT * FROM price_list_items WHERE price_list_id = $1",
        [listId],
      );

      if (items.rows.length === 0) {
        throw new AppError(400, "La lista no tiene items");
      }

      // Apply each price change
      for (const item of items.rows) {
        // Get current price for audit log
        const product = await txQuery(
          "SELECT sell_price FROM products WHERE id = $1",
          [item.product_id],
        );

        if (product.rows.length === 0) continue;

        const oldPrice = product.rows[0].sell_price;

        // Update product price
        await txQuery(
          "UPDATE products SET sell_price = $1, updated_at = NOW() WHERE id = $2",
          [item.new_price, item.product_id],
        );

        // Insert audit log
        await txQuery(
          `INSERT INTO price_change_log (product_id, price_list_id, old_price, new_price, changed_by)
           VALUES ($1, $2, $3, $4, $5)`,
          [item.product_id, listId, oldPrice, item.new_price, userId],
        );
      }

      // Mark list as applied
      const updated = await txQuery(
        `UPDATE price_lists SET status = 'applied', applied_at = NOW(), applied_by = $1
         WHERE id = $2 RETURNING *`,
        [userId, listId],
      );

      return updated.rows[0];
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
};
