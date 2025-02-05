export interface Tour {
  id: string;
  title: string;
  description: string;
  duration: number;
  price: number;
  currency: string;
  startDate: string;
  endDate: string;
  locations: Location[];
  images: Image[];
  itinerary: Itinerary[];
  inclusions: string[];
  exclusions: string[];
  highlights: string[];
  termsAndConditions: string;
  additionalInfo: string;
}

export interface Location {
  name: string;
  latitude: number;
  longitude: number;
  description: string;
  address: string;
  city: string;
  country: string;
}

export interface Image {
  url: string;
  altText: string;
  caption: string;
}

export interface Itinerary {
  day: number;
  title: string;
  description: string;
  activities: string[];
  mealsIncluded: string[];
}
