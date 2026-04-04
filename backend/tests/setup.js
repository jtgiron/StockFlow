// backend/tests/setup.js — Test helpers and DB seeding
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env") });

import { createApp } from "../app.js";
import { getPool, query } from "../database.js";
import { hashPassword, generateAccessToken } from "../utils/auth.js";

export const app = createApp({ enableRateLimit: false });

/**
 * Create a test user and return their auth token + user data.
 */
export async function createTestUser(role = "admin") {
  const email = `test-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`;
  const passwordHash = await hashPassword("Test1234");

  const result = await query(
    `INSERT INTO users (email, password_hash, full_name, role, is_active)
     VALUES ($1, $2, $3, $4, true)
     RETURNING id, email, full_name, role`,
    [email, passwordHash, `Test User ${role}`, role],
  );

  const user = result.rows[0];
  const token = generateAccessToken(user);
  return { user, token };
}

/**
 * Create a test product and return it.
 */
export async function createTestProduct(overrides = {}) {
  const defaults = {
    name: `Test Product ${Date.now()}`,
    barcode: `BAR-${Date.now()}`,
    cost_price: 50,
    sell_price: 100,
    stock_quantity: 100,
    min_stock_alert: 5,
    is_active: true,
  };
  const data = { ...defaults, ...overrides };

  const result = await query(
    `INSERT INTO products (name, barcode, cost_price, sell_price, stock_quantity, min_stock_alert, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [data.name, data.barcode, data.cost_price, data.sell_price, data.stock_quantity, data.min_stock_alert, data.is_active],
  );
  return result.rows[0];
}

/**
 * Open a cash register for a user and return it.
 */
export async function openTestCashRegister(userId, amount = 1000) {
  const result = await query(
    `INSERT INTO cash_registers (user_id, opening_cash_amount, status)
     VALUES ($1, $2, 'open') RETURNING *`,
    [userId, amount],
  );
  return result.rows[0];
}

/**
 * Create a test price list in draft status.
 */
export async function createTestPriceList(name) {
  const result = await query(
    "INSERT INTO price_lists (name) VALUES ($1) RETURNING *",
    [name || `Test List ${Date.now()}`],
  );
  return result.rows[0];
}

/**
 * Clean up test data. Call in afterAll.
 */
export async function cleanup() {
  const pool = getPool();
  await pool.end();
}
