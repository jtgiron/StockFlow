-- 009: Soporte para productos vendidos por peso
-- - Agrega columna sell_by_weight a products
-- - Cambia quantity de INT a NUMERIC(12,3) en sale_items y stock_movements

ALTER TABLE products ADD COLUMN IF NOT EXISTS sell_by_weight BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE sale_items ALTER COLUMN quantity TYPE NUMERIC(12,3);

ALTER TABLE stock_movements ALTER COLUMN quantity TYPE NUMERIC(12,3);
