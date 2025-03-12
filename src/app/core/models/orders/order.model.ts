import { Pagination } from '../commons/pagination.model';
import { Flight } from '../tours/flight.model';

export interface Order {
  _id: string;
  id: string;
  periodID: string;
  retailerID: string;
  status: 'AB' | 'Budget';
  owner: string;
  travelers?: OrderTraveler[];
  createdAt?: string;
  updatedAt?: string;
  optionalActivitiesRef?: OptionalActivityRef[];
  insurancesRef?: OptionalActivityRef[];
  extraData?: any;
  flights?: Flight[] | { id: string }[];
}

export interface OptionalActivityRef {
  id: string;
  travelersAssigned: string[];
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
}

export interface OrderTraveler {
  lead?: boolean;
  bookingID?: string;
  flightID?: string;
  periodReservationModeID?: string;
  travelerData?: TravelerData;
  optionalActivitiesIDs?: string[];
  insuranceID?: string;
  _id?: string;
}

export interface GetAllOrdersParams {
  page?: number;
  limit?: number;
  keyword?: string;
  retailersID?: string[];
  status?: string[];
  periodId?: string[];
  minDate?: string;
  maxDate?: string;
  withTourData?: boolean;
}

export interface CreateBookingResult {
  ID: string;
  bookingID: string;
  order: Partial<Order>;
  // ...otros campos según sea necesario...
}

export interface OrderListResponse {
  data: Order[];
  pagination: Pagination;
}
