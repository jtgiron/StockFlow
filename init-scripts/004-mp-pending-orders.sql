-- Mercado Pago pending orders: buffer between MP order creation and webhook confirmation
CREATE TABLE IF NOT EXISTS mp_pending_orders (
  id SERIAL PRIMARY KEY,
  external_reference VARCHAR(64) UNIQUE NOT NULL,
  mp_order_id VARCHAR(64),
  cash_register_id INTEGER REFERENCES cash_registers(id),
  user_id UUID REFERENCES users(id),
  items JSONB NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mp_pending_orders_external_ref ON mp_pending_orders(external_reference);
CREATE INDEX IF NOT EXISTS idx_mp_pending_orders_status ON mp_pending_orders(status);
