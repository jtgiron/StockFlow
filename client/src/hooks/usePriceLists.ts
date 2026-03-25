import { useState, useEffect, useCallback } from "react";
import { api } from "../services/api";
import type { PriceList, PriceListItem, Product } from "../types";
import toast from "react-hot-toast";

export function usePriceLists() {
  const [lists, setLists] = useState<PriceList[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLists = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<PriceList[]>("/price-lists");
      setLists(data);
    } catch {
      toast.error("Error cargando listas");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  async function createList(name: string) {
    try {
      await api.post("/price-lists", { name });
      toast.success("Lista creada");
      fetchLists();
      return true;
    } catch {
      toast.error("Error creando lista");
      return false;
    }
  }

  async function updateList(id: number, data: Partial<PriceList>) {
    try {
      await api.patch(`/price-lists/${id}`, data);
      toast.success("Lista actualizada");
      fetchLists();
      return true;
    } catch {
      toast.error("Error actualizando lista");
      return false;
    }
  }

  async function deleteList(id: number) {
    try {
      await api.delete(`/price-lists/${id}`);
      toast.success("Lista eliminada");
      fetchLists();
      return true;
    } catch {
      toast.error("Error eliminando lista");
      return false;
    }
  }

  return {
    lists,
    loading,
    createList,
    updateList,
    deleteList,
    refresh: fetchLists,
  };
}

export function usePriceListItems(listId: number | null) {
  const [items, setItems] = useState<(PriceListItem & { product?: Product })[]>(
    [],
  );
  const [loading, setLoading] = useState(false);

  const fetchItems = useCallback(async () => {
    if (!listId) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const data = await api.get<(PriceListItem & { product?: Product })[]>(
        `/price-lists/${listId}/items`,
      );
      setItems(data);
    } catch {
      setItems([]);
    }
    setLoading(false);
  }, [listId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  async function addItem(productId: number, newPrice: number) {
    if (!listId) return false;
    try {
      await api.post(`/price-lists/${listId}/items`, {
        product_id: productId,
        new_price: newPrice,
      });
      fetchItems();
      return true;
    } catch {
      toast.error("Error agregando precio");
      return false;
    }
  }

  async function removeItem(id: number) {
    if (!listId) return false;
    try {
      await api.delete(`/price-lists/${listId}/items/${id}`);
      fetchItems();
      return true;
    } catch {
      toast.error("Error eliminando item");
      return false;
    }
  }

  async function applyList() {
    if (!listId) return false;
    try {
      await api.post(`/price-lists/${listId}/apply`);
      toast.success("Precios aplicados");
      return true;
    } catch {
      toast.error("Error aplicando lista");
      return false;
    }
  }

  return {
    items,
    loading,
    addItem,
    removeItem,
    applyList,
    refresh: fetchItems,
  };
}
