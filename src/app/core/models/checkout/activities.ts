/* eslint-disable import/no-cycle */

import { Price, PriceData } from './booking';

export type ActivityPeriod = {
  activityID: string;
  bookableAvailability: number;
  confirmed: boolean;
  guaranteedAvailability: number;
  id: string;
  name: string;
  description: string;
  numPax: number;
  optional: boolean;
  periodID: string;
  productType: string;
  serviceType: string;
  subType: string;
  prices?: Price[];
  availability: number;
  priceData?: PriceData[];
  activityId?: string;
  image?: string;
};
