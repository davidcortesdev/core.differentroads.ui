import { Component, Input, OnInit } from '@angular/core';
import { ReviewCard } from '../../../../../../shared/models/reviews/review-card.model';
import { Reviews } from '../../../../../../core/models/blocks/travelers/reviews.model';

@Component({
  selector: 'app-community-reviews',
  standalone: false,
  templateUrl: './community-reviews.component.html',
  styleUrls: ['./community-reviews.component.scss'],
})
export class CommunityReviewsComponent implements OnInit {
  @Input() reviews: Reviews | null = null;
  reviewsCards: ReviewCard[] = [];
  reviewsFilter = { showOnHomePage: true };

  ngOnInit(): void {
    // The loading and reviews will now be handled by the shared component
  }

  onReviewsLoaded(reviews: ReviewCard[]): void {
    this.reviewsCards = reviews;
  }
}
