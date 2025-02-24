/* eslint-disable import/no-cycle */

import { Period, Tour } from './checkout';
import { BookingTraveler } from './travelers';

export type Price = {
  ageGroup: string;
  amount: number;
};

export type Room = {
  places: number;
  roomId: string;
  travelersAsigned?: string[];
  prices: Price[];
  qty: number;
  name: string;
};

export type OptionalActivity = {
  prices: Price[];
  name: string;
  description: string;
  id: string;
  travelersAssigned: string[];
  externalID?: string;
};

export type Insurance = {
  prices: Price[];
  name: string;
  description: string;
  id: string;
  travelersAssigned: string[];
  externalID?: string;
};

export type TKBookingCreateInput = {
  externalID?: string;
  status: string;
  periodID: string;
  flightID: number;
  owner?: string;
  retailerID: string;
  travelers?: BookingTraveler[];
  optionalActivitiesRef?: OptionalActivity[];
  insurancesRef?: Insurance[];
  cribService?: boolean;
  flights?: any[];
};

export type TKBookingUpdateInput = {
  externalID?: string;
  status: string;
  periodID?: string;
  roomates?: string;
};

export type Booking = {
  id: string;
  _id?: string;
  periodID: string;
  period?: Period;
  periodData?: Period;
  status: string;
  travelers?: BookingTraveler[];
  externalID?: string;
  updatedAt: string;
  createdAt: string;
  optionalActivitiesRef?: OptionalActivity[];
  insurancesRef?: Insurance[];
  flights?: any[];
  tour: Tour;
  deadlines?: any[];
  owner?: string;
};

export type BookingInput = {
  travelers?: BookingTraveler[];
  optionalActivitiesRef?: OptionalActivity[];
  insurancesRef?: Insurance[];
  status?: string;
  extraData?: any;
};
