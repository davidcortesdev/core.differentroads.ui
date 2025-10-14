export const environment = {
  // Entorno
  production: false,

  // Cognito
  cognitoUserPoolId: 'us-east-2_KSSmf3Tt7',
  cognitoAppClientId: '216668bnnnnfvo2aq4ijs12mga',

  // Redsys
  redsysUrl: 'https://sis-t.redsys.es:25443/sis/realizarPago',
  redsysFuc: '355960907',
  redsysClaveComercio: 'sq7HjrUOBfKmC576ILgskD5srU870gJ7',
  redsysNotifyUrl: 'https://qt4uw3rgx6.execute-api.us-east-2.amazonaws.com/dev/redsys/notify',
  redsysMerchantTerminal: '1',

  // Google Maps
  googleMapsApiKey: 'AIzaSyB6sxlxeTVlRllpGPyDPbKmaZPQJsb8YAs',

  // Cloudinary
  cloudinary: {
    uploadPreset: 'dr_uploads',
    cloudName: 'dxp2hxees',
    apiSecret: 'mD3dyC3tOF1i_nV0p-t9f-3_zKY',
    apiKey: '197192715793311',
  },

  // APIs - ordenadas alfabéticamente
  amadeusApiUrl: 'https://amadeus-dev.differentroads.es/api',
  cmsApiUrl: 'https://cms-dev.differentroads.es/api',
  hotelsApiUrl: 'https://hotels-dev.differentroads.es/api',
  locationsApiUrl: 'https://locations-dev.differentroads.es/api',
  masterdataApiUrl: 'https://masterdata-dev.differentroads.es/api',
  redsysApiUrl: 'https://redsys-dev.differentroads.es/api',
  reservationsApiUrl: 'https://reservations-dev.differentroads.es/api',
  reviewsApiUrl: 'https://reviews-dev.differentroads.es/api',
  scalapayApiUrl: 'https://scalapay-dev.differentroads.es/api',
  tourknifeApiUrl: 'https://tourknife-dev.differentroads.es/api',
  toursApiUrl: 'https://tour-dev.differentroads.es/api',
  travelersApiUrl: 'https://travelers-dev.differentroads.es/api',
  usersApiUrl: 'https://auth-dev.differentroads.es/api',

  // Scalapay
  scalapayApiKey: 'qhtfs87hjnc12kkos',

  // Configuración general
  retaileriddefault: 7,
};
