import { Component, Input } from '@angular/core';
import { ReviewCard } from '../../../../shared/models/reviews/review-card.model';
import { Reviews } from '../../../../core/models/home/travelers/reviews.model';

@Component({
  selector: 'app-tour-reviews',
  standalone: false,
  
  templateUrl: './tour-reviews.component.html',
  styleUrl: './tour-reviews.component.scss'
})
export class TourReviewsComponent {
  @Input() reviews: Reviews | null = null;

  asd: ReviewCard[] = [];
  get reviewsCards(): ReviewCard[] {
    return this.reviews ? this.reviews['reviews-cards'] : [];
  }
}
