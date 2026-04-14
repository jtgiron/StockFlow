// backend/controllers/products.js
import { query } from "../database.js";
import { AppError } from "../utils/errors.js";

const PRODUCT_UPDATE_FIELDS = {
  barcode: "barcode",
  barcodes: "barcodes",
  name: "name",
  description: "description",
  categoryId: "category_id",
  category_id: "category_id",
  costPrice: "cost_price",
  cost_price: "cost_price",
  sellPrice: "sell_price",
  sell_price: "sell_price",
  stockQuantity: "stock_quantity",
  stock_quantity: "stock_quantity",
  minStockAlert: "min_stock_alert",
  min_stock_alert: "min_stock_alert",
  isActive: "is_active",
  is_active: "is_active",
  imageUrl: "image_url",
  image_url: "image_url",
  sellByWeight: "sell_by_weight",
  sell_by_weight: "sell_by_weight",
};

function normalizeNullableString(value) {
  if (value == null) return null;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function normalizeProductUpdate(body) {
  const normalized = {};

  for (const [key, rawValue] of Object.entries(body ?? {})) {
    const field = PRODUCT_UPDATE_FIELDS[key];

    if (!field) continue;

    switch (field) {
      case "name": {
        if (typeof rawValue !== "string" || rawValue.trim() === "") {
          return { error: "El nombre no puede estar vacio" };
        }
        normalized[field] = rawValue.trim();
        break;
      }

      case "barcode":
      case "description":
      case "image_url": {
        normalized[field] = normalizeNullableString(rawValue);
        break;
      }

      case "barcodes": {
        if (rawValue == null) {
          normalized[field] = [];
          break;
        }
        if (!Array.isArray(rawValue)) {
          return { error: "barcodes debe ser un arreglo de textos" };
        }
        normalized[field] = rawValue
          .filter((value) => value != null)
          .map((value) => String(value).trim())
          .filter(Boolean);
        break;
      }

      case "category_id": {
        if (rawValue === null || rawValue === "") {
          normalized[field] = null;
          break;
        }
        const categoryId = Number(rawValue);
        if (!Number.isInteger(categoryId) || categoryId < 1) {
          return { error: "category_id debe ser un entero valido o null" };
        }
        normalized[field] = categoryId;
        break;
      }

      case "cost_price":
      case "sell_price": {
        const price = Number(rawValue);
        if (Number.isNaN(price) || price < 0) {
          return { error: `${field} debe ser un numero mayor o igual a 0` };
        }
        normalized[field] = price;
        break;
      }

      case "stock_quantity":
      case "min_stock_alert": {
        const quantity = Number(rawValue);
        if (!Number.isInteger(quantity) || quantity < 0) {
          return { error: `${field} debe ser un entero mayor o igual a 0` };
        }
        normalized[field] = quantity;
        break;
      }

      case "is_active":
      case "sell_by_weight": {
        if (typeof rawValue !== "boolean") {
          return { error: `${field} debe ser booleano` };
        }
        normalized[field] = rawValue;
        break;
      }

      default:
        break;
    }
  }

  return { data: normalized };
}

function normalizeProductCreate(body) {
  const { data, error } = normalizeProductUpdate(body);

  if (error) {
    return { error };
  }

  if (!data.name) {
    return { error: "El nombre es obligatorio" };
  }

  const normalized = {
    barcode: data.barcode ?? null,
    barcodes: Array.isArray(data.barcodes) ? data.barcodes : [],
    name: data.name,
    description: data.description ?? null,
    category_id: Object.prototype.hasOwnProperty.call(data, "category_id")
      ? data.category_id
      : null,
    cost_price: data.cost_price ?? 0,
    sell_price: data.sell_price ?? 0,
    stock_quantity: data.stock_quantity ?? 0,
    min_stock_alert: data.min_stock_alert ?? 0,
    is_active: data.is_active ?? true,
    image_url: data.image_url ?? null,
    sell_by_weight: data.sell_by_weight ?? false,
  };

  if (!normalized.barcode && normalized.barcodes.length > 0) {
    normalized.barcode = normalized.barcodes[0];
  }

  if (normalized.barcode && normalized.barcodes.length === 0) {
    normalized.barcodes = [normalized.barcode];
  }

  return { data: normalized };
}

export const getAllProducts = async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 200);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";
    const onlyActive = String(req.query.only_active) === "true";

    const conditions = [];
    const params = [];

    if (onlyActive) {
      conditions.push("is_active = true");
    }

    if (search) {
      params.push(`%${search}%`);
      const searchParam = `$${params.length}`;
      conditions.push(
        `(name ILIKE ${searchParam}
          OR barcode ILIKE ${searchParam}
          OR EXISTS (
            SELECT 1
            FROM unnest(COALESCE(barcodes, ARRAY[]::text[])) AS b(code)
            WHERE b.code ILIKE ${searchParam}
          ))`,
      );
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const countResult = await query(
      `SELECT COUNT(*) FROM products ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count);

    const pagingParams = [...params, limit, offset];
    const limitParam = `$${pagingParams.length - 1}`;
    const offsetParam = `$${pagingParams.length}`;

    const result = await query(
      `SELECT *
         FROM products
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT ${limitParam} OFFSET ${offsetParam}`,
      pagingParams,
    );

    res.json({ items: result.rows, total, limit, offset });
  } catch (err) {
    next(err);
  }
};

export const getProductById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const result = await query("SELECT * FROM products WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      throw new AppError(404, "Producto no encontrado");
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

export const createProduct = async (req, res, next) => {
  const { data, error } = normalizeProductCreate(req.body);

  if (error) {
    return next(new AppError(400, error));
  }

  try {
    const result = await query(
      `INSERT INTO products (
        barcode,
        barcodes,
        name,
        description,
        category_id,
        cost_price,
        sell_price,
        stock_quantity,
        min_stock_alert,
        is_active,
        image_url,
        sell_by_weight
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        data.barcode,
        data.barcodes,
        data.name,
        data.description,
        data.category_id,
        data.cost_price,
        data.sell_price,
        data.stock_quantity,
        data.min_stock_alert,
        data.is_active,
        data.image_url,
        data.sell_by_weight,
      ],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

export const updateProduct = async (req, res, next) => {
  const { id } = req.params;
  const productId = Number(id);

  if (!Number.isInteger(productId) || productId < 1) {
    return next(new AppError(400, "ID de producto invalido"));
  }

  const { data, error } = normalizeProductUpdate(req.body);

  if (error) {
    return next(new AppError(400, error));
  }

  const fieldsToUpdate = Object.entries(data);

  if (fieldsToUpdate.length === 0) {
    return next(new AppError(400, "No se enviaron campos para actualizar"));
  }

  try {
    const setClauses = fieldsToUpdate.map(
      ([field], index) => `${field} = $${index + 1}`,
    );
    const values = fieldsToUpdate.map(([, value]) => value);

    const result = await query(
      `UPDATE products SET ${setClauses.join(", ")}, updated_at = NOW() WHERE id = $${values.length + 1} RETURNING *`,
      [...values, productId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

// Search product by barcode (primary or in barcodes array)
export const getProductByBarcode = async (req, res, next) => {
  const { barcode } = req.params;
  try {
    const result = await query(
      `SELECT * FROM products
       WHERE (barcode = $1 OR $1 = ANY(barcodes))
         AND is_active = true
       LIMIT 1`,
      [barcode.trim()],
    );
    if (result.rows.length === 0) {
      throw new AppError(404, "Producto no encontrado");
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

// Toggle active/inactive
export const toggleProductActive = async (req, res, next) => {
  const { id } = req.params;
  try {
    const result = await query(
      `UPDATE products SET is_active = NOT is_active, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id],
    );
    if (result.rows.length === 0) {
      throw new AppError(404, "Producto no encontrado");
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

// Soft delete (set inactive) or hard delete if no references
export const deleteProduct = async (req, res, next) => {
  const { id } = req.params;
  try {
    // Check for related sale_items or stock_movements
    const refs = await query(
      `SELECT
        (SELECT COUNT(*) FROM sale_items WHERE product_id = $1)::int AS sales,
        (SELECT COUNT(*) FROM stock_movements WHERE product_id = $1)::int AS movements`,
      [id],
    );
    const { sales, movements } = refs.rows[0];

    if (sales > 0 || movements > 0) {
      // Soft delete
      const result = await query(
        "UPDATE products SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id",
        [id],
      );
      if (result.rows.length === 0) {
        throw new AppError(404, "Producto no encontrado");
      }
      return res.status(204).send();
    }

    // Hard delete
    const result = await query(
      "DELETE FROM products WHERE id = $1 RETURNING id",
      [id],
    );
    if (result.rows.length === 0) {
      throw new AppError(404, "Producto no encontrado");
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// Bulk create products (best-effort: each row is independent)
export const bulkCreateProducts = async (req, res, next) => {
  const { products } = req.body;

  if (!Array.isArray(products) || products.length === 0) {
    return next(new AppError(400, "Se requiere un array de productos"));
  }

  try {
    const details = [];

    for (let i = 0; i < products.length; i++) {
      const raw = products[i];

      try {
        const { data, error } = normalizeProductCreate(raw);

        if (error) {
          details.push({ row: i + 1, name: raw.name || "?", success: false, error });
          continue;
        }

        // Resolve category by name if provided
        let categoryId = data.category_id;
        if (!categoryId && raw.category_name) {
          const catResult = await query(
            "SELECT id FROM categories WHERE LOWER(name) = LOWER($1)",
            [raw.category_name.trim()],
          );
          if (catResult.rows.length > 0) {
            categoryId = catResult.rows[0].id;
          }
        }

        const result = await query(
          `INSERT INTO products (barcode, barcodes, name, description, category_id, cost_price, sell_price, stock_quantity, min_stock_alert, is_active, image_url, sell_by_weight)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
          [
            data.barcode,
            data.barcodes,
            data.name,
            data.description,
            categoryId,
            data.cost_price,
            data.sell_price,
            data.stock_quantity,
            data.min_stock_alert,
            data.is_active,
            data.image_url,
            data.sell_by_weight,
          ],
        );

        details.push({ row: i + 1, name: data.name, success: true });
      } catch (rowErr) {
        details.push({
          row: i + 1,
          name: raw.name || "?",
          success: false,
          error: rowErr.message,
        });
      }
    }

    const created = details.filter((d) => d.success).length;
    const failed = details.filter((d) => !d.success).length;
    const total = products.length;

    const status = failed === total ? 400 : created === total ? 201 : 200;

    res.status(status).json({ created, failed, total, details });
  } catch (err) {
    next(err);
  }
};
