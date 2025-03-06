export interface ReservationMode {
  id: string;
  status: string;
  description: string;
  externalID: string;
  name: string;
  places: number;
  qty?: number;
  price: number;
}
