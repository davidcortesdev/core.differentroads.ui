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

// Interfaces for points redemption
export interface TravelerData {
  id: string;
  name: string;
  email: string;
  hasEmail: boolean;
  maxPoints: number;
  assignedPoints: number;
}

export interface PointsRedemptionConfig {
  enabled: boolean;
  totalPointsToUse: number;
  pointsPerTraveler: { [travelerId: string]: number };
  maxDiscountPerTraveler: number;
  totalDiscount: number;
}

export interface TravelerPointsSummary {
  travelerId: string;
  currentCategory: string;
  totalPoints: number;
  availablePoints: number;
  usedPoints: number;
  categoryStartDate: Date;
  nextCategory?: string;
  pointsToNextCategory?: number;
}

export interface ValidationResult {
  isValid: boolean;
  message: string;
  errorType: string;
  details?: string[];
}

export interface PointsDistributionSummary {
  totalPoints: number;
  totalDiscount: number;
  travelersWithPoints: number;
  mainTravelerPoints: number;
}