import { CldImage } from '../commons/cld-image.model';

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
