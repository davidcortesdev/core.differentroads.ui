export interface Booking {
  id: string;
  // ...other properties...
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

export interface Traveler {
  id: string;
  // ...other properties...
}

export interface Payment {
  id: string;
  // ...other properties...
}
