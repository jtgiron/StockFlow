import forge from 'node-forge';
import { query } from '../../database.js';
import { getWsaaClient } from './client.js';

const WSFE_DESTINATION = {
  homo: 'cn=wsfe,o=afip,c=ar',
  prod: 'cn=wsfe,o=arca,c=ar',
};

function buildLoginTicketRequest(env) {
  const now = new Date();
  const expiration = new Date(now.getTime() + 12 * 60 * 60 * 1000);

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<loginTicketRequest version="1.0">',
    '  <header>',
    `    <uniqueId>${Math.floor(now.getTime() / 1000)}</uniqueId>`,
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
  const xml = buildLoginTicketRequest(config.env);
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

export async function getValidToken(config) {
  const cached = await query(
    `SELECT token, sign, expires_at FROM arca_tokens
     WHERE service = 'wsfe' AND expires_at > NOW() + INTERVAL '5 minutes'`,
    []
  );

  if (cached.rows.length > 0) {
    return { token: cached.rows[0].token, sign: cached.rows[0].sign };
  }

  const tokenData = await requestToken(config);

  await query(
    `INSERT INTO arca_tokens (service, token, sign, expires_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (service) DO UPDATE
     SET token = EXCLUDED.token, sign = EXCLUDED.sign,
         expires_at = EXCLUDED.expires_at, created_at = NOW()`,
    ['wsfe', tokenData.token, tokenData.sign, tokenData.expirationTime]
  );

  console.log(`[ARCA] New WSAA token fetched, expires at ${tokenData.expirationTime}`);
  return { token: tokenData.token, sign: tokenData.sign };
}
