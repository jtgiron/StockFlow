import { query } from '../../database.js';
import { requestCAE } from './invoice.js';
import { getArcaConfig } from './config.js';

export async function emitInvoice(saleId, totalAmount) {
  const config = getArcaConfig();
  if (!config.enabled) {
    return { success: false, skipped: true };
  }

  await query(
    `UPDATE sales SET
       invoice_status = 'pending',
       invoice_last_attempt_at = NOW()
     WHERE id = $1`,
    [saleId]
  );

  try {
    const result = await requestCAE(saleId, totalAmount);

    if (result.skipped) return { success: false, skipped: true };

    await query(
      `UPDATE sales SET
         invoice_status = 'success',
         invoice_cae = $2,
         invoice_cae_expiry = $3,
         invoice_number = $4,
         invoice_emitted_at = NOW(),
         invoice_last_attempt_at = NOW(),
         invoice_error = NULL
       WHERE id = $1`,
      [saleId, result.cae, result.caeExpiry, result.invoiceNumber]
    );

    console.log(`[ARCA] Invoice emitted for sale #${saleId}: CAE ${result.cae}`);
    return { success: true, cae: result.cae, invoiceNumber: result.invoiceNumber };
  } catch (err) {
    const errorMsg = err?.message || 'Unknown ARCA error';

    await query(
      `UPDATE sales SET
         invoice_status = 'failed',
         invoice_error = $2,
         invoice_last_attempt_at = NOW(),
         invoice_retry_count = invoice_retry_count + 1
       WHERE id = $1`,
      [saleId, errorMsg]
    );

    console.error(`[ARCA] Failed to emit invoice for sale #${saleId}:`, err);
    return { success: false, error: errorMsg };
  }
}
