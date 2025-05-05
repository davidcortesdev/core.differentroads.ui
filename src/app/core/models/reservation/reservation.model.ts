export interface TravelerInfo {
  name: string;
  email: string;
  phone: string;
  gender: string;
  room: string;
}

export interface Flight {
  date: string;
  airline: {
    name: string;
    logo: string;
    code: string;
  };
  departure: {
    time: string;
    airport: string;
    city: string;
    iata: string;
  };
  arrival: {
    time: string;
    airport: string;
    city: string;
    iata: string;
  };
  flightNumber: string;
  type: 'direct' | 'layover';
  layoverCity?: string;
}

export interface PriceDetail {
  description: string;
  amount: number;
  quantity: number;
  total: number;
}

export interface PaymentInfo {
  totalAmount: number;
}

export interface BankInfo {
  name: string;
  account: string;
  beneficiary: string;
  concept: string;
}

export interface TripDetails {
  destination: string;
  period: string;
  travelers: string;
}

export interface ReservationInfo {
  status: 'confirm' | 'rq' | 'transfer';
  reservationNumber: string;
  date: string;
  amount: string;
  customerName: string;
  tripDetails: TripDetails;
  travelers: TravelerInfo[];
  totalAmount: number;
}
