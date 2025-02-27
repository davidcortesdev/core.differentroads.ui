/* eslint-disable no-shadow */
/* eslint-disable no-unused-vars */
/* eslint-disable import/no-cycle */

import { ActivityPeriod } from './activities';
import { Booking } from './booking';
import { Flight } from './checkout';
import { PeriodReservationMode } from './reservation-modes';

export enum TRAVELERS_GENRER {
  MALE = 'Male',
  FEMALE = 'Female',
}

export type CreateOrUpdateTravelerInput = {
  bookingID: string;
  flightID: string;
  periodReservationModeID?: string;
  lead: boolean;
  travelerData?: string;
  optionalActivitiesIDs?: string[];
  insuranceID?: string;
};

export type TravelerData = {
  name: string;
  surname: string;
  email: string;
  phone?: string;
  dni: string;
  birthdate?: string;
  sex?: TRAVELERS_GENRER;
  postalCode?: string;
  passportID: string;
  nationality: string;
  passportExpirationDate: string;
  passportIssueDate: string;
  ageGroup: string;
  confirmEmail?: boolean;
  documentType?: string;
  associatedAdult?: string;
  category?: string;
  profileImage?: Object;
};

export type ExtraData = {
  type: string;
  description?: string;
};

export type BookingTraveler = {
  booking?: Booking;
  bookingID: string;
  flight?: Flight;
  flightID?: string;
  id?: string;
  _id?: string;
  lead: boolean;
  optionalActivities?: ActivityPeriod[];
  optionalActivitiesIDs?: string[];
  periodReservationMode?: PeriodReservationMode;
  periodReservationModeID?: string;
  externalID?: string;
  travelerData?: TravelerData;
  createdAt?: string;
  updatedAt?: string;
  insuranceID?: string;
  extras?: ExtraData[];
};

export type UserPointsChecks = {
  userName: string;
  points: number;
  travelerCategory: string;
  maxPoints: number;
  id: string;
};
