/**
 * Represents a review card with traveler's feedback about a tour
 */
export interface ReviewCard {
  travelerId: number;
  traveler: string;
  tourId: number;
  tour: string;
  review: string;
  score: number;
  date: string;
}