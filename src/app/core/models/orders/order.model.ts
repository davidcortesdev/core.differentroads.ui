import { Pagination } from '../commons/pagination.model';

export interface Order {
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
  flights?: any;
}

export interface OptionalActivityRef {
  id: string;
  travelersAssigned: string[];
}

export interface OrderTraveler {
  lead: boolean;
  bookingID: string;
  flightID?: string;
  periodReservationModeID?: string;
  travelerData?: Record<string, any>;
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
