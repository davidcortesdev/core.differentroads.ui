import { Component, Input } from '@angular/core';
import { Reviews } from '../../../../../../core/models/home/travelers/reviews.model';
import { ReviewCard } from '../../../../../../shared/models/reviews/review-card.model';

@Component({
  selector: 'app-community-reviews',
  standalone: false,
  templateUrl: './community-reviews.component.html',
  styleUrls: ['./community-reviews.component.scss'],
})
export class CommunityReviewsComponent {
  @Input() reviews: Reviews | null = null;

  get reviewsCards(): ReviewCard[] {
    return this.reviews ? this.reviews['reviews-cards'] : [];
  }

}
