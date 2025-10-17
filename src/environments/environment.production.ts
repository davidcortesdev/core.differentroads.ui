export const environment = {
  // Entorno
  production: true,

  // Cognito
  cognitoUserPoolId: 'us-east-2_KSSmf3Tt7',
  cognitoAppClientId: '216668bnnnnfvo2aq4ijs12mga',

  // Redsys
  redsysUrl: 'https://sis.redsys.es/sis/realizarPago',
  redsysFuc: '355960907',
  redsysClaveComercio: 'GFxyQ+7SuRWSA/GWaB55hOFwqr8ujxPn',
  redsysNotifyUrl: 'https://qt4uw3rgx6.execute-api.us-east-2.amazonaws.com/prod/redsys/notify',
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
  amadeusApiUrl: 'https://amadeus.differentroads.es/api',
  cmsApiUrl: 'https://cms.differentroads.es/api',
  hotelsApiUrl: 'https://hotels.differentroads.es/api',
  locationsApiUrl: 'https://locations.differentroads.es/api',
  masterdataApiUrl: 'https://masterdata.differentroads.es/api',
  redsysApiUrl: 'https://redsys.differentroads.es/api',
  reservationsApiUrl: 'https://reservations.differentroads.es/api',
  reviewsApiUrl: 'https://reviews.differentroads.es/api',
  scalapayApiUrl: 'https://scalapay.differentroads.es/api',
  tourknifeApiUrl: 'https://tourknife.differentroads.es/api',
  toursApiUrl: 'https://tour.differentroads.es/api',
  travelersApiUrl: 'https://travelers.differentroads.es/api',
  usersApiUrl: 'https://auth.differentroads.es/api',

  // Scalapay
  scalapayApiKey: 'qhtfs87hjnc12kkos',

  // Configuración general
  retaileriddefault: 7,
  
  // URLs externas
  tourOperationUrl: 'https://touroperacion.differentroads.es',
};
