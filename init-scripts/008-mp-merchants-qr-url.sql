-- Add QR image URL to mp_merchants (returned by MP when POS is created)
ALTER TABLE mp_merchants ADD COLUMN IF NOT EXISTS qr_image_url TEXT;
