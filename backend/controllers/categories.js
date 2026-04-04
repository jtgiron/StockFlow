// backend/controllers/categories.js
import { query } from "../database.js";
import { AppError } from "../utils/errors.js";

export const getAllCategories = async (req, res, next) => {
  try {
    const result = await query("SELECT * FROM categories ORDER BY name");
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

export const getCategoryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query("SELECT * FROM categories WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      throw new AppError(404, "Categoría no encontrada");
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

export const createCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      throw new AppError(400, "El nombre es obligatorio");
    }

    const result = await query(
      "INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING *",
      [name.trim(), description || null],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return next(new AppError(409, "La categoría ya existe"));
    }
    next(err);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      throw new AppError(400, "El nombre es obligatorio");
    }

    const result = await query(
      "UPDATE categories SET name = $1, description = $2 WHERE id = $3 RETURNING *",
      [name.trim(), description ?? null, id],
    );

    if (result.rows.length === 0) {
      throw new AppError(404, "Categoría no encontrada");
    }
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return next(new AppError(409, "La categoría ya existe"));
    }
    next(err);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if any products reference this category
    const products = await query(
      "SELECT id FROM products WHERE category_id = $1 LIMIT 1",
      [id],
    );
    if (products.rows.length > 0) {
      throw new AppError(
        400,
        "No se puede eliminar: tiene productos asociados",
      );
    }

    const result = await query(
      "DELETE FROM categories WHERE id = $1 RETURNING id",
      [id],
    );

    if (result.rows.length === 0) {
      throw new AppError(404, "Categoría no encontrada");
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
