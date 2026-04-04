import { z } from "zod/v4";

export const createProductSchema = z.object({
  barcode: z.string().trim().optional().nullable(),
  barcodes: z.array(z.string().trim()).optional(),
  name: z.string({ error: "El nombre es obligatorio" }).trim().min(1, "El nombre no puede estar vacío"),
  description: z.string().trim().optional().nullable(),
  category_id: z.number().int().positive().optional().nullable(),
  category_name: z.string().trim().optional(),
  cost_price: z.number().nonnegative("El precio de costo debe ser >= 0").default(0),
  sell_price: z.number().nonnegative("El precio de venta debe ser >= 0").default(0),
  stock_quantity: z.number().int().nonnegative("El stock debe ser >= 0").default(0),
  min_stock_alert: z.number().int().nonnegative("El stock mínimo debe ser >= 0").default(0),
  is_active: z.boolean().default(true),
  image_url: z.string().trim().optional().nullable(),
});

export const updateProductSchema = createProductSchema.partial();

export const bulkCreateProductsSchema = z.object({
  products: z.array(createProductSchema).min(1, "Se requiere al menos un producto"),
});
