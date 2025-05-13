import { CldImage } from '../commons/cld-image.model';
import { CMSCollections } from '../commons/cms-collections.model';
import { SEO } from '../commons/seo.model';

export interface Tour extends CMSCollections {
  description: string;
  externalID: string;
  name: string;
  subtitle: string;
  country: string;
  webSlug: string;
  tags: string[];
  vtags: string[];
  monthTags: string[];
  cities: string[];
  price: number;
  image: CldImage[];
  expert: Expert;
  seo: SEO;
  'itinerary-section': Itinerary;
  'card-list': CardList[];
  'extra-info-section': ExtraInfoSection;
  'highlights-title': string;
  activePeriods: ActivePeriod[];
  nextDeparture: string;
  basePrice: number;
  marketingSection: MarketingSection;
  'travelers-section': TravelersSection;
  supportSection: SupportSection;
  continent: string;
  tourType: string;
  'info-practica': InfoPractica;
  consolidator: {
    airportsFilters: string[];
  };
}

export interface Expert {
  ephoto: CldImage[];
  name: string;
  charge: string;
  opinion: string;
}

export interface Itinerary {
  title: string;
  'day-card': DayCard[];
  itineraries: {
    id: number;
    iname: string;
    periods: string[];
    days: DayCard[];
  }[];
}

export interface DayCard {
  id?: number;
  title: string;
  name: string;
  itimage: CldImage[];
  hotel: Hotel;
  description: string;
  longDescription?: string;
  extraInfo?: {
    title: string;
    content: string;
  };
}

export interface Hotel {
  id: string;
  name: string;
  externalID: string;
  city?: string;
  description?: string;
  address: string;
  category: string;
  phone?: string | null;
  provider?: string;
  link: string;
  rank?: number;
  bookingLink?: string;
  bookingRank?: string;
  hotelimage: CldImage[];
  availableLangs?: string[];
  isLangAvailable?: boolean;
}

export interface PeriodHotel {
  id: string;
  name: string;
  externalID: string;
}

export interface CardList {
  cimage: CldImage[];
  title: string;
  included: boolean;
  subtitle: string;
}

export interface ExtraInfoSection {
  'info-card': any[];
}

export interface MarketingSection {
  marketingTag: string;
  marketingSubtitle?: string;
  marketingSeasonTag?: string;
  marketingText?: string;
}

export interface ActivePeriod {
  dayOne: string;
  returnDate: string;
  days: number;
  month: string;
  id: number;
  basePrice: number;
  flights: Flight[];
  name: string;
  externalID: number;
  tripType: string;
}

export interface Flight {
  name: string;
  serviceCombinationID: number;
  activityID: number;
  prices: number;
}

export interface TravelersSection {
  title: string;
  'travelers-cards': TravelersCard[];
}

export interface TravelersCard {
  timage: CldImage[];
  location: string;
  account: string;
  cLink: string;
  featured: boolean;
}

export interface SupportSection {
  fileLink: string;
  posterLink: string;
  socialLink: string;
}

export interface InfoPractica {
  afterTrip: string;
  arrivalToDestination: string;
  beforeTrip: string;
  discover: string;
  emergencyContacts: string;
  extraInformation: string;
  includedServices: string;
  notIncludedServices: string;
  tripIncludes: string;
}
