import { Activity } from './activity.model';
import { Insurance } from './insurance.model';
import { ReservationMode } from './reservation-mode.model';
import { Flight } from './flight.model';
import { CMSCollections } from '../commons/cms-collections.model';
import { PeriodHotel } from './tour.model';

export interface Period extends CMSCollections {
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
}
