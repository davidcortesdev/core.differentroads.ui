/**
 * Flight search parameters
 */
export interface FlightOffersParams {
  originLocationCode: string;
  destinationLocationCode: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  children?: number;
  infants?: number;
  travelClass?: 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST';
  nonStop?: boolean;
  currencyCode?: string;
  max?: number;
  maxPrice?: number;
  maxPriceCurrency?: string;
  includedAirlineCodes?: string;
  excludedAirlineCodes?: string;
}

// Type guard for FlightOffersParams
export function isFlightOffersParams(obj: any): obj is FlightOffersParams {
  return (
    obj &&
    typeof obj.originLocationCode === 'string' &&
    typeof obj.destinationLocationCode === 'string' &&
    typeof obj.departureDate === 'string' &&
    typeof obj.adults === 'number'
  );
}

/**
 * Flight offer structure
 */
export interface FlightOffer {
  id: string;
  type: string;
  source: string;
  itineraries: any[];
  price: {
    currency: string;
    total: string;
    base: string;
    fees: any[];
    grandTotal: string;
  };
  pricingOptions: any;
  validatingAirlineCodes: string[];
  travelerPricings: any[];
}

// Type guard for FlightOffer
export function isFlightOffer(obj: any): obj is FlightOffer {
  return obj && typeof obj.id === 'string' && Array.isArray(obj.itineraries);
}

/**
 * Flight offer with pricing information
 */
export interface FlightOfferPrice extends FlightOffer {
  // Additional pricing information
}

/**
 * Traveler information for booking
 */
export interface Traveler {
  id: string;
  dateOfBirth: string;
  name: {
    firstName: string;
    lastName: string;
  };
  gender: 'MALE' | 'FEMALE';
  contact: {
    emailAddress: string;
    phones: {
      deviceType: 'MOBILE' | 'LANDLINE';
      countryCallingCode: string;
      number: string;
    }[];
  };
  documents?: {
    documentType: 'PASSPORT' | 'ID_CARD';
    birthPlace?: string;
    issuanceLocation?: string;
    issuanceDate?: string;
    number: string;
    expiryDate: string;
    issuanceCountry: string;
    validityCountry: string;
    nationality: string;
    holder: boolean;
  }[];
}

// Type guard for Traveler
export function isTraveler(obj: any): obj is Traveler {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'object' &&
    typeof obj.name.firstName === 'string' &&
    typeof obj.name.lastName === 'string'
  );
}

/**
 * Order response
 */
export interface FlightOrderResponse {
  id: string;
  queuingOfficeId: string;
  associatedRecords: any[];
  flightOffers: FlightOffer[];
  travelers: Traveler[];
}

/**
 * Interface for temporary stored flight offers
 */
export interface ITempFlightOffer {
  _id: string;
  offerData: FlightOffer;
  pricingData?: FlightOffer;
  bookingData?: any;
}
