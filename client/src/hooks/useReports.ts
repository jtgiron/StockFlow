import { useState, useCallback } from "react";
import { api } from "../services/api";

interface DailySales {
  date: string;
  total: number;
  count: number;
}
interface TopProduct {
  product_name: string;
  total_qty: number;
  total_revenue: number;
}
interface PaymentBreakdown {
  method: string;
  total: number;
}

interface ReportResponse {
  daily_sales: { date: string; count: number; total: number }[];
  top_products: {
    product_id: number;
    product_name: string;
    total_quantity: number;
    total_revenue: number;
  }[];
  payment_breakdown: { method: string; total: number }[];
  totals: {
    sales_count: number;
    total_revenue: number;
    average_ticket: number;
  };
}

export function useReports() {
  const [loading, setLoading] = useState(false);
  const [dailySales, setDailySales] = useState<DailySales[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentBreakdown[]>(
    [],
  );
  const [totals, setTotals] = useState({ sales: 0, revenue: 0, avgTicket: 0 });

  const fetchReport = useCallback(async (from: string, to: string) => {
    setLoading(true);
    try {
      const data = await api.get<ReportResponse>(
        `/reports/sales-summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      );

      setDailySales(data.daily_sales ?? []);
      setTopProducts(
        (data.top_products ?? []).map((tp) => ({
          product_name: tp.product_name,
          total_qty: tp.total_quantity,
          total_revenue: tp.total_revenue,
        })),
      );
      setPaymentBreakdown(data.payment_breakdown ?? []);
      setTotals({
        sales: data.totals?.sales_count ?? 0,
        revenue: data.totals?.total_revenue ?? 0,
        avgTicket: data.totals?.average_ticket ?? 0,
      });
    } catch {
      setDailySales([]);
      setTopProducts([]);
      setPaymentBreakdown([]);
      setTotals({ sales: 0, revenue: 0, avgTicket: 0 });
    }
    setLoading(false);
  }, []);

  return {
    loading,
    dailySales,
    topProducts,
    paymentBreakdown,
    totals,
    fetchReport,
  };
}
