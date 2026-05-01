-- Migration: invoice retry metadata
-- Idempotent — safe to run multiple times.
--
-- Adds invoice_last_attempt_at so the retry sweep can apply per-row
-- exponential backoff and recover invoices stuck in 'pending' after a
-- process crash. Replaces the failed-only partial index with one that
-- supports both 'failed' and 'pending' recovery scans.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'invoice_last_attempt_at'
  ) THEN
    ALTER TABLE sales ADD COLUMN invoice_last_attempt_at TIMESTAMPTZ;
  END IF;
END $$;

DROP INDEX IF EXISTS idx_sales_invoice_failed;

CREATE INDEX IF NOT EXISTS idx_sales_invoice_retry
  ON sales (invoice_status, invoice_last_attempt_at)
  WHERE invoice_status IN ('failed', 'pending');
