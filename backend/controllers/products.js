// backend/controllers/products.js
import { query } from "../database.js";

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

      case "is_active": {
        if (typeof rawValue !== "boolean") {
          return { error: "is_active debe ser booleano" };
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
  };

  if (!normalized.barcode && normalized.barcodes.length > 0) {
    normalized.barcode = normalized.barcodes[0];
  }

  if (normalized.barcode && normalized.barcodes.length === 0) {
    normalized.barcodes = [normalized.barcode];
  }

  return { data: normalized };
}

export const getAllProducts = async (req, res) => {
  try {
    const result = await query("SELECT * FROM products");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getProductById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query("SELECT * FROM products WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createProduct = async (req, res) => {
  const { data, error } = normalizeProductCreate(req.body);

  if (error) {
    return res.status(400).json({ message: error });
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
        image_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
      ],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateProduct = async (req, res) => {
  const { id } = req.params;
  const productId = Number(id);

  if (!Number.isInteger(productId) || productId < 1) {
    return res.status(400).json({ message: "ID de producto invalido" });
  }

  const { data, error } = normalizeProductUpdate(req.body);

  if (error) {
    return res.status(400).json({ message: error });
  }

  const fieldsToUpdate = Object.entries(data);

  if (fieldsToUpdate.length === 0) {
    return res
      .status(400)
      .json({ message: "No se enviaron campos para actualizar" });
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
    res.status(500).json({ message: err.message });
  }
};
