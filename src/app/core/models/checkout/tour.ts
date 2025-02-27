export interface IItineraryDays {
  name?: string;
}

export interface IImage {
  alt: string;
  format: string;
  origin: string;
  publicID: string;
  type: string;
  url: string;
}

export interface IHotel {
  address: string;
  category: string;
  link: string;
  name: string;
  hotelimage: IImage[];
}

export interface IDayCard {
  description: string;
  itimage: IImage[];
  title: string;
  name: string;
  hotel?: IHotel;
}

export interface IItinerary {
  title: string;
  'day-card': IDayCard[];
}

export interface IPrices {
  ageGroup: string;
  price: number;
}
export interface IActivity {
  name: string;
  prices: {
    items: IPrices[];
  };
  description: string;
  image: string;
  id: string;
}

export type ReservationMode = {
  id: string;
  name: string;
  places: number;
  description: string;
  prices: {
    items: IPrices[];
  };
};

export interface IPeriod {
  id: string;
  day_one: string;
  return_date: string;
  name: string;
  itinerary?: IItinerary;
  optionalActivities?: IActivity[];
  reservationModes: ReservationMode[];
}

export interface IHighlight {
  title: string;
  subtitle: string;
  cimage: any;
  tag: string;
  included: boolean;
}

export interface IExtraInfo {
  title: string;
  'info-card': {
    title: string;
    content: string;
  }[];
}

export type Tour = {
  id: string;
  name: string;
  banner: string;
  description: string;
  continent: string;
  country: string;
  category: string;
  duration: string;
  departureDate: string;
  periods: IPeriod[];
  seasons: string[];
  priceFrom: number;
  departureCities: string[];
  imageUrl: string;
  available: boolean;
  webSlug: string;
  price: string;
  highlights: IHighlight[];
  cities: string[];
  categories: string[];
  benefits: string[];
  other_benefits: string[];
};

export interface TourSectionProps {
  tours: Tour[];
  // eslint-disable-next-line no-unused-vars
  handleViewTour: (id: string) => void;
}

export interface TourFilters {
  continent: string;
  country: string;
  category: string;
  season: string;
  tourName: string;
  departureDate: string;
  minPrice: number;
  maxPrice: number;
}

export interface FilterSectionProps {
  filters: TourFilters;
  options: {
    continents: string[];
    countries: string[];
    categories: string[];
    seasons: string[];
  };
  // eslint-disable-next-line no-unused-vars
  onInputChange: (field: keyof TourFilters, value: string | number) => void;
}

export type SwiperOptions = {
  slidesPerView?: number;
  spaceBetween?: number;
};
