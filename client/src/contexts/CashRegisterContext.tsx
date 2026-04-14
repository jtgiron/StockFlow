import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { api, ApiError } from "../services/api";
import { useAuth } from "./AuthContext";
import type { CashRegister } from "../types";
import toast from "react-hot-toast";

interface CashRegisterContextType {
  currentRegister: CashRegister | null;
  loading: boolean;
  openRegister: (initialAmount: number) => Promise<boolean>;
  closeRegister: (
    finalCashAmount: number,
    finalQrAmount: number,
    notes?: string,
  ) => Promise<boolean>;
  refresh: () => Promise<void>;
}

const CashRegisterContext = createContext<CashRegisterContextType | null>(null);

export function CashRegisterProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentRegister, setCurrentRegister] = useState<CashRegister | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const data = await api.get<CashRegister | null>(
        "/cash-registers/current",
      );
      setCurrentRegister(data);
    } catch {
      setCurrentRegister(null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openRegister = useCallback(
    async (initialAmount: number) => {
      if (!user) return false;
      try {
        const data = await api.post<CashRegister>("/cash-registers/open", {
          opening_cash_amount: initialAmount,
        });
        setCurrentRegister(data);
        toast.success("Caja abierta");
        return true;
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : "Error al abrir caja";
        toast.error(message);
        return false;
      }
    },
    [user],
  );

  const closeRegister = useCallback(
    async (finalCashAmount: number, finalQrAmount: number, notes?: string) => {
      if (!currentRegister) return false;
      try {
        await api.post<CashRegister>(
          `/cash-registers/${currentRegister.id}/close`,
          {
            closing_cash_amount: finalCashAmount,
            closing_qr_amount: finalQrAmount,
            notes,
          },
        );
        setCurrentRegister(null);
        toast.success("Caja cerrada");
        return true;
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : "Error al cerrar caja";
        toast.error(message);
        return false;
      }
    },
    [currentRegister],
  );

  return (
    <CashRegisterContext.Provider
      value={{ currentRegister, loading, openRegister, closeRegister, refresh }}
    >
      {children}
    </CashRegisterContext.Provider>
  );
}

export function useCashRegisterContext() {
  const ctx = useContext(CashRegisterContext);
  if (!ctx)
    throw new Error(
      "useCashRegisterContext must be used within CashRegisterProvider",
    );
  return ctx;
}
