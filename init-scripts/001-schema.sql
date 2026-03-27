-- StockFlow Database Schema
-- Run this script to create all tables

-- ============================================================
-- USERS (already exists, ensure structure matches)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name     VARCHAR(255) NOT NULL,
  role          VARCHAR(20) NOT NULL DEFAULT 'employee' CHECK (role IN ('admin','employee')),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PRODUCTS (already exists, ensure structure matches)
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id              SERIAL PRIMARY KEY,
  barcode         VARCHAR(100),
  barcodes        TEXT[] DEFAULT '{}',
  name            VARCHAR(255) NOT NULL,
  description     TEXT,
  category_id     INT REFERENCES categories(id) ON DELETE SET NULL,
  cost_price      NUMERIC(12,2) NOT NULL DEFAULT 0,
  sell_price      NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock_quantity  INT NOT NULL DEFAULT 0,
  min_stock_alert INT NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  image_url       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);

-- ============================================================
-- STOCK MOVEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_movements (
  id            SERIAL PRIMARY KEY,
  product_id    INT NOT NULL REFERENCES products(id),
  movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('entry','exit','adjustment')),
  quantity      INT NOT NULL,
  reason        TEXT,
  user_id       UUID NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_user ON stock_movements(user_id);

-- ============================================================
-- CASH REGISTERS
-- ============================================================
CREATE TABLE IF NOT EXISTS cash_registers (
  id                    SERIAL PRIMARY KEY,
  user_id               UUID NOT NULL REFERENCES users(id),
  opened_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at             TIMESTAMPTZ,
  opening_cash_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,
  closing_cash_amount   NUMERIC(12,2),
  closing_qr_amount     NUMERIC(12,2),
  expected_cash_amount  NUMERIC(12,2),
  expected_qr_amount    NUMERIC(12,2),
  difference            NUMERIC(12,2),
  status                VARCHAR(10) NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cash_registers_user ON cash_registers(user_id);
CREATE INDEX IF NOT EXISTS idx_cash_registers_status ON cash_registers(status);

-- ============================================================
-- SALES
-- ============================================================
CREATE TABLE IF NOT EXISTS sales (
  id                SERIAL PRIMARY KEY,
  cash_register_id  INT NOT NULL REFERENCES cash_registers(id),
  user_id           UUID NOT NULL REFERENCES users(id),
  total_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  status            VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','cancelled','pending')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_register ON sales(cash_register_id);
CREATE INDEX IF NOT EXISTS idx_sales_user ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at);

-- ============================================================
-- SALE ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS sale_items (
  id          SERIAL PRIMARY KEY,
  sale_id     INT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id  INT NOT NULL REFERENCES products(id),
  quantity    INT NOT NULL,
  unit_price  NUMERIC(12,2) NOT NULL,
  subtotal    NUMERIC(12,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);

-- ============================================================
-- SALE PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS sale_payments (
  id              SERIAL PRIMARY KEY,
  sale_id         INT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  payment_method  VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash','card','qr','mercadopago','credit')),
  amount          NUMERIC(12,2) NOT NULL,
  mp_payment_id   VARCHAR(255),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sale_payments_sale ON sale_payments(sale_id);

-- ============================================================
-- CREDIT ACCOUNTS
-- ============================================================
CREATE TABLE IF NOT EXISTS credit_accounts (
  id            SERIAL PRIMARY KEY,
  customer_name VARCHAR(255) NOT NULL,
  phone         VARCHAR(50),
  balance       NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CREDIT TRANSACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS credit_transactions (
  id                SERIAL PRIMARY KEY,
  credit_account_id INT NOT NULL REFERENCES credit_accounts(id),
  sale_id           INT REFERENCES sales(id),
  amount            NUMERIC(12,2) NOT NULL,
  type              VARCHAR(10) NOT NULL CHECK (type IN ('charge','payment')),
  notes             TEXT,
  user_id           UUID NOT NULL REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_tx_account ON credit_transactions(credit_account_id);

-- ============================================================
-- PRICE LISTS
-- ============================================================
CREATE TABLE IF NOT EXISTS price_lists (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  applied_at  TIMESTAMPTZ,
  applied_by  UUID REFERENCES users(id),
  status      VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','applied')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PRICE LIST ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS price_list_items (
  id              SERIAL PRIMARY KEY,
  price_list_id   INT NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE,
  product_id      INT NOT NULL REFERENCES products(id),
  old_price       NUMERIC(12,2) NOT NULL DEFAULT 0,
  new_price       NUMERIC(12,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_price_list_items_list ON price_list_items(price_list_id);

-- ============================================================
-- PRICE CHANGE LOG (audit trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS price_change_log (
  id            SERIAL PRIMARY KEY,
  product_id    INT NOT NULL REFERENCES products(id),
  price_list_id INT REFERENCES price_lists(id),
  old_price     NUMERIC(12,2) NOT NULL,
  new_price     NUMERIC(12,2) NOT NULL,
  changed_by    UUID NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
