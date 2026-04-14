import { useState, useCallback } from "react";
import { api } from "../services/api";

export interface DailySales {
  date: string;
  total: number;
  count: number;
}

export interface TopProduct {
  product_name: string;
  total_qty: number;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
}

export interface PaymentBreakdown {
  method: string;
  total: number;
  tx_count: number;
}

export interface DailyProfit {
  date: string;
  revenue: number;
  cost: number;
  profit: number;
}

export interface ProfitTotals {
  total_revenue: number;
  total_cost: number;
  gross_profit: number;
  margin_percent: number;
}

interface ReportResponse {
  daily_sales: { date: string; count: number; total: number }[];
  top_products: {
    product_id: number;
    product_name: string;
    total_quantity: number;
    total_revenue: number;
    total_cost: number;
    total_profit: number;
  }[];
  payment_breakdown: { method: string; total: number; tx_count: number }[];
  totals: {
    sales_count: number;
    total_revenue: number;
    average_ticket: number;
  };
}

interface ProfitResponse {
  totals: {
    total_revenue: number;
    total_cost: number;
    gross_profit: number;
    margin_percent: number;
  };
  daily_profit: { date: string; revenue: number; cost: number; profit: number }[];
}

export type GroupBy = "day" | "week" | "month";

export function useReports() {
  const [loading, setLoading] = useState(false);
  const [dailySales, setDailySales] = useState<DailySales[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentBreakdown[]>(
    [],
  );
  const [totals, setTotals] = useState({ sales: 0, revenue: 0, avgTicket: 0 });

  const [profitLoading, setProfitLoading] = useState(false);
  const [profitTotals, setProfitTotals] = useState<ProfitTotals>({
    total_revenue: 0,
    total_cost: 0,
    gross_profit: 0,
    margin_percent: 0,
  });
  const [dailyProfit, setDailyProfit] = useState<DailyProfit[]>([]);

  const fetchReport = useCallback(
    async (from: string, to: string, groupBy: GroupBy = "day") => {
      setLoading(true);
      try {
        const data = await api.get<ReportResponse>(
          `/reports/sales-summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&group_by=${groupBy}`,
        );

        setDailySales(data.daily_sales ?? []);
        setTopProducts(
          (data.top_products ?? []).map((tp) => ({
            product_name: tp.product_name,
            total_qty: tp.total_quantity,
            total_revenue: tp.total_revenue,
            total_cost: tp.total_cost,
            total_profit: tp.total_profit,
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
    },
    [],
  );

  const fetchProfitReport = useCallback(async (from: string, to: string) => {
    setProfitLoading(true);
    try {
      const data = await api.get<ProfitResponse>(
        `/reports/profit-summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      );
      setProfitTotals(
        data.totals ?? {
          total_revenue: 0,
          total_cost: 0,
          gross_profit: 0,
          margin_percent: 0,
        },
      );
      setDailyProfit(data.daily_profit ?? []);
    } catch {
      setProfitTotals({
        total_revenue: 0,
        total_cost: 0,
        gross_profit: 0,
        margin_percent: 0,
      });
      setDailyProfit([]);
    }
    setProfitLoading(false);
  }, []);

  return {
    loading,
    dailySales,
    topProducts,
    paymentBreakdown,
    totals,
    fetchReport,
    profitLoading,
    profitTotals,
    dailyProfit,
    fetchProfitReport,
  };
}
