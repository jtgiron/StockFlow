import crypto from 'crypto';
import forge from 'node-forge';
import { query } from '../../database.js';
import { withAdvisoryLock } from '../../utils/db.js';
import { getWsaaClient } from './client.js';

const TOKEN_LOCK_KEY = 20250416;

function buildLoginTicketRequest() {
  const now = new Date();
  const expiration = new Date(now.getTime() + 12 * 60 * 60 * 1000);

  // AFIP requires uniqueId to be unique within ticket validity. Two requests
  // in the same second collide if we use epoch seconds, so use a random
  // 31-bit positive integer (fits within int32 signed).
  const uniqueId = crypto.randomInt(0, 0x7fffffff);

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<loginTicketRequest version="1.0">',
    '  <header>',
    `    <uniqueId>${uniqueId}</uniqueId>`,
    `    <generationTime>${now.toISOString()}</generationTime>`,
    `    <expirationTime>${expiration.toISOString()}</expirationTime>`,
    '  </header>',
    '  <service>wsfe</service>',
    '</loginTicketRequest>',
  ].join('\n');
}

function signWithCMS(xmlContent, certPem, privateKeyPem) {
  const cert = forge.pki.certificateFromPem(certPem);
  const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);

  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(xmlContent, 'utf8');
  p7.addCertificate(cert);
  p7.addSigner({
    key: privateKey,
    certificate: cert,
    digestAlgorithm: forge.pki.oids.sha1,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date() },
    ],
  });
  p7.sign();

  const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
  return forge.util.encode64(der);
}

async function requestToken(config) {
  const xml = buildLoginTicketRequest();
  const cms = signWithCMS(xml, config.certPem, config.privateKey);

  const wsaaClient = await getWsaaClient(config);
  const [result] = await wsaaClient.loginCmsAsync({ in0: cms });

  const responseXml = result.loginCmsReturn;

  const tokenMatch = responseXml.match(/<token>(.+?)<\/token>/);
  const signMatch = responseXml.match(/<sign>(.+?)<\/sign>/);
  const expirationMatch = responseXml.match(/<expirationTime>(.+?)<\/expirationTime>/);

  if (!tokenMatch || !signMatch) {
    throw new Error(`[ARCA] WSAA response missing token/sign: ${responseXml.slice(0, 200)}`);
  }

  return {
    token: tokenMatch[1],
    sign: signMatch[1],
    expirationTime: expirationMatch ? expirationMatch[1] : null,
  };
}

async function readCachedToken() {
  const cached = await query(
    `SELECT token, sign FROM arca_tokens
     WHERE service = 'wsfe' AND expires_at > NOW() + INTERVAL '5 minutes'`
  );
  if (cached.rows.length === 0) return null;
  return { token: cached.rows[0].token, sign: cached.rows[0].sign };
}

export async function getValidToken(config) {
  // Fast path: serve from cache without locking.
  const cached = await readCachedToken();
  if (cached) return cached;

  // Cold cache: serialize WSAA fetches across processes via advisory lock.
  // AFIP rejects concurrent token requests for the same CUIT+service.
  return withAdvisoryLock(TOKEN_LOCK_KEY, async () => {
    // Re-check inside the lock — another worker may have populated the cache.
    const recheck = await readCachedToken();
    if (recheck) return recheck;

    const tokenData = await requestToken(config);

    await query(
      `INSERT INTO arca_tokens (service, token, sign, expires_at)
       VALUES ('wsfe', $1, $2, $3)
       ON CONFLICT (service) DO UPDATE
       SET token = EXCLUDED.token, sign = EXCLUDED.sign,
           expires_at = EXCLUDED.expires_at, created_at = NOW()`,
      [tokenData.token, tokenData.sign, tokenData.expirationTime]
    );

    console.log(`[ARCA] New WSAA token fetched, expires at ${tokenData.expirationTime}`);
    return { token: tokenData.token, sign: tokenData.sign };
  });
}
