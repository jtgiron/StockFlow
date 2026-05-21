import { withAdvisoryLock } from '../../utils/db.js';
import { getWsfeClient } from './client.js';
import { getValidToken } from './token.js';
import { getArcaConfig } from './config.js';

const INVOICE_LOCK_KEY = 20250415;

async function getLastVoucherNumber(wsfeClient, auth, ptoVta, cbteTipo) {
  const [result] = await wsfeClient.FECompUltimoAutorizadoAsync({
    Auth: auth,
    PtoVta: ptoVta,
    CbteTipo: cbteTipo,
  });
  return result.FECompUltimoAutorizadoResult.CbteNro;
}

// WSFE returns CAE expiry as YYYYMMDD; normalize to YYYY-MM-DD for DATE column.
function formatCaeExpiry(yyyymmdd) {
  if (typeof yyyymmdd !== 'string' || !/^\d{8}$/.test(yyyymmdd)) return null;
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

export async function requestCAE(saleId, totalAmount) {
  const config = getArcaConfig();
  if (!config.enabled) return { skipped: true };

  const { token, sign } = await getValidToken(config);
  const wsfeClient = await getWsfeClient(config);

  const auth = { Token: token, Sign: sign, Cuit: config.cuit };
  const cbteTipo = 11; // Factura C
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  return withAdvisoryLock(INVOICE_LOCK_KEY, async () => {
    const lastNumber = await getLastVoucherNumber(wsfeClient, auth, config.ptoVenta, cbteTipo);
    const nextNumber = lastNumber + 1;

    const [result] = await wsfeClient.FECAESolicitarAsync({
      Auth: auth,
      FeCAEReq: {
        FeCabReq: {
          CantReg: 1,
          PtoVta: config.ptoVenta,
          CbteTipo: cbteTipo,
        },
        FeDetReq: {
          FECAEDetRequest: [{
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
            CondicionIVAReceptorId: 5,
            MonId: 'PES',
            MonCotiz: 1,
          }],
        },
      },
    });

    const resp = result.FECAESolicitarResult;

    // AFIP may return top-level Errors before FeCabResp exists
    if (!resp?.FeCabResp) {
      const errs = resp?.Errors?.Err
        ?.map((e) => `${e.Code}: ${e.Msg}`)
        .join('; ') || JSON.stringify(result);
      throw new Error(`[ARCA] Error de servicio: ${errs}`);
    }

    const cabResp = resp.FeCabResp;
    const detResp = resp.FeDetResp?.FECAEDetResponse?.[0];

    if (cabResp.Resultado !== 'A') {
      const obs = detResp?.Observaciones?.Obs
        ?.map((o) => `${o.Code}: ${o.Msg}`)
        .join('; ')
        || resp?.Errors?.Err
          ?.map((e) => `${e.Code}: ${e.Msg}`)
          .join('; ')
        || 'Unknown rejection';
      throw new Error(`[ARCA] Factura rechazada: ${obs}`);
    }

    return {
      cae: detResp.CAE,
      caeExpiry: formatCaeExpiry(detResp.CAEFchVto),
      invoiceNumber: nextNumber,
    };
  });
}
