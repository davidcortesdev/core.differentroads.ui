import { PriceData } from '../commons/price-data.model';
import { OrderTraveler, PaymentOption } from '../orders/order.model';
import { Flight } from '../tours/flight.model';
import { BookingTraveler } from './booking-traveler.model';

export interface Booking {
  _id: string;
  code: string;
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
  flights?: Flight[];
  createdAt?: string;
  travelers?: BookingTraveler[];
}

export interface BookingCreateInput {
  externalID: string;
  tour: {
    id: string;
    name: string;
    priceData?: PriceData[];
    _id?: string;
  };
  textSummary: any;
  total: number;
  priceData: any;
  name: string;
  id: string;
  extendedTotal: {
    description: string;
    value: number;
    qty: number;
  }[];
  dayOne: string;
  numberOfDays: number;
  returnDate: string;
  tourID: string;
  paymentTerms: any;
  redeemPoints: number;
  usePoints: Record<string, number>;
  payment?: PaymentOption;
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
