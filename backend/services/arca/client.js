import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Afip = require('@afipsdk/afip.js');

let _instance = null;

export function getAfipClient(config) {
  if (_instance) return _instance;
  _instance = new Afip({
    CUIT: config.cuit,
    cert: config.certPem,
    key: config.privateKey,
    production: config.env === 'prod',
    access_token: '',
  });
  return _instance;
}
