import { Component, Input, OnInit } from '@angular/core';
import { ReviewCard } from '../../../../../../shared/models/reviews/review-card.model';
import { ReviewsService } from '../../../../../../core/services/reviews.service';
import { TourNetService } from '../../../../../../core/services/tourNet.service';
import { Reviews } from '../../../../../../core/models/blocks/travelers/reviews.model';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-community-reviews',
  standalone: false,
  templateUrl: './community-reviews.component.html',
  styleUrls: ['./community-reviews.component.scss'],
})
export class CommunityReviewsComponent implements OnInit {
  @Input() reviews: Reviews | null = null;
  reviewsCards: ReviewCard[] = [];

  constructor(
    private reviewsService: ReviewsService,
    private tourNetService: TourNetService
  ) {}

  ngOnInit(): void {
    this.loadReviews();
  }

  loadReviews(): void {
    this.reviewsService.getTopReviews(5, { showOnHomePage: true }).pipe(
      switchMap(reviews => {
        // Create an array of observables for each tour request
        const tourRequests = reviews.map(review => 
          this.tourNetService.getTourById(review.tourId).pipe(
            map(tour => ({
              ...review,
              tourName: tour.name // Update tourName with the name from tour service
            })),
            catchError(() => of(review)) // If tour fetch fails, keep original review
          )
        );
        
        // Wait for all tour requests to complete
        return forkJoin(tourRequests);
      })
    ).subscribe({
      next: (reviewsWithTours) => {
        // Map the API reviews to ReviewCard format
        this.reviewsCards = reviewsWithTours.map(review => ({
          review: review.text,
          score: review.rating,
          traveler: review.travelerName,
          tour: review.tourName || '',
          date: review.reviewDate,
        }));
        console.log(reviewsWithTours);
        console.log(this.reviewsCards);
      },
      error: (error) => {
        console.error('Error fetching reviews:', error);
        // Initialize with empty array on error
        this.reviewsCards = [];
      }
    });
  }
}
