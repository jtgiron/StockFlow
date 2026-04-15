import { query } from '../../database.js';
import { getAfipClient } from './client.js';
import { getValidToken } from './token.js';
import { getArcaConfig } from './config.js';

const LOCK_KEY = 20250415;

export async function requestCAE(saleId, totalAmount) {
  const config = getArcaConfig();
  if (!config.enabled) return { skipped: true };

  const afip = getAfipClient(config);
  await getValidToken(afip);

  // Acquire advisory lock to serialize voucher number allocation
  await query('SELECT pg_advisory_lock($1)', [LOCK_KEY]);

  try {
    const lastNumResult = await afip.ElectronicBilling.getLastVoucher(
      config.ptoVenta,
      11
    );
    const nextNumber = (lastNumResult || 0) + 1;

    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const voucherData = {
      CantReg: 1,
      PtoVta: config.ptoVenta,
      CbteTipo: 11,
      Concepto: 1,
      DocTipo: 99,
      DocNro: 0,
      CbteDesde: nextNumber,
      CbteHasta: nextNumber,
      CbteFch: today,
      ImpTotal: totalAmount,
      ImpTotConc: 0,
      ImpNeto: totalAmount,
      ImpOpEx: 0,
      ImpIVA: 0,
      ImpTrib: 0,
      MonId: 'PES',
      MonCotiz: 1,
    };

    const result = await afip.ElectronicBilling.createVoucher(voucherData);

    return {
      cae: result.CAE,
      caeExpiry: parseArcaDate(result.CAEFchVto),
      invoiceNumber: nextNumber,
    };
  } finally {
    await query('SELECT pg_advisory_unlock($1)', [LOCK_KEY]);
  }
}

function parseArcaDate(yyyymmdd) {
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}
