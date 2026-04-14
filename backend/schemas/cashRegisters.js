import { z } from "zod/v4";

// Accept both snake_case and legacy camelCase field names from frontend
const openingAmount = z.number().nonnegative("El monto inicial no puede ser negativo").default(0);

export const openRegisterSchema = z
  .object({
    opening_cash_amount: openingAmount.optional(),
    openingcash_amount: openingAmount.optional(),
  })
  .transform((data) => ({
    opening_cash_amount: data.opening_cash_amount ?? data.openingcash_amount ?? 0,
  }));

const closingCash = z.number().nonnegative("El monto de cierre en efectivo no puede ser negativo").default(0);
const closingQr = z.number().nonnegative("El monto de cierre QR no puede ser negativo").default(0);

export const closeRegisterSchema = z
  .object({
    closing_cash_amount: closingCash.optional(),
    closingcash_amount: closingCash.optional(),
    closing_qr_amount: closingQr.optional(),
    closingqr_amount: closingQr.optional(),
    notes: z.string().trim().optional().nullable(),
  })
  .transform((data) => ({
    closing_cash_amount: data.closing_cash_amount ?? data.closingcash_amount ?? 0,
    closing_qr_amount: data.closing_qr_amount ?? data.closingqr_amount ?? 0,
    notes: data.notes ?? null,
  }));
