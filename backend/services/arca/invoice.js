import { query } from '../../database.js';
import { getAfipClient } from './client.js';
import { getArcaConfig } from './config.js';

const LOCK_KEY = 20250415;

export async function requestCAE(saleId, totalAmount) {
  const config = getArcaConfig();
  if (!config.enabled) return { skipped: true };

  const afip = getAfipClient(config);

  // SDK handles WSAA authentication internally via GetServiceTA
  // Acquire advisory lock to serialize voucher number allocation
  await query('SELECT pg_advisory_lock($1)', [LOCK_KEY]);

  try {
    // createNextVoucher combines getLastVoucher + createVoucher
    const result = await afip.ElectronicBilling.createNextVoucher({
      PtoVta: config.ptoVenta,
      CbteTipo: 11,
      Concepto: 1,
      DocTipo: 99,
      DocNro: 0,
      CbteFch: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
      ImpTotal: totalAmount,
      ImpTotConc: 0,
      ImpNeto: totalAmount,
      ImpOpEx: 0,
      ImpIVA: 0,
      ImpTrib: 0,
      MonId: 'PES',
      MonCotiz: 1,
    });

    return {
      cae: result.CAE,
      caeExpiry: result.CAEFchVto, // SDK already formats as yyyy-mm-dd
      invoiceNumber: result.voucherNumber,
    };
  } finally {
    await query('SELECT pg_advisory_unlock($1)', [LOCK_KEY]);
  }
}
