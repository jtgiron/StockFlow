export function getArcaConfig() {
  const cuit = process.env.ARCA_CUIT;
  const certPem = process.env.ARCA_CERT_PEM;
  const privateKey = process.env.ARCA_PRIVATE_KEY;
  const ptoventa = process.env.ARCA_PTO_VENTA;

  if (!cuit || !certPem || !privateKey || !ptoventa) {
    return { enabled: false };
  }

  return {
    enabled: true,
    cuit,
    certPem,
    privateKey,
    ptoVenta: Number(ptoventa),
    env: process.env.ARCA_ENV === 'prod' ? 'prod' : 'homo',
  };
}
