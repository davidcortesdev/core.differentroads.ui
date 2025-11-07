export const environment = {
  // Entorno
  production: false,

  // Cognito
  cognitoUserPoolId: 'us-east-2_KSSmf3Tt7',
  cognitoAppClientId: '216668bnnnnfvo2aq4ijs12mga',

  // Redsys
  redsysUrl: 'https://sis.redsys.es/sis/realizarPago',
  redsysFuc: '355960907',
  redsysClaveComercio: 'GFxyQ+7SuRWSA/GWaB55hOFwqr8ujxPn',
  redsysNotifyUrl:
    'https://qt4uw3rgx6.execute-api.us-east-2.amazonaws.com/release/redsys/notify',
  redsysMerchantTerminal: '2',

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
  amadeusApiUrl: 'https://amadeus-pre.differentroads.es/api',
  cmsApiUrl: 'https://cms-pre.differentroads.es/api',
  documentationApiUrl: 'https://documentation-pre.differentroads.es/api',
  hotelsApiUrl: 'https://hotels-pre.differentroads.es/api',
  locationsApiUrl: 'https://locations-pre.differentroads.es/api',
  masterdataApiUrl: 'https://masterdata-pre.differentroads.es/api',
  redsysApiUrl: 'https://redsys-pre.differentroads.es/api',
  reservationsApiUrl: 'https://reservations-pre.differentroads.es/api',
  reviewsApiUrl: 'https://reviews-pre.differentroads.es/api',
  scalapayApiUrl: 'https://scalapay-pre.differentroads.es/api',
  tourknifeApiUrl: 'https://tourknife-pre.differentroads.es/api',
  toursApiUrl: 'https://tour-pre.differentroads.es/api',
  travelersApiUrl: 'https://travelers-pre.differentroads.es/api',
  usersApiUrl: 'https://auth-pre.differentroads.es/api',

  // Scalapay
  scalapayApiKey: 'sp_44a434bb9da193abff2d0ecebb36c0595a884a26f60ce61bda5a55bec16073cb',
  scalapayEnvironment: 'integration',
  scalapayMerchantToken: '9MFV6DMBA',

  // Configuración general
  retaileriddefault: 7,

  // URLs externas
  tourOperationUrl: 'https://touroperacion-pre.differentroads.es',
};
