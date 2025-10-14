import { Activity } from './activity.model';
import { Insurance } from './insurance.model';
import { ReservationMode } from './reservation-mode.model';
import { Flight } from './flight.model';
import { PeriodHotel } from './tour.model';
 
export enum ReservationFieldMandatory {
  ALL = 'ALL',
  LEAD = 'LEAD',
  NONE = 'NONE',
}
export interface Period {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  availableLangs: string[];
  isLangAvailable: boolean;
  dayOne: string;
  externalID: string;
  name: string;
  numberOfDays: number;
  returnDate: string;
  tourID: string;
  tourName: string;
  tripType: string;
  activities?: Activity[];
  reservationModes?: ReservationMode[];
  insurances?: Insurance[];
  flights?: Flight[];
  hotels?: [
    {
      hotels: PeriodHotel[];
      days: string[];
    }
  ];
  includedActivities?: Activity[];
  consolidator: {
    airportsFilters: string[];
    includeTourConfig: boolean;
  };
  reservationFields?: [
    {
      id: number;
      name: string;
      key: string;
      mandatory: ReservationFieldMandatory;
    }
  ];
}