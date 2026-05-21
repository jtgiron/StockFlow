-- Mercado Pago merchants connected via OAuth
CREATE TABLE IF NOT EXISTS mp_merchants (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  mp_user_id BIGINT NOT NULL UNIQUE,
  mp_access_token TEXT NOT NULL,
  mp_refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  merchant_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  mp_store_id TEXT,
  mp_external_store_id TEXT,
  mp_pos_id TEXT,
  mp_external_pos_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mp_merchants_active_updated_at
  ON mp_merchants(is_active, updated_at DESC);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'mp_pending_orders' AND column_name = 'merchant_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'mp_pending_orders_merchant_id_fkey'
  ) THEN
    ALTER TABLE mp_pending_orders
      ADD CONSTRAINT mp_pending_orders_merchant_id_fkey
      FOREIGN KEY (merchant_id) REFERENCES mp_merchants(id) ON DELETE SET NULL;
  END IF;
END $$;
