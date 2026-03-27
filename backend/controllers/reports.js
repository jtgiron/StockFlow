// backend/controllers/reports.js
import { query } from "../database.js";
import { AppError } from "../utils/errors.js";

export const getSalesSummary = async (req, res, next) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      throw new AppError(400, "Los parámetros 'from' y 'to' son obligatorios");
    }

    // Daily sales
    const dailySales = await query(
      `SELECT
         DATE(s.created_at) AS date,
         COUNT(*)::int AS count,
         COALESCE(SUM(s.total_amount), 0)::numeric AS total
       FROM sales s
       WHERE s.status = 'completed'
         AND s.created_at >= $1::date
         AND s.created_at < ($2::date + interval '1 day')
       GROUP BY DATE(s.created_at)
       ORDER BY date`,
      [from, to],
    );

    // Top products
    const topProducts = await query(
      `SELECT
         si.product_id,
         p.name AS product_name,
         SUM(si.quantity)::int AS total_quantity,
         SUM(si.subtotal)::numeric AS total_revenue
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

    // Payment breakdown
    const paymentBreakdown = await query(
      `SELECT
         sp.payment_method AS method,
         COALESCE(SUM(sp.amount), 0)::numeric AS total
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
