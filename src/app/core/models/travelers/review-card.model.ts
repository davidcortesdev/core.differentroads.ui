/**
 * Represents a review card with traveler's feedback about a tour
 */
export interface ReviewCard {
  traveler: string;
  tour: string;
  review: string;
  score: number;
  date: string;
}