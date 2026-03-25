import { useState, useEffect } from "react";
import { useReports } from "../hooks/useReports";
import { formatCurrency } from "../utils/formatters";
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
} from "recharts";

const COLORS = [
  "#f59e0b",
  "#14b8a6",
  "#38bdf8",
  "#f97316",
  "#22c55e",
  "#ef4444",
];

const chartGridColor = "rgba(148, 163, 184, 0.14)";
const chartTickColor = "#94a3b8";

export default function ReportsPage() {
  const {
    loading,
    dailySales,
    topProducts,
    paymentBreakdown,
    totals,
    fetchReport,
  } = useReports();
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
    .toISOString()
    .slice(0, 10);
  const [from, setFrom] = useState(thirtyDaysAgo);
  const [to, setTo] = useState(today);

  useEffect(() => {
    fetchReport(from, to);
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-semibold text-surface-50">
        Reportes
      </h1>

      <div className="flex items-end gap-4">
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
        <Button onClick={() => fetchReport(from, to)} loading={loading}>
          Generar
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <div className="p-4 text-center">
            <p className="text-xs text-surface-400 uppercase">Ventas</p>
            <p className="text-3xl font-bold text-surface-50 mt-1">
              {totals.sales}
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-xs text-surface-400 uppercase">Ingresos</p>
            <p className="text-3xl font-bold text-teal-400 mt-1">
              {formatCurrency(totals.revenue)}
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-xs text-surface-400 uppercase">
              Ticket promedio
            </p>
            <p className="text-3xl font-bold text-amber-400 mt-1">
              {formatCurrency(totals.avgTicket)}
            </p>
          </div>
        </Card>
      </div>

      {dailySales.length > 0 && (
        <Card>
          <CardHeader title="Ventas diarias" />
          <div className="p-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailySales}>
                <defs>
                  <linearGradient
                    id="dailySalesGradient"
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
                />
                <YAxis
                  tick={{ fill: chartTickColor, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={64}
                  tickFormatter={(v) => formatCurrency(Number(v))}
                />
                <Tooltip
                  contentStyle={{
                    background: "rgba(15, 23, 42, 0.92)",
                    border: "1px solid rgba(148, 163, 184, 0.25)",
                    borderRadius: 12,
                    boxShadow: "0 18px 38px rgba(2, 6, 23, 0.45)",
                    backdropFilter: "blur(6px)",
                  }}
                  labelStyle={{ color: "#cbd5e1", marginBottom: 6 }}
                  itemStyle={{ color: "#f8fafc" }}
                  formatter={(value) => [
                    formatCurrency(Number(value)),
                    "Ingresos",
                  ]}
                />
                <Bar
                  dataKey="total"
                  fill="url(#dailySalesGradient)"
                  radius={[10, 10, 4, 4]}
                  maxBarSize={34}
                  name="Ingresos"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {topProducts.length > 0 && (
          <Card>
            <CardHeader title="Top 10 productos" />
            <Table
              columns={[
                {
                  header: "Producto",
                  accessor: (p: (typeof topProducts)[number]) => p.product_name,
                },
                {
                  header: "Qty",
                  accessor: (p: (typeof topProducts)[number]) => p.total_qty,
                },
                {
                  header: "Ingreso",
                  accessor: (p: (typeof topProducts)[number]) =>
                    formatCurrency(p.total_revenue),
                },
              ]}
              data={topProducts}
              keyExtractor={(_, i) => i}
            />
          </Card>
        )}

        {paymentBreakdown.length > 0 && (
          <Card>
            <CardHeader title="Métodos de pago" />
            <div className="p-4 h-64 flex items-center justify-center">
              <ResponsiveContainer width="110%" height="110%">
                <PieChart>
                  <Pie
                    data={paymentBreakdown}
                    dataKey="total"
                    nameKey="method"
                    cx="50%"
                    cy="50%"
                    innerRadius={54}
                    outerRadius={88}
                    paddingAngle={3}
                    cornerRadius={6}
                    label={({ method, percent }) =>
                      `${method}: ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {paymentBreakdown.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "rgba(15, 23, 42, 0.92)",
                      border: "1px solid rgba(148, 163, 184, 0.25)",
                      borderRadius: 12,
                      boxShadow: "0 18px 38px rgba(2, 6, 23, 0.45)",
                      backdropFilter: "blur(6px)",
                    }}
                    labelStyle={{ color: "#cbd5e1", marginBottom: 6 }}
                    itemStyle={{ color: "#f8fafc" }}
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
      </div>
    </div>
  );
}
