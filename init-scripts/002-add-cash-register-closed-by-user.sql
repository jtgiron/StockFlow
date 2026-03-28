ALTER TABLE cash_registers
ADD COLUMN IF NOT EXISTS closed_by_user_id UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_cash_registers_closed_by_user
ON cash_registers(closed_by_user_id);