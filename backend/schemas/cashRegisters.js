import { z } from "zod/v4";

// Accept both snake_case and legacy camelCase field names from frontend.
// Fields are optional (no .default) so the transform can distinguish
// "not sent" (undefined) from "sent as 0" (valid zero amount).
const nonNegativeAmount = z.number().nonnegative("El monto no puede ser negativo").optional();

export const openRegisterSchema = z
  .object({
    opening_cash_amount: nonNegativeAmount,
    openingcash_amount: nonNegativeAmount,
  })
  .transform((data) => ({
    opening_cash_amount: data.opening_cash_amount ?? data.openingcash_amount ?? 0,
  }));

export const closeRegisterSchema = z
  .object({
    closing_cash_amount: nonNegativeAmount,
    closingcash_amount: nonNegativeAmount,
    closing_qr_amount: nonNegativeAmount,
    closingqr_amount: nonNegativeAmount,
    notes: z.string().trim().optional().nullable(),
  })
  .transform((data) => ({
    closing_cash_amount: data.closing_cash_amount ?? data.closingcash_amount ?? 0,
    closing_qr_amount: data.closing_qr_amount ?? data.closingqr_amount ?? 0,
    notes: data.notes ?? null,
  }));
