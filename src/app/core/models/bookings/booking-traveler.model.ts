export interface BookingTraveler {
  lead: boolean;
  bookingSID: string;
  flightID?: string;
  periodReservationModeID?: string;
  optionalActivitiesIDs?: string[];
  travelerData?: Record<string, any>;
  insuranceID?: string;
  bookingID: string;
  externalID?: string;
  flightData?: Record<string, any>;
}
