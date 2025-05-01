export interface BookingTraveler {
  _id: string;
  lead: boolean;
  bookingSID: string;
  flightID?: string;
  periodReservationModeID?: string;
  optionalActivitiesIDs?: string[];
  travelerData?: TravelerData;
  insuranceID?: string;
  bookingID: string;
  externalID?: string;
  flightData?: Record<string, any>;
}

export interface TravelerData {
  ageGroup?: string;
  birthdate?: string;
  category?: string;
  dni?: string;
  documentType?: string;
  email?: string;
  name?: string;
  nationality?: string;
  passportExpirationDate?: string;
  passportID?: string;
  passportIssueDate?: string;
  phone?: string;
  postalCode?: string;
  sex?: string;
  surname?: string;
  minorIdExpirationDate?: string;
  minorIdIssueDate?: string;
  associatedAdult?: string;
  ciudad?: string;
  codigoPostal?: string;
}
