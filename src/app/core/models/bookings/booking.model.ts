import { OrderTraveler } from '../orders/order.model';

export interface Booking {
  id: string;
  ID: string;
  orderId: string;
  status: string;
  periodData?: Record<string, any>;
  retailerID?: string;
  optionalActivitiesRef?: OptionalActivityRef[];
  insurancesRef?: OptionalActivityRef[];
  owner: string;
  externalID: string;
  travelersNumber: number;
  extraData?: any;
  deadlines?: any[];
  flights?: any;
  createdAt?: string;
}

export interface BookingCreateInput {
  externalID: string;
  tour: string;
  summary: string;
  total: number;
  priceData: any;
  name: string;
  id: string;
  extendedTotal: number;
  dayOne: string;
  numberOfDays: number;
  returnDate: Date;
  tourID: string;
  paymentTerms: any;
  redeemPoints: number;
  usePoints: number;
}

export interface GetAllBookingsParams {
  page?: number;
  limit?: number;
  keyword?: string;
  retailersIDs?: string[];
  status?: string[];
  periodId?: string[];
  minDate?: string;
  maxDate?: string;
}

export interface OptionalActivityRef {
  id: string;
  travelersAssigned: string[];
}
