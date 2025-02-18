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
}

export interface Expert {
  ephoto: CldImage[];
  name: string;
  charge: string;
  opinion: string;
}

export interface Itinerary {
  title: string;
  dayCard: DayCard[];
}

export interface DayCard {
  title: string;
  name: string;
  itimage: CldImage[];
  hotel: Hotel;
  description: string;
}

export interface Hotel {
  name: string;
  category: string;
  address: string;
  link: string;
  hotelimage: CldImage[];
}

export interface CardList {
  cimage: CldImage[];
  title: string;
  included: boolean;
  subtitle: string;
}

export interface ExtraInfoSection {
  infoCard: any[];
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

/* export interface TravelersSection {
  title: string;
  travelersCards: TravelersCard[];
} */

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
