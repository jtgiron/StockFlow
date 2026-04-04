import { z } from "zod/v4";

const saleItemSchema = z.object({
  product_id: z.number({ error: "product_id debe ser un número" }).int().positive(),
  quantity: z.number({ error: "quantity debe ser un número" }).int().min(1, "La cantidad debe ser al menos 1"),
  unit_price: z.number().nonnegative().optional(),
});

const salePaymentSchema = z.object({
  payment_method: z.enum(["cash", "card", "qr", "mercadopago", "credit"], {
    error: "Método de pago inválido",
  }),
  amount: z.number({ error: "amount debe ser un número" }).positive("El monto debe ser mayor a 0"),
  mp_payment_id: z.string().optional(),
});

export const createSaleSchema = z.object({
  cash_register_id: z.string({ error: "cash_register_id es obligatorio" }).min(1),
  items: z.array(saleItemSchema).min(1, "Se requiere al menos un item"),
  payments: z.array(salePaymentSchema).min(1, "Se requiere al menos un pago"),
  credit_account_id: z.number().int().positive().optional(),
});
