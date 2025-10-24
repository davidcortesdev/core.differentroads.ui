import { IReviewResponse } from '../../services/reviews/reviews.service';

export interface IEnrichedReviewResponse extends IReviewResponse {
  traveler?: string;
  tour?: string;
  tourSlug?: string;
  review?: string;
  score?: number;
  date?: string;
  tourName?: string;
}
