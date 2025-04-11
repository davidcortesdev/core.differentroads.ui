import { Component, Input, OnInit } from '@angular/core';
import { ReviewCard } from '../../../../../../shared/models/reviews/review-card.model';
import { Reviews } from '../../../../../../core/models/blocks/travelers/reviews.model';
import { ReviewsService } from '../../../../../../core/services/reviews.service';

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
  loading = false;

  constructor(
    private reviewsService: ReviewsService
  ) {}

  ngOnInit(): void {
    this.loadReviews();
  }

  loadReviews(): void {
    this.loading = true;
    
    this.reviewsService.getTopReviews(25, { 
      showOnHomePage: true,
      status: 'ACTIVE'
    }).subscribe({
      next: (reviews) => {
        // Map the API reviews to ReviewCard format
        this.reviewsCards = reviews.map(review => ({
          review: review.text,
          score: review.rating,
          traveler: '',
          tour: '',
          date: review.reviewDate,
          tourId: review.tourId,
          travelerId: review.travelerId
        }));
        this.loading = false;
        this.onReviewsLoaded(this.reviewsCards);
      },
      error: (error) => {
        console.error('Error fetching reviews:', error);
        this.reviewsCards = [];
        this.loading = false;
      }
    });
  }

  onReviewsLoaded(reviews: ReviewCard[]): void {
    this.reviewsCards = reviews;
  }
}
