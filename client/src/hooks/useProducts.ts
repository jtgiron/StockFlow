import { useState, useEffect, useCallback } from "react";
import { api } from "../services/api";
import type { Product } from "../types";
import toast from "react-hot-toast";

export async function findProductByBarcode(
  barcode: string,
): Promise<Product | null> {
  try {
    return await api.get<Product>(
      `/products/barcode/${encodeURIComponent(barcode.trim())}`,
    );
  } catch {
    return null;
  }
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<
        { items: Product[]; total: number } | Product[]
      >("/products?limit=200");
      // Support both paginated and array responses
      if (Array.isArray(data)) {
        setProducts(data);
      } else {
        setProducts(data.items);
      }
    } catch {
      toast.error("Error cargando productos");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  async function createProduct(
    product: Omit<Product, "id" | "created_at" | "updated_at" | "category">,
  ) {
    try {
      await api.post("/products", product);
      toast.success("Producto creado");
      fetchProducts();
      return true;
    } catch {
      toast.error("Error creando producto");
      return false;
    }
  }

  async function updateProduct(id: number, updates: Partial<Product>) {
    try {
      await api.patch(`/products/${id}`, updates);
      toast.success("Producto actualizado");
      fetchProducts();
      return true;
    } catch {
      toast.error("Error actualizando producto");
      return false;
    }
  }

  async function toggleActive(id: number, _isActive: boolean) {
    try {
      await api.patch(`/products/${id}/toggle-active`);
      toast.success("Producto actualizado");
      fetchProducts();
      return true;
    } catch {
      toast.error("Error actualizando producto");
      return false;
    }
  }

  async function deleteProduct(id: number) {
    try {
      await api.delete(`/products/${id}`);
      toast.success("Producto eliminado");
      fetchProducts();
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("ventas") || msg.includes("movimientos")) {
        toast.error(
          "No se puede eliminar: el producto tiene ventas o movimientos relacionados",
        );
      } else {
        toast.error("Error eliminando producto");
      }
      return false;
    }
  }

  async function findByBarcode(barcode: string): Promise<Product | null> {
    return findProductByBarcode(barcode);
  }

  async function bulkCreate(
    products: Array<{
      barcode?: string;
      name: string;
      description?: string;
      category_name?: string;
      cost_price: number;
      sell_price: number;
      stock_quantity?: number;
      min_stock_alert?: number;
    }>,
  ) {
    try {
      const result = await api.post<{
        created: number;
        failed: number;
        total: number;
        details: Array<{
          row: number;
          name: string;
          success: boolean;
          error?: string;
        }>;
      }>("/products/bulk", { products });
      if (result.created > 0) {
        toast.success(`${result.created} productos creados`);
        fetchProducts();
      }
      if (result.failed > 0) {
        toast.error(`${result.failed} productos fallaron`);
      }
      return result;
    } catch {
      toast.error("Error en carga masiva");
      return null;
    }
  }

  return {
    products,
    loading,
    fetchProducts,
    createProduct,
    updateProduct,
    toggleActive,
    deleteProduct,
    findByBarcode,
    bulkCreate,
  };
}
