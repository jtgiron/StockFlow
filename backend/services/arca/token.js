import { query } from '../../database.js';

export async function getValidToken(afipClient, service = 'wsfe') {
  const cached = await query(
    `SELECT token, sign, expires_at FROM arca_tokens
     WHERE service = $1 AND expires_at > NOW() + INTERVAL '5 minutes'`,
    [service]
  );

  if (cached.rows.length > 0) {
    return { token: cached.rows[0].token, sign: cached.rows[0].sign };
  }

  const tokenData = await afipClient.getServiceToken(service);

  await query(
    `INSERT INTO arca_tokens (service, token, sign, expires_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (service) DO UPDATE
     SET token = EXCLUDED.token, sign = EXCLUDED.sign,
         expires_at = EXCLUDED.expires_at, created_at = NOW()`,
    [service, tokenData.token, tokenData.sign, tokenData.expirationTime]
  );

  console.log(`[ARCA] New WSAA token fetched, expires at ${tokenData.expirationTime}`);
  return { token: tokenData.token, sign: tokenData.sign };
}
