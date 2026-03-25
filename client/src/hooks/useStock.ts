import { useState, useEffect, useCallback } from "react";
import { api } from "../services/api";
import type { StockMovement, Product } from "../types";
import toast from "react-hot-toast";

export function useStock() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMovements = useCallback(async () => {
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { items } = await api.get<{ items: any[]; total: number }>(
        "/stock/movements?limit=100&offset=0",
      );
      // Map 'user' relation to 'profile' for frontend compatibility
      setMovements(items.map((m) => ({ ...m, profile: m.user ?? undefined })));
    } catch {
      toast.error("Error cargando movimientos");
    }
    setLoading(false);
  }, []);

  const fetchLowStock = useCallback(async () => {
    try {
      const data = await api.get<Product[]>("/stock/low-stock");
      setLowStockProducts(data);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchMovements();
    fetchLowStock();
  }, [fetchMovements, fetchLowStock]);

  async function addMovement(
    productId: number,
    movementType: "entry" | "exit" | "adjustment",
    quantity: number,
    reason: string,
    _userId: string,
  ) {
    try {
      await api.post("/stock/movements", {
        product_id: productId,
        movement_type: movementType,
        quantity,
        reason: reason || null,
      });
      toast.success("Movimiento registrado");
      fetchMovements();
      fetchLowStock();
      return true;
    } catch {
      toast.error("Error registrando movimiento");
      return false;
    }
  }

  async function addEntry(
    productId: number,
    quantity: number,
    reason: string,
    userId: string,
  ) {
    return addMovement(productId, "entry", quantity, reason, userId);
  }

  async function adjustStock(
    productId: number,
    newQuantity: number,
    reason: string,
    userId: string,
  ) {
    return addMovement(
      productId,
      "adjustment",
      newQuantity,
      reason || "Ajuste manual",
      userId,
    );
  }

  return {
    movements,
    lowStockProducts,
    loading,
    fetchMovements,
    fetchLowStock,
    addEntry,
    adjustStock,
    addMovement,
  };
}
