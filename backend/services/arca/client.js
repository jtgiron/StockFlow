import soap from 'soap';

const WSDL = {
  homo: {
    wsaa: 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms?wsdl',
    wsfe: 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL',
  },
  prod: {
    wsaa: 'https://wsaa.afip.gov.ar/ws/services/LoginCms?wsdl',
    wsfe: 'https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL',
  },
};

let _wsaaClient = null;
let _wsfeClient = null;

export async function getWsaaClient(config) {
  if (_wsaaClient) return _wsaaClient;
  _wsaaClient = await soap.createClientAsync(WSDL[config.env].wsaa);
  return _wsaaClient;
}

export async function getWsfeClient(config) {
  if (_wsfeClient) return _wsfeClient;
  _wsfeClient = await soap.createClientAsync(WSDL[config.env].wsfe);
  return _wsfeClient;
}
