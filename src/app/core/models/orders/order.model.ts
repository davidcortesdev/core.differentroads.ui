import { Pagination } from '../commons/pagination.model';
import { Flight } from '../tours/flight.model';

export interface Order {
  _id: string;
  ID: string;
  periodID: string;
  retailerID: string;
  status: 'AB' | 'Budget';
  owner: string;
  travelers?: OrderTraveler[];
  price?: number;
  createdAt?: string;
  updatedAt?: string;
  optionalActivitiesRef?: OptionalActivityRef[];
  insurancesRef?: OptionalActivityRef[];
  extraData?: any;
  flights?: Flight[] | { id: string; name?: string; externalID: string }[];
  summary?: SummaryItem[];
  discounts?: DiscountInfo[];
  payment?: PaymentOption;
}

export interface OptionalActivityRef {
  id: string;
  travelersAssigned: string[];
  name?: string;
  _id?: string;
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
  id?: string;
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

// Add this interface for summary items
export interface SummaryItem {
  qty: number;
  value: number;
  description: string;
}

// Add this interface for discount information
export interface DiscountInfo {
  code?: string;
  amount: number;
  description: string;
  type: string;
}

// Payment option interface
export interface PaymentOption {
  type: 'complete' | 'installments' | 'deposit';
  method?: 'creditCard' | 'transfer';
  installmentOption?: 'three' | 'four';
  source?: string;
  // Add properties for deposit payment
  depositAmount?: number;
}