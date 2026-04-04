-- Normalize cash_registers amount columns to snake_case while preserving legacy data.

ALTER TABLE cash_registers
ADD COLUMN IF NOT EXISTS opening_cash_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS closing_cash_amount NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS closing_qr_amount NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS expected_cash_amount NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS expected_qr_amount NUMERIC(12,2);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'cash_registers'
      AND column_name = 'openingcash_amount'
  ) THEN
    EXECUTE 'UPDATE cash_registers
             SET opening_cash_amount = COALESCE(opening_cash_amount, openingcash_amount)
             WHERE openingcash_amount IS NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'cash_registers'
      AND column_name = 'closingcash_amount'
  ) THEN
    EXECUTE 'UPDATE cash_registers
             SET closing_cash_amount = COALESCE(closing_cash_amount, closingcash_amount)
             WHERE closingcash_amount IS NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'cash_registers'
      AND column_name = 'closingqr_amount'
  ) THEN
    EXECUTE 'UPDATE cash_registers
             SET closing_qr_amount = COALESCE(closing_qr_amount, closingqr_amount)
             WHERE closingqr_amount IS NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'cash_registers'
      AND column_name = 'expectedcash_amount'
  ) THEN
    EXECUTE 'UPDATE cash_registers
             SET expected_cash_amount = COALESCE(expected_cash_amount, expectedcash_amount)
             WHERE expectedcash_amount IS NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'cash_registers'
      AND column_name = 'expectedqr_amount'
  ) THEN
    EXECUTE 'UPDATE cash_registers
             SET expected_qr_amount = COALESCE(expected_qr_amount, expectedqr_amount)
             WHERE expectedqr_amount IS NOT NULL';
  END IF;
END $$;
