import { useState, useEffect, useCallback } from "react";
import { api } from "../services/api";
import type { CashRegister } from "../types";

export function useCashRegister() {
  const [history, setHistory] = useState<CashRegister[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { items } = await api.get<{ items: any[]; total: number }>(
        "/cash-registers",
      );
      // Map 'user' relation to 'profile' for frontend compatibility
      setHistory(items.map((r) => ({ ...r, profile: r.user ?? undefined })));
    } catch {
      setHistory([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { history, loading, refresh: fetchHistory };
}
