import { useState, useEffect } from "react";
import {
  useReports,
  type GroupBy,
  type TopProduct,
  type PaymentBreakdown,
  type DailyProfit,
} from "../hooks/useReports";
import { formatCurrency, cn } from "../utils/formatters";
import Card, { CardHeader } from "../components/ui/Card";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import Table from "../components/ui/Table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from "recharts";

const COLORS = [
  "#f59e0b",
  "#14b8a6",
  "#38bdf8",
  "#f97316",
  "#22c55e",
  "#ef4444",
];

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  qr: "QR",
  mercadopago: "MercadoPago",
  credit: "Fiado",
};

const chartGridColor = "rgba(148, 163, 184, 0.14)";
const chartTickColor = "#94a3b8";

const tooltipStyle = {
  contentStyle: {
    background: "rgba(15, 23, 42, 0.92)",
    border: "1px solid rgba(148, 163, 184, 0.25)",
    borderRadius: 12,
    boxShadow: "0 18px 38px rgba(2, 6, 23, 0.45)",
    backdropFilter: "blur(6px)",
  },
  labelStyle: { color: "#cbd5e1", marginBottom: 6 },
  itemStyle: { color: "#f8fafc" },
};

function formatChartDate(dateStr: string, groupBy: GroupBy): string {
  const d = new Date(dateStr + "T12:00:00");
  if (groupBy === "month") {
    return d.toLocaleDateString("es-AR", { month: "short", year: "2-digit" });
  }
  if (groupBy === "week") {
    return `Sem ${d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })}`;
  }
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
}

type Tab = "ventas" | "productos" | "pagos" | "ganancias";

const TABS: { key: Tab; label: string }[] = [
  { key: "ventas", label: "Ventas" },
  { key: "productos", label: "Productos" },
  { key: "pagos", label: "Pagos" },
  { key: "ganancias", label: "Ganancias" },
];

function StatCard({
  label,
  value,
  color = "text-surface-50",
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <Card>
      <div className="p-4 text-center">
        <p className="text-xs text-surface-400 uppercase">{label}</p>
        <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
      </div>
    </Card>
  );
}

export default function ReportsPage() {
  const {
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
  } = useReports();

  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
    .toISOString()
    .slice(0, 10);

  const [from, setFrom] = useState(thirtyDaysAgo);
  const [to, setTo] = useState(today);
  const [tab, setTab] = useState<Tab>("ventas");
  const [groupBy, setGroupBy] = useState<GroupBy>("day");
  const [fetchedTabs, setFetchedTabs] = useState<Set<Tab>>(new Set());

  function handleGenerate() {
    setFetchedTabs(new Set());
    fetchReport(from, to, groupBy);
    setFetchedTabs(new Set(["ventas"]));
  }

  useEffect(() => {
    fetchReport(from, to, groupBy);
    setFetchedTabs(new Set(["ventas"]));
  }, []);

  useEffect(() => {
    if (fetchedTabs.has(tab)) return;
    if (tab === "ganancias") {
      fetchProfitReport(from, to);
      setFetchedTabs((prev) => new Set([...prev, "ganancias"]));
    } else if (!fetchedTabs.has("ventas")) {
      fetchReport(from, to, groupBy);
      setFetchedTabs((prev) => new Set([...prev, "ventas", "productos", "pagos"]));
    }
  }, [tab]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-semibold text-surface-50">
        Reportes
      </h1>

      {/* Date filter */}
      <div className="flex flex-wrap items-end gap-4">
        <Input
          label="Desde"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <Input
          label="Hasta"
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
        <Button onClick={handleGenerate} loading={loading || profitLoading}>
          Generar
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-surface-900 border border-surface-800 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
              tab === t.key
                ? "bg-surface-800 text-surface-50 shadow-sm"
                : "text-surface-400 hover:text-surface-200",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "ventas" && (
        <VentasTab
          dailySales={dailySales}
          totals={totals}
          groupBy={groupBy}
          onGroupByChange={(g) => {
            setGroupBy(g);
            fetchReport(from, to, g);
            setFetchedTabs((prev) => new Set([...prev, "ventas"]));
          }}
          loading={loading}
        />
      )}
      {tab === "productos" && (
        <ProductosTab topProducts={topProducts} loading={loading} />
      )}
      {tab === "pagos" && (
        <PagosTab paymentBreakdown={paymentBreakdown} loading={loading} />
      )}
      {tab === "ganancias" && (
        <GananciasTab
          profitTotals={profitTotals}
          dailyProfit={dailyProfit}
          loading={profitLoading}
        />
      )}
    </div>
  );
}

