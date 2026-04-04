import { z } from "zod/v4";

export const openRegisterSchema = z.object({
  opening_cash_amount: z.number().nonnegative("El monto inicial no puede ser negativo").default(0),
});

export const closeRegisterSchema = z.object({
  closing_cash_amount: z.number().nonnegative("El monto de cierre en efectivo no puede ser negativo").default(0),
  closing_qr_amount: z.number().nonnegative("El monto de cierre QR no puede ser negativo").default(0),
  notes: z.string().trim().optional().nullable(),
});
