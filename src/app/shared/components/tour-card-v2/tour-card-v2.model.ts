export interface TourDataV2 {
  imageUrl: string;
  title: string;
  rating: number;
  isByDr?: boolean;
  tag?: string;
  description: string;
  price: number;
  availableMonths: string[];
  webSlug: string;
  tripType?: string[];
  externalID?: string;
  // ✅ NUEVOS CAMPOS: Para fechas de departure
  departureDates?: string[];
  nextDepartureDate?: string;
  // ✅ NUEVOS CAMPOS: Para días de itinerario
  itineraryDaysCount?: number;
  itineraryDaysText?: string; // Texto formateado como "Colombia en: 10 días"
}

export enum TripTypeV2 {
  Single = 'single',
  Grupo = 'grupo',
  Propios = 'propios',
  Fit = 'fit',
}

export type TripTypeKeyV2 = (typeof TripTypeV2)[keyof typeof TripTypeV2];

export interface TripTypeInfoV2 {
  label: string;
  class: string;
}
