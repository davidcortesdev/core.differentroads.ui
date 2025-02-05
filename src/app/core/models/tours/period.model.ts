export interface Activity {
  id: string;
  status: string;
  activityId: string;
  description: string | null;
  externalID: string;
  name: string;
  optional: boolean;
  periodId: string;
  productType: string;
}

export interface Insurance {
  id: string;
  status: string;
  activityId: string;
  description: string | null;
  externalID: string;
  name: string;
  optional: boolean;
  periodId: string;
  productType: string;
}

export interface ReservationMode {
  id: string;
  status: string;
  description: string;
  externalID: string;
  name: string;
  places: number;
}

export interface Airline {
  name: string;
  email: string;
  logo: string;
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
  inbound: {
    activityID: number;
    availability: number;
    date: string;
    name: string;
    prices: any[];
    segments: FlightSegment[];
    serviceCombinationID: number;
  };
  name: string;
  outbound: {
    activityID: number;
    availability: number;
    date: string;
    name: string;
    prices: {
      age_group_name: string;
      campaign: string | null;
      category_name: string;
      id: string;
      period_product: string;
      value: number;
      value_with_campaign: number;
    }[];
    segments: FlightSegment[];
    serviceCombinationID: number;
  };
}

export interface Period {
  id: string;
  status: string;
  activities: Activity[];
  dayOne: string;
  externalID: string;
  insurances: Insurance[];
  itineraryId: string;
  name: string;
  numberOfDays: number;
  reservationModes: ReservationMode[];
  returnDate: string;
  tourID: string;
  tourName: string;
  tripType: string;
  flights: Flight[];
  updatedAt: string;
  availableLangs: string[];
  isLangAvailable: boolean;
}