/* ─── Ventas Tab ─── */

function VentasTab({
  dailySales,
  totals,
  groupBy,
  onGroupByChange,
  loading,
}: {
  dailySales: { date: string; total: number; count: number }[];
  totals: { sales: number; revenue: number; avgTicket: number };
  groupBy: GroupBy;
  onGroupByChange: (g: GroupBy) => void;
  loading: boolean;
}) {
  const groupOptions: { key: GroupBy; label: string }[] = [
    { key: "day", label: "Día" },
    { key: "week", label: "Semana" },
    { key: "month", label: "Mes" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Ventas" value={totals.sales} />
        <StatCard
          label="Ingresos"
          value={formatCurrency(totals.revenue)}
          color="text-teal-400"
        />
        <StatCard
          label="Ticket promedio"
          value={formatCurrency(totals.avgTicket)}
          color="text-amber-400"
        />
      </div>

      <Card>
        <div className="flex items-center justify-between px-4 pt-4">
          <h3 className="text-lg font-semibold text-surface-100">
            Ventas por período
          </h3>
          <div className="flex gap-1 rounded-lg bg-surface-800 p-0.5">
            {groupOptions.map((g) => (
              <button
                key={g.key}
                onClick={() => onGroupByChange(g.key)}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                  groupBy === g.key
                    ? "bg-surface-700 text-surface-50"
                    : "text-surface-400 hover:text-surface-200",
                )}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
        <div className="p-4 h-72">
          {loading ? (
            <div className="flex items-center justify-center h-full text-surface-400">
              Cargando...
            </div>
          ) : dailySales.length === 0 ? (
            <div className="flex items-center justify-center h-full text-surface-500">
              Sin datos para el período seleccionado
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailySales}>
                <defs>
                  <linearGradient
                    id="salesGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#fb923c" stopOpacity={0.95} />
                    <stop
                      offset="100%"
                      stopColor="#f59e0b"
                      stopOpacity={0.62}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="0"
                  stroke={chartGridColor}
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: chartTickColor, fontSize: 11, fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatChartDate(String(v), groupBy)}
                />
                <YAxis
                  tick={{ fill: chartTickColor, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={64}
                  tickFormatter={(v) => formatCurrency(Number(v))}
                />
                <Tooltip
                  {...tooltipStyle}
                  labelFormatter={(label) =>
                    formatChartDate(String(label), groupBy)
                  }
                  formatter={(value) => [
                    formatCurrency(Number(value)),
                    "Ingresos",
                  ]}
                />
                <Bar
                  dataKey="total"
                  fill="url(#salesGradient)"
                  radius={[10, 10, 4, 4]}
                  maxBarSize={34}
                  name="Ingresos"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  );
}

/* ─── Productos Tab ─── */

function ProductosTab({
  topProducts,
  loading,
}: {
  topProducts: TopProduct[];
  loading: boolean;
}) {
  const top10 = topProducts.slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Top 20 productos" />
          <Table
            columns={[
              {
                header: "Producto",
                accessor: (p: TopProduct) => p.product_name,
              },
              {
                header: "Cant.",
                accessor: (p: TopProduct) => p.total_qty,
                className: "text-right w-16",
              },
              {
                header: "Ingreso",
                accessor: (p: TopProduct) =>
                  formatCurrency(p.total_revenue),
                className: "text-right w-28",
              },
              {
                header: "Ganancia",
                accessor: (p: TopProduct) => (
                  <span className={p.total_profit >= 0 ? "text-teal-400" : "text-red-400"}>
                    {formatCurrency(p.total_profit)}
                  </span>
                ),
                className: "text-right w-28",
              },
            ]}
            data={topProducts}
            keyExtractor={(_, i) => i}
            loading={loading}
            emptyMessage="Sin datos para el período"
          />
        </Card>

        {top10.length > 0 && (
          <Card>
            <CardHeader title="Top 10 por ingreso" />
            <div className="p-4 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top10} layout="vertical">
                  <CartesianGrid
                    strokeDasharray="0"
                    stroke={chartGridColor}
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={{ fill: chartTickColor, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => formatCurrency(Number(v))}
                  />
                  <YAxis
                    type="category"
                    dataKey="product_name"
                    tick={{ fill: chartTickColor, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={120}
                  />
                  <Tooltip
                    {...tooltipStyle}
                    formatter={(value) => [
                      formatCurrency(Number(value)),
                      "Ingreso",
                    ]}
                  />
                  <Bar
                    dataKey="total_revenue"
                    fill="#14b8a6"
                    radius={[4, 10, 10, 4]}
                    maxBarSize={24}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ─── Pagos Tab ─── */

function PagosTab({
  paymentBreakdown,
  loading,
}: {
  paymentBreakdown: PaymentBreakdown[];
  loading: boolean;
}) {
  const grandTotal = paymentBreakdown.reduce((s, p) => s + Number(p.total), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {paymentBreakdown.length > 0 && (
          <Card>
            <CardHeader title="Distribución" />
            <div className="p-4 h-72 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentBreakdown.map((p) => ({
                      ...p,
                      label: PAYMENT_LABELS[p.method] ?? p.method,
                    }))}
                    dataKey="total"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={54}
                    outerRadius={88}
                    paddingAngle={3}
                    cornerRadius={6}
                    label={({ name, percent }) =>
                      `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {paymentBreakdown.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    {...tooltipStyle}
                    formatter={(value) => [
                      formatCurrency(Number(value)),
                      "Total",
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        <Card>
          <CardHeader title="Desglose" />
          <Table
            columns={[
              {
                header: "Método",
                accessor: (p: PaymentBreakdown) =>
                  PAYMENT_LABELS[p.method] ?? p.method,
              },
              {
                header: "Total",
                accessor: (p: PaymentBreakdown) =>
                  formatCurrency(Number(p.total)),
                className: "text-right w-28",
              },
              {
                header: "% del total",
                accessor: (p: PaymentBreakdown) =>
                  grandTotal > 0
                    ? `${((Number(p.total) / grandTotal) * 100).toFixed(1)}%`
                    : "—",
                className: "text-right w-24",
              },
              {
                header: "Transacciones",
                accessor: (p: PaymentBreakdown) => p.tx_count,
                className: "text-right w-28",
              },
            ]}
            data={paymentBreakdown}
            keyExtractor={(p) => p.method}
            loading={loading}
            emptyMessage="Sin datos para el período"
          />
        </Card>
      </div>
    </div>
  );
}

/* ─── Ganancias Tab ─── */

function GananciasTab({
  profitTotals,
  dailyProfit,
  loading,
}: {
  profitTotals: {
    total_revenue: number;
    total_cost: number;
    gross_profit: number;
    margin_percent: number;
  };
  dailyProfit: DailyProfit[];
  loading: boolean;
}) {
  const margin = Number(profitTotals.margin_percent);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          label="Ingresos"
          value={formatCurrency(Number(profitTotals.total_revenue))}
          color="text-teal-400"
        />
        <StatCard
          label="Costos"
          value={formatCurrency(Number(profitTotals.total_cost))}
          color="text-red-400"
        />
        <StatCard
          label="Ganancia bruta"
          value={formatCurrency(Number(profitTotals.gross_profit))}
          color={
            Number(profitTotals.gross_profit) >= 0
              ? "text-emerald-400"
              : "text-red-400"
          }
        />
        <StatCard
          label="Margen"
          value={`${margin.toFixed(1)}%`}
          color={margin >= 20 ? "text-emerald-400" : margin >= 0 ? "text-amber-400" : "text-red-400"}
        />
      </div>

      <Card>
        <CardHeader title="Ingresos vs Costos" />
        <div className="p-4 h-72">
          {loading ? (
            <div className="flex items-center justify-center h-full text-surface-400">
              Cargando...
            </div>
          ) : dailyProfit.length === 0 ? (
            <div className="flex items-center justify-center h-full text-surface-500">
              Sin datos para el período seleccionado
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyProfit}>
                <defs>
                  <linearGradient
                    id="revenueGrad"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient
                    id="costGrad"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="0"
                  stroke={chartGridColor}
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: chartTickColor, fontSize: 11, fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatChartDate(String(v), "day")}
                />
                <YAxis
                  tick={{ fill: chartTickColor, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={64}
                  tickFormatter={(v) => formatCurrency(Number(v))}
                />
                <Tooltip
                  {...tooltipStyle}
                  labelFormatter={(label) =>
                    formatChartDate(String(label), "day")
                  }
                  formatter={(value, name) => [
                    formatCurrency(Number(value)),
                    String(name),
                  ]}
                />
                <Legend
                  wrapperStyle={{ color: chartTickColor, fontSize: 12 }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#14b8a6"
                  strokeWidth={2}
                  fill="url(#revenueGrad)"
                  name="Ingresos"
                />
                <Area
                  type="monotone"
                  dataKey="cost"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fill="url(#costGrad)"
                  name="Costos"
                />
                <Area
                  type="monotone"
                  dataKey="profit"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fill="none"
                  strokeDasharray="6 3"
                  name="Ganancia"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  );
}
