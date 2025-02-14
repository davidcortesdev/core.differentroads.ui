import { Reviews } from './reviews.model';
import { TravelerCard } from './traveler-card.model';
import { Featured } from './featured.model';

/**
 * Represents the complete travelers section structure
 */
export interface TravelersSection {
  title: string;

  reviews: Reviews;
  'travelers-cards': TravelerCard[];
  featured: Featured;
}
