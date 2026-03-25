import { useState, useEffect, useCallback } from "react";
import { api } from "../services/api";
import type { CreditAccount, CreditTransaction } from "../types";
import toast from "react-hot-toast";

export function useCredits() {
  const [accounts, setAccounts] = useState<CreditAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<CreditAccount[]>("/credits/accounts");
      setAccounts(data);
    } catch {
      toast.error("Error cargando cuentas");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  async function createAccount(name: string, phone?: string) {
    try {
      await api.post("/credits/accounts", {
        customer_name: name,
        phone: phone || null,
      });
      toast.success("Cuenta creada");
      fetchAccounts();
      return true;
    } catch {
      toast.error("Error creando cuenta");
      return false;
    }
  }

  async function updateAccount(id: number, data: Partial<CreditAccount>) {
    try {
      await api.patch(`/credits/accounts/${id}`, data);
      toast.success("Cuenta actualizada");
      fetchAccounts();
      return true;
    } catch {
      toast.error("Error actualizando cuenta");
      return false;
    }
  }

  async function toggleActive(id: number, _isActive: boolean) {
    try {
      await api.patch(`/credits/accounts/${id}/toggle-active`);
      toast.success("Cuenta actualizada");
      fetchAccounts();
      return true;
    } catch {
      toast.error("Error actualizando cuenta");
      return false;
    }
  }

  return {
    accounts,
    loading,
    createAccount,
    updateAccount,
    toggleActive,
    refresh: fetchAccounts,
  };
}

export function useCreditTransactions(accountId: number | null) {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTransactions = useCallback(async () => {
    if (!accountId) {
      setTransactions([]);
      return;
    }
    setLoading(true);
    try {
      const { items } = await api.get<{
        items: CreditTransaction[];
        total: number;
      }>(`/credits/accounts/${accountId}/transactions?limit=100&offset=0`);
      setTransactions(items);
    } catch {
      setTransactions([]);
    }
    setLoading(false);
  }, [accountId]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  async function addPayment(amount: number, _userId: string, notes?: string) {
    if (!accountId) return false;
    try {
      await api.post(`/credits/accounts/${accountId}/payments`, {
        amount,
        notes: notes || "Pago de deuda",
      });
      toast.success("Pago registrado");
      fetchTransactions();
      return true;
    } catch {
      toast.error("Error registrando pago");
      return false;
    }
  }

  return { transactions, loading, addPayment, refresh: fetchTransactions };
}
