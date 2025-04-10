import { Component, Input, OnInit } from '@angular/core';
import { ReviewCard } from '../../../../shared/models/reviews/review-card.model';
import { Reviews } from '../../../../core/models/blocks/travelers/reviews.model';

@Component({
  selector: 'app-tour-reviews',
  standalone: false,
  templateUrl: './tour-reviews.component.html',
  styleUrl: './tour-reviews.component.scss',
})
export class TourReviewsComponent implements OnInit {
  @Input() reviews: Reviews | null = null;
  @Input() tourExternalId: string | undefined = undefined;
  
  reviewsCards: ReviewCard[] = [];
  loading = false;

  ngOnInit(): void {
    // The loading and reviews will now be handled by the shared component
  }

  onReviewsLoaded(reviews: ReviewCard[]): void {
    this.reviewsCards = reviews;
  }

  onLoadingChange(loading: boolean): void {
    this.loading = loading;
  }
}
