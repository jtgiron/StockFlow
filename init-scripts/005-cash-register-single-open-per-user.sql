-- Prevent race conditions: a user can have only one open cash register at a time.
CREATE UNIQUE INDEX IF NOT EXISTS uq_cash_registers_single_open_per_user
ON cash_registers (user_id)
WHERE status = 'open';
