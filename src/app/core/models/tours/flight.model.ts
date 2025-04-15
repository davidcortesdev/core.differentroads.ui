import { PriceData } from '../commons/price-data.model';

export interface Airline {
  name: string;
  email: string;
  logo: string;
  code: string;
}

export interface FlightSegment {
  departureCity: string;
  arrivalCity: string;
  flightNumber: string;
  departureIata: string;
  departureTime: string;
  arrivalTime: string;
  arrivalIata: string;
  numNights: number;
  differential: number;
  order: number;
  airline: Airline;
}

export interface Flight {
  id: string;
  externalID: string;
  source?: string;
  inbound: {
    activityID: number;
    availability: number;
    date: string;
    name: string;
    segments: FlightSegment[];
    serviceCombinationID: number;
    prices?: PriceData[];
    activityName?: string;
  };
  name: string;
  outbound: {
    activityID: number;
    availability: number;
    date: string;
    name: string;
    segments: FlightSegment[];
    serviceCombinationID: number;
    prices?: PriceData[];
    activityName?: string;
  };
  price?: number;
  priceData?: PriceData[];
}
