/* eslint-disable import/no-cycle */

import { ActivityPeriod } from './activities';
import { Tour } from './checkout';
import { PeriodReservationMode } from './reservation-modes';

export type Period = {
  activities: ActivityPeriod[];
  bookableAvailavility: number;
  dayOne: string;
  day_one?: string;
  id: string;
  numberOfDays: number;
  outdated?: boolean;
  publishWeb?: boolean;
  reservationModes?: PeriodReservationMode[];
  returnDate: string;
  externalID?: string;
  tourID: string;
  tour?: Tour;
  tourName?: string;
  tripType?: string;
  trip_type?: string;
  webBookable?: boolean;
  name?: string;
  total?: number;
  extendedTotal?: any;
  summary?: any;
  flights?: any;
};
