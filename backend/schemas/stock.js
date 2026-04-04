import { z } from "zod/v4";

export const createMovementSchema = z.object({
  product_id: z.number({ error: "product_id es obligatorio" }).int().positive(),
  movement_type: z.enum(["entry", "exit", "adjustment"], {
    error: "movement_type debe ser entry, exit o adjustment",
  }),
  quantity: z.number({ error: "quantity es obligatorio" }).int().positive("quantity debe ser un entero positivo"),
  reason: z.string().trim().optional().nullable(),
});
