import { useState, useEffect, useCallback } from "react";
import { api } from "../services/api";
import type { Category } from "../types";
import toast from "react-hot-toast";

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<Category[]>("/categories");
      setCategories(data);
    } catch {
      toast.error("Error cargando categorías");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  async function createCategory(name: string, description?: string) {
    try {
      await api.post("/categories", { name, description: description || null });
      toast.success("Categoría creada");
      fetchCategories();
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      toast.error(
        msg.includes("duplicate") || msg.includes("existe")
          ? "La categoría ya existe"
          : "Error creando categoría",
      );
      return false;
    }
  }

  async function updateCategory(
    id: number,
    name: string,
    description?: string,
  ) {
    try {
      await api.patch(`/categories/${id}`, {
        name,
        description: description || null,
      });
      toast.success("Categoría actualizada");
      fetchCategories();
      return true;
    } catch {
      toast.error("Error actualizando categoría");
      return false;
    }
  }

  async function deleteCategory(id: number) {
    try {
      await api.delete(`/categories/${id}`);
      toast.success("Categoría eliminada");
      fetchCategories();
      return true;
    } catch {
      toast.error(
        "Error eliminando categoría. Puede tener productos asociados.",
      );
      return false;
    }
  }

  return {
    categories,
    loading,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}
