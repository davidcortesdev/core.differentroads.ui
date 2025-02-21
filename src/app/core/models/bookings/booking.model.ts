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

interface PriceData {
  id: string;
  value: number;
  value_with_campaign: number;
  campaign: string | null;
  age_group_name: string;
  category_name: string;
  period_product: string;
  _id: string;
}

interface OptionalActivity {
  status: string;
  activityId: string;
  description: string;
  externalID: string;
  name: string;
  optional: boolean;
  periodId: string;
  productType: string;
  availability: number;
  priceData: PriceData[];
  _id: string;
}
