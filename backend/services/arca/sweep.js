import { query } from '../../database.js';
import { getArcaConfig } from './config.js';
import { emitInvoice } from './index.js';

const SWEEP_INTERVAL_MS = 15 * 60 * 1000;
const MAX_RETRIES = 5;
const BACKOFF_MAX_MS = 30_000;

export function startArcaSweep() {
  const config = getArcaConfig();
  if (!config.enabled) {
    console.log('[ARCA] Sweep not started: ARCA not configured');
    return;
  }

  console.log('[ARCA] Background retry sweep started (interval: 15 min)');

  setInterval(async () => {
    try {
      await runSweep();
    } catch (err) {
      console.error('[ARCA] Sweep error:', err);
    }
  }, SWEEP_INTERVAL_MS);
}

async function runSweep() {
  const result = await query(
    `SELECT id, total_amount, invoice_retry_count
     FROM sales
     WHERE invoice_status = 'failed'
       AND invoice_retry_count < $1
     ORDER BY created_at ASC
     LIMIT 50`,
    [MAX_RETRIES]
  );

  if (result.rows.length === 0) return;

  console.log(`[ARCA] Sweep: retrying ${result.rows.length} failed invoice(s)`);

  for (const sale of result.rows) {
    const attempt = sale.invoice_retry_count;
    const backoffMs = Math.min(Math.pow(2, attempt) * 1000, BACKOFF_MAX_MS);
    await sleep(backoffMs);
    await emitInvoice(sale.id, Number(sale.total_amount));
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
