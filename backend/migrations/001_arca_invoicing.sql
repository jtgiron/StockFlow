-- Migration: ARCA Electronic Invoicing support
-- Idempotent — safe to run multiple times

-- 1. Add invoice columns to sales table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'invoice_status'
  ) THEN
    ALTER TABLE sales ADD COLUMN invoice_status TEXT NOT NULL DEFAULT 'disabled'
      CHECK (invoice_status IN ('disabled', 'pending', 'success', 'failed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'invoice_cae'
  ) THEN
    ALTER TABLE sales ADD COLUMN invoice_cae TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'invoice_cae_expiry'
  ) THEN
    ALTER TABLE sales ADD COLUMN invoice_cae_expiry DATE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'invoice_number'
  ) THEN
    ALTER TABLE sales ADD COLUMN invoice_number INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'invoice_error'
  ) THEN
    ALTER TABLE sales ADD COLUMN invoice_error TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'invoice_retry_count'
  ) THEN
    ALTER TABLE sales ADD COLUMN invoice_retry_count INTEGER NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'invoice_emitted_at'
  ) THEN
    ALTER TABLE sales ADD COLUMN invoice_emitted_at TIMESTAMPTZ;
  END IF;
END $$;

-- 2. Partial index for failed invoices (retry sweep)
CREATE INDEX IF NOT EXISTS idx_sales_invoice_failed
  ON sales (invoice_status) WHERE invoice_status = 'failed';

-- 3. ARCA WSAA token cache table
CREATE TABLE IF NOT EXISTS arca_tokens (
  id SERIAL PRIMARY KEY,
  service TEXT NOT NULL DEFAULT 'wsfe',
  token TEXT NOT NULL,
  sign TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(service)
);
