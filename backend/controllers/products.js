// backend/controllers/products.js
import { query } from '../database.js';

export const getAllProducts = async (req, res) => {
  try {
    const result = await query('SELECT * FROM products');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getProductById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query('SELECT * FROM products WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createProduct = async (req, res) => {
  const { name, price, stock } = req.body;
  try {
    const result = await query(
      'INSERT INTO products(name, price, stock) VALUES($1, $2, $3) RETURNING *',
      [name, price, stock]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};