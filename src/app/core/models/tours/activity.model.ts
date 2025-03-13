import { CldImage } from '../commons/cld-image.model';
import { PriceData } from '../commons/price-data.model';

export interface Activity {
  id: string;
  status: string;
  activityId: string;
  activityImage?: CldImage[];
  description: string | null;
  externalID: string;
  name: string;
  day?: number;
  optional: boolean;
  recomended?: boolean;
  periodId: string;
  productType: string;
  price?: number;
  priceData?: PriceData[];
}
