import { z } from "zod/v4";

export const createListSchema = z.object({
  name: z.string({ error: "El nombre es obligatorio" }).trim().min(1, "El nombre no puede estar vacío"),
});

export const addItemSchema = z.object({
  product_id: z.number({ error: "product_id es obligatorio" }).int().positive(),
  new_price: z.number({ error: "new_price es obligatorio" }).nonnegative("El precio debe ser >= 0"),
});
