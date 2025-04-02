export interface Airport {
  city: string;
  name: string;
  iata: string;
  country: string;
  translations?: {
    es?: {
      city?: string;
      name?: string;
      country?: string;
    }
  };
}