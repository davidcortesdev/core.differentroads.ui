/* eslint-disable import/no-cycle */

import { PriceData } from './booking';

export type FlightPrice = {
  ageGroup: string;
  amount: number;
};

export type Airline = {
  name: string;
  logo: string;
};

export type Flight = {
  externalID: string;
  name: string;
  productType: string | null;
  type: 'outbound' | 'inbound';
  departureDate: string; // ISO date string
  arriveDate: string; // ISO date string
  provider: string;
  rank: number;
  destinationAbrCity: string;
  departureAbrCity: string;
  scales: number;
  durationTime: string;
  numbers: string[];
  joinParam: string;
  airline: Airline;
  prices: FlightPrice[];
  activityID: number;
};

export type SingleFlight = {
  name: string;
  date?: string;
  departureCity: string;
  departureTime: string;
  departureIata: string;
  arrivalCity: string;
  arrivalTime: string;
  arrivalIata: string;
  flightNumber: string;
  numNights: number;
  differential: number;
  order: number;
  airline: {
    name: string;
    email: string;
    logo: string;
  };
};

export type FlightPart = {
  serviceCombinationID: string;
  activityID: string;
  segments: SingleFlight[];
  prices?: PriceData[];
  date?: string;
};

export type FlightNew = {
  name: string;

  inbound: FlightPart;
  outbound: FlightPart;
};
