/* eslint-disable import/no-cycle */
import { Price, PriceData } from './booking';

export interface PeriodReservationMode {
  availability: number;
  comment?: string;
  description?: string;
  id: string;
  deleted?: boolean;
  name: string;
  periodID: string;
  places: number;
  rawPlaces: number;
  reservationModeID: string;
  shareRoom: number;
  externalID?: string;
  qty?: number;
  period_reservation_mode_id?: string;
  prices: Price[];
  priceData: PriceData[];
}
