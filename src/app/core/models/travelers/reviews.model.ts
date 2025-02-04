import { ReviewCard } from './review-card.model';

/**
 * Represents the reviews section structure
 */
export interface Reviews {
  title: string;
  'reviews-cards': ReviewCard[];
}