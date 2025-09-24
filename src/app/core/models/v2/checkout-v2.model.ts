export interface ReservationData {
    id: number;
    tourId: number;
    departureId: number;
    totalAmount: number;
    totalPassengers: number;
    userId?: string;
  }
  
export interface DepartureData {
  id: number;
  departureDate: string;
  arrivalDate: string;
  itineraryId: number;
  retailerId: number;
  isVisibleOnWeb: boolean;
  isBookable: boolean;
}
  
  export interface TourData {
    id: number;
    name: string;
    slug?: string;
    itineraryId?: number;
  }
  
  export interface PriceData {
    [ageGroupName: string]: number;
  }
  
  export interface SummaryItem {
    description: string;
    value: number;
    qty: number;
    total: number;
    isDiscount?: boolean;
  }