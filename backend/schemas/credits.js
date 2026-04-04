import { z } from "zod/v4";

export const createAccountSchema = z.object({
  customer_name: z.string({ error: "customer_name es obligatorio" }).trim().min(1, "customer_name no puede estar vacío"),
  phone: z.string().trim().optional().nullable(),
});

export const updateAccountSchema = z.object({
  customer_name: z.string().trim().min(1, "customer_name no puede estar vacío").optional(),
  phone: z.string().trim().optional().nullable(),
}).refine(
  (data) => data.customer_name !== undefined || data.phone !== undefined,
  { message: "No se enviaron campos para actualizar" },
);

export const addPaymentSchema = z.object({
  amount: z.number({ error: "El monto es obligatorio" }).positive("El monto debe ser mayor a 0"),
  notes: z.string().trim().optional().nullable(),
});
