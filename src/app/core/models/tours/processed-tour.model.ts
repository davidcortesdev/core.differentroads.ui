export interface ProcessedTour {
  imageUrl: string;
  title: string;
  description: string;
  rating: number;
  tag?: string;
  price: number;
  availableMonths: string[];
  isByDr: boolean;
  webSlug: string;
  tripType?: string[];
}
