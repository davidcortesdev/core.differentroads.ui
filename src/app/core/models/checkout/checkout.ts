export type Price = {
  id: string;
  value: number;
  value_with_campaign: number;
  campaign: string | null;
  age_group_name: string;
  category_name: string;
  period_product: string;
};

export type getCMSPeriodInfoProps = {
  periodID: string;
  selectedFields?: string;
  lang?: string;
};

export type Activity = {
  _id: string;
  activityId: string;
  status: string;
  description: string;
  externalID: string;
  name: string;
  optional: boolean;
  periodId: string;
  productType: string | null;
  availability: number;
  priceData: Price[];
};

export type Insurance = {
  _id: string;
  activityId: string;
  status: string;
  description: string;
  externalID: string;
  name: string;
  optional: boolean;
  periodId: string;
  productType: string | null;
  availability: number;
  priceData: Price[];
};

export type ReservationMode = {
  _id: string;
  status: string;
  description: string;
  externalID: string;
  name: string;
  places: number;
  period_reservation_mode_id: string;
  periodID: string;
  availability: number;
  priceData: Price[];
};

export type Airline = {
  name: string;
  email: string;
  logo: string;
};

export type FlightSegment = {
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
};

export type FlightDetails = {
  name: string;
  date: string;
  serviceCombinationID: number;
  activityID: number;
  segments: FlightSegment[];
  prices: Price[];
  availability: number;
};

export type Flight = {
  name: string;
  incomplete?: boolean;
  serviceCombinationID?: number;
  activityID?: number;
  outbound?: FlightDetails;
  inbound?: FlightDetails;
};

export type CMSPeriodData = {
  tourID: string;
  tourName: string;
  activities: Activity[];
  insurances: Insurance[];
  reservationModes: ReservationMode[];
};

export type CMSPeriodPrices = Record<string, Price>;

export type Tour = {
  id: string;
  name: string;
  priceFrom: number;
  priceData: Price[];
};

export type Period = {
  id: string;
  status: string;
  activities: Activity[];
  dayOne: string;
  externalID: string;
  flights: Flight[];
  insurances: Insurance[];
  itineraryId: string;
  name: string;
  numberOfDays: number;
  reservationModes: ReservationMode[];
  returnDate: string;
  tourID: string;
  tourName: string;
  tripType: string;
  availability: number;
  priceData: Price[];
  tour: Tour;
};

export type OrderData = {
  _id: string;
  periodID: string;
  retailerID: string;
  status: string;
  owner: string;
  flights: Flight[];
  travelers: any[];
  optionalActivitiesRef: any[];
  createdAt: string;
  updatedAt: string;
  __v: number;
  id: string;
  period: Period;
};
