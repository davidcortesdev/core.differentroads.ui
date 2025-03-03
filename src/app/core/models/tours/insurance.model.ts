import { PriceData } from '../commons/price-data.model';

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
  price?: number;
  priceData?: PriceData[];
}
