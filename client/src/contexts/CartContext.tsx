import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { CartItem, Product, PaymentEntry } from "../types";

interface CartContextType {
  items: CartItem[];
  total: number;
  itemCount: number;
  addItem: (product: Product, quantity?: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  removeItem: (productId: number) => void;
  clearCart: () => void;
  payments: PaymentEntry[];
  addPayment: (payment: PaymentEntry) => void;
  removePayment: (index: number) => void;
  clearPayments: () => void;
  totalPaid: number;
  remaining: number;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [payments, setPayments] = useState<PaymentEntry[]>([]);

  const total = items.reduce((sum, item) => sum + item.subtotal, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(0, total - totalPaid);

  const addItem = useCallback((product: Product, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        // For weight products, replace the quantity instead of accumulating
        const newQty = product.sell_by_weight
          ? quantity
          : existing.quantity + quantity;
        return prev.map((item) =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: newQty,
                subtotal: newQty * item.unit_price,
              }
            : item,
        );
      }
      return [
        ...prev,
        {
          product,
          quantity,
          unit_price: product.sell_price,
          subtotal: quantity * product.sell_price,
        },
      ];
    });
  }, []);

  const updateQuantity = useCallback((productId: number, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((item) => item.product.id !== productId));
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? { ...item, quantity, subtotal: quantity * item.unit_price }
          : item,
      ),
    );
  }, []);

  const removeItem = useCallback((productId: number) => {
    setItems((prev) => prev.filter((item) => item.product.id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setPayments([]);
  }, []);

  const addPayment = useCallback((payment: PaymentEntry) => {
    setPayments((prev) => [...prev, payment]);
  }, []);

  const removePayment = useCallback((index: number) => {
    setPayments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearPayments = useCallback(() => setPayments([]), []);

  return (
    <CartContext.Provider
      value={{
        items,
        total,
        itemCount,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        payments,
        addPayment,
        removePayment,
        clearPayments,
        totalPaid,
        remaining,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
