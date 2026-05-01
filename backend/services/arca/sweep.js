import { query } from '../../database.js';
import { getArcaConfig } from './config.js';
import { emitInvoice } from './index.js';

const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
const MAX_RETRIES = 5;
const STUCK_PENDING_MINUTES = 10;
const BATCH_SIZE = 50;

export function startArcaSweep() {
  const config = getArcaConfig();
  if (!config.enabled) {
    console.log('[ARCA] Sweep not started: ARCA not configured');
    return;
  }

  console.log('[ARCA] Background retry sweep started (interval: 5 min)');

  // Run once at startup so process restarts pick up failed/stuck invoices
  // immediately instead of waiting a full interval.
  runSweep().catch((err) => console.error('[ARCA] Initial sweep error:', err));

  setInterval(async () => {
    try {
      await runSweep();
    } catch (err) {
      console.error('[ARCA] Sweep error:', err);
    }
  }, SWEEP_INTERVAL_MS);
}

async function runSweep() {
  // Failed invoices ready for retry: respect per-row exponential backoff
  // (2^retry_count minutes) so we don't hammer ARCA after a recent failure.
  const failed = await query(
    `SELECT id, total_amount
     FROM sales
     WHERE invoice_status = 'failed'
       AND invoice_retry_count < $1
       AND (
         invoice_last_attempt_at IS NULL
         OR invoice_last_attempt_at < NOW() - (POWER(2, invoice_retry_count) * INTERVAL '1 minute')
       )
     ORDER BY invoice_last_attempt_at NULLS FIRST
     LIMIT $2`,
    [MAX_RETRIES, BATCH_SIZE]
  );

  // Stuck 'pending' rows: process likely crashed between marking pending and
  // resolving to success/failed. Treat them as retryable after a grace period.
  const stuck = await query(
    `SELECT id, total_amount
     FROM sales
     WHERE invoice_status = 'pending'
       AND invoice_last_attempt_at IS NOT NULL
       AND invoice_last_attempt_at < NOW() - ($1 * INTERVAL '1 minute')
     ORDER BY invoice_last_attempt_at ASC
     LIMIT $2`,
    [STUCK_PENDING_MINUTES, BATCH_SIZE]
  );

  const rows = [...failed.rows, ...stuck.rows];
  if (rows.length === 0) return;

  console.log(`[ARCA] Sweep: retrying ${rows.length} invoice(s) (failed=${failed.rows.length}, stuck=${stuck.rows.length})`);

  for (const sale of rows) {
    await emitInvoice(sale.id, Number(sale.total_amount));
  }
}
