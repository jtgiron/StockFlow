import { api } from "../services/api";
import type {
  CartItem,
  PaymentEntry,
  Sale,
  MpOrderResponse,
  MpOrderStatusResponse,
} from "../types";
import toast from "react-hot-toast";

export async function createSale(
  cashRegisterId: number,
  _userId: string,
  items: CartItem[],
  payments: PaymentEntry[],
  creditAccountId?: number,
) {
  const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);

  try {
    const sale = await api.post<Sale>("/sales", {
      cash_register_id: cashRegisterId,
      total_amount: totalAmount,
      items: items.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
      })),
      payments: payments.map((p) => ({
        payment_method: p.method,
        amount: p.amount,
      })),
      credit_account_id: creditAccountId,
    });

    toast.success("Venta completada");
    return sale;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error creando venta";
    toast.error(msg);
    return null;
  }
}

export async function createMpOrder(
  cashRegisterId: number,
  items: CartItem[],
  totalAmount: number,
): Promise<MpOrderResponse | null> {
  try {
    const result = await api.post<MpOrderResponse>("/mp/create-order", {
      cash_register_id: cashRegisterId,
      total_amount: totalAmount,
      items: items.map((item) => ({
        product_id: item.product.id,
        name: item.product.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
      })),
    });
    return result;
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Error creando orden MercadoPago";
    toast.error(msg);
    return null;
  }
}

export async function getMpOrderStatus(
  externalReference: string,
): Promise<MpOrderStatusResponse | null> {
  try {
    return await api.get<MpOrderStatusResponse>(
      `/mp/order-status/${externalReference}`,
    );
  } catch {
    return null;
  }
}
