import { useState, useEffect } from "react";
import { api } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { formatCurrency } from "../utils/formatters";
import Card, { CardHeader } from "../components/ui/Card";
import Alert from "../components/ui/Alert";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const chartGridColor = "rgba(148, 163, 184, 0.14)";
const chartTickColor = "#94a3b8";

interface DashboardStats {
  todaySales: number;
  todayRevenue: number;
  lowStockCount: number;
  activeProducts: number;
  openCredits: number;
  weeklyData: { day: string; total: number }[];
}

interface ReportSummary {
  daily_sales: { date: string; count: number; revenue: number }[];
  totals: { sales_count: number; total_revenue: number };
}

interface ProductItem {
  id: number;
  is_active: boolean;
  stock_quantity: number;
  min_stock_alert: number;
}

interface CreditAccountItem {
  id: number;
  is_active: boolean;
  balance: number;
}

export default function DashboardPage() {
  const { profile, isAdmin } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const sevenDaysAgo = new Date(Date.now() - 7 * 86400000)
          .toISOString()
          .slice(0, 10);

        const [reportToday, reportWeek, products, credits] = await Promise.all([
          api.get<ReportSummary>(
            `/reports/sales-summary?from=${today}&to=${today}`,
          ),
          api.get<ReportSummary>(
            `/reports/sales-summary?from=${sevenDaysAgo}&to=${today}`,
          ),
          api.get<ProductItem[]>("/products"),
          api.get<CreditAccountItem[]>("/credits/accounts"),
        ]);

        const activeProducts = (products ?? []).filter(
          (p) => p.is_active,
        ).length;
        const lowStockCount = (products ?? []).filter(
          (p) => p.is_active && p.stock_quantity <= p.min_stock_alert,
        ).length;
        const openCredits = (credits ?? []).filter(
          (c) => c.is_active && c.balance > 0,
        ).length;

        // Build weekly chart data
        const dayMap = new Map<string, number>();
        for (let i = 6; i >= 0; i--) {
          const d = new Date(Date.now() - i * 86400000)
            .toISOString()
            .slice(0, 10);
          dayMap.set(d, 0);
        }
        (reportWeek?.daily_sales ?? []).forEach((d) => {
          dayMap.set(d.date, Number(d.revenue));
        });

        setStats({
          todaySales: reportToday?.totals?.sales_count ?? 0,
          todayRevenue: Number(reportToday?.totals?.total_revenue ?? 0),
          lowStockCount,
          activeProducts,
          openCredits,
          weeklyData: Array.from(dayMap.entries()).map(([day, total]) => ({
            day: day.slice(5),
            total,
          })),
        });
      } catch {
        setStats({
          todaySales: 0,
          todayRevenue: 0,
          lowStockCount: 0,
          activeProducts: 0,
          openCredits: 0,
          weeklyData: [],
        });
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[40vh] text-surface-400">
        Cargando dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-surface-50">
          Bienvenido,{" "}
          <span className="text-amber-400">
            {profile?.full_name?.split(" ")[0] || "Usuario"}
          </span>
        </h1>
      </div>

      {stats && stats.lowStockCount > 0 && (
        <Alert variant="warning">
          <strong>{stats.lowStockCount} producto(s)</strong> con stock bajo.
          Revisá la sección de stock.
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Ventas hoy"
          value={String(stats?.todaySales ?? 0)}
          accent="text-surface-50"
          accentBar="bg-surface-500"
          iconPath="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
        />
        <StatCard
          label="Ingresos hoy"
          value={formatCurrency(stats?.todayRevenue ?? 0)}
          accent="text-teal-400"
          accentBar="bg-teal-500"
          iconPath="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
        />
        <StatCard
          label="Productos activos"
          value={String(stats?.activeProducts ?? 0)}
          accent="text-amber-400"
          accentBar="bg-amber-500"
          iconPath="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
        />
        <StatCard
          label="Créditos abiertos"
          value={String(stats?.openCredits ?? 0)}
          accent="text-red-400"
          accentBar="bg-red-500"
          iconPath="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
        />
      </div>

      {isAdmin && stats && stats.weeklyData.length > 0 && (
        <Card>
          <CardHeader title="Ventas — últimos 7 días" />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.weeklyData} barCategoryGap="35%">
                <defs>
                  <linearGradient
                    id="weeklySalesGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.95} />
                    <stop
                      offset="100%"
                      stopColor="#f59e0b"
                      stopOpacity={0.65}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="0"
                  stroke={chartGridColor}
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  tick={{ fill: chartTickColor, fontSize: 11, fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: chartTickColor, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                  tickFormatter={(v) => formatCurrency(v)}
                />
                <Tooltip
                  cursor={{ fill: "rgba(148,163,184,0.1)" }}
                  contentStyle={{
                    background: "rgba(15, 23, 42, 0.92)",
                    border: "1px solid rgba(148, 163, 184, 0.25)",
                    borderRadius: 12,
                    boxShadow: "0 18px 38px rgba(2, 6, 23, 0.45)",
                    backdropFilter: "blur(6px)",
                    fontSize: 13,
                  }}
                  labelStyle={{ color: "#cbd5e1", marginBottom: 6 }}
                  itemStyle={{ color: "#f8fafc" }}
                  formatter={(value) => [
                    formatCurrency(Number(value)),
                    "Ventas",
                  ]}
                />
                <Bar
                  dataKey="total"
                  fill="url(#weeklySalesGradient)"
                  radius={[10, 10, 4, 4]}
                  maxBarSize={36}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  accentBar,
  iconPath,
}: {
  label: string;
  value: string;
  accent: string;
  accentBar: string;
  iconPath: string;
}) {
  return (
    <div className="rounded-xl border border-surface-800 bg-surface-900/80 backdrop-blur-sm overflow-hidden">
      <div className={`h-0.5 ${accentBar}`} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-surface-500 uppercase tracking-wider mb-3">
              {label}
            </p>
            <p className={`text-3xl font-bold leading-none ${accent}`}>
              {value}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-surface-800 border border-surface-700/50 flex items-center justify-center shrink-0">
            <svg
              className="w-6 h-6 text-surface-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
