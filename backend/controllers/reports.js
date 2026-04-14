// backend/controllers/reports.js
import { query } from "../database.js";
import { AppError } from "../utils/errors.js";

export const getSalesSummary = async (req, res, next) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      throw new AppError(400, "Los parámetros 'from' y 'to' son obligatorios");
    }

    const groupBy = req.query.group_by || "day";
    const groupExpr =
      groupBy === "month"
        ? "date_trunc('month', s.created_at)::date"
        : groupBy === "week"
          ? "date_trunc('week', s.created_at)::date"
          : "DATE(s.created_at)";

    // Sales by period
    const dailySales = await query(
      `SELECT
         ${groupExpr} AS date,
         COUNT(*)::int AS count,
         COALESCE(SUM(s.total_amount), 0)::numeric AS total
       FROM sales s
       WHERE s.status = 'completed'
         AND s.created_at >= $1::date
         AND s.created_at < ($2::date + interval '1 day')
       GROUP BY ${groupExpr}
       ORDER BY date`,
      [from, to],
    );

    // Top products (with cost & profit)
    const topProducts = await query(
      `SELECT
         si.product_id,
         p.name AS product_name,
         SUM(si.quantity)::int AS total_quantity,
         SUM(si.subtotal)::numeric AS total_revenue,
         SUM(si.quantity * p.cost_price)::numeric AS total_cost,
         (SUM(si.subtotal) - SUM(si.quantity * p.cost_price))::numeric AS total_profit
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       JOIN products p ON p.id = si.product_id
       WHERE s.status = 'completed'
         AND s.created_at >= $1::date
         AND s.created_at < ($2::date + interval '1 day')
       GROUP BY si.product_id, p.name
       ORDER BY total_quantity DESC
       LIMIT 20`,
      [from, to],
    );

    // Payment breakdown (with transaction count)
    const paymentBreakdown = await query(
      `SELECT
         sp.payment_method AS method,
         COALESCE(SUM(sp.amount), 0)::numeric AS total,
         COUNT(*)::int AS tx_count
       FROM sale_payments sp
       JOIN sales s ON s.id = sp.sale_id
       WHERE s.status = 'completed'
         AND s.created_at >= $1::date
         AND s.created_at < ($2::date + interval '1 day')
       GROUP BY sp.payment_method
       ORDER BY total DESC`,
      [from, to],
    );

    // Totals
    const totals = await query(
      `SELECT
         COUNT(*)::int AS sales_count,
         COALESCE(SUM(total_amount), 0)::numeric AS total_revenue,
         CASE WHEN COUNT(*) > 0
              THEN (SUM(total_amount) / COUNT(*))::numeric
              ELSE 0
         END AS average_ticket
       FROM sales
       WHERE status = 'completed'
         AND created_at >= $1::date
         AND created_at < ($2::date + interval '1 day')`,
      [from, to],
    );

    res.json({
      daily_sales: dailySales.rows,
      top_products: topProducts.rows,
      payment_breakdown: paymentBreakdown.rows,
      totals: totals.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

export const getProfitSummary = async (req, res, next) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      throw new AppError(400, "Los parámetros 'from' y 'to' son obligatorios");
    }

    // Totals: revenue, cost, profit
    const totals = await query(
      `SELECT
         COALESCE(SUM(si.subtotal), 0)::numeric AS total_revenue,
         COALESCE(SUM(si.quantity * p.cost_price), 0)::numeric AS total_cost,
         (COALESCE(SUM(si.subtotal), 0) - COALESCE(SUM(si.quantity * p.cost_price), 0))::numeric AS gross_profit,
         CASE WHEN SUM(si.subtotal) > 0
              THEN ((SUM(si.subtotal) - SUM(si.quantity * p.cost_price)) / SUM(si.subtotal) * 100)::numeric
              ELSE 0
         END AS margin_percent
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       JOIN products p ON p.id = si.product_id
       WHERE s.status = 'completed'
         AND s.created_at >= $1::date
         AND s.created_at < ($2::date + interval '1 day')`,
      [from, to],
    );

    // Daily profit breakdown
    const dailyProfit = await query(
      `SELECT
         DATE(s.created_at) AS date,
         COALESCE(SUM(si.subtotal), 0)::numeric AS revenue,
         COALESCE(SUM(si.quantity * p.cost_price), 0)::numeric AS cost,
         (COALESCE(SUM(si.subtotal), 0) - COALESCE(SUM(si.quantity * p.cost_price), 0))::numeric AS profit
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       JOIN products p ON p.id = si.product_id
       WHERE s.status = 'completed'
         AND s.created_at >= $1::date
         AND s.created_at < ($2::date + interval '1 day')
       GROUP BY DATE(s.created_at)
       ORDER BY date`,
      [from, to],
    );

    res.json({
      totals: totals.rows[0],
      daily_profit: dailyProfit.rows,
    });
  } catch (err) {
    next(err);
  }
};
