CREATE TABLE IF NOT EXISTS local_password_reset_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by_user_id UUID REFERENCES users(id),
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_local_password_reset_codes_user_id
  ON local_password_reset_codes(user_id);

CREATE INDEX IF NOT EXISTS idx_local_password_reset_codes_code_hash
  ON local_password_reset_codes(code_hash);