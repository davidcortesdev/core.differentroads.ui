import { Component, Input, OnInit } from '@angular/core';
import { ReviewCard } from '../../../../../../shared/models/reviews/review-card.model';
import { ReviewsService } from '../../../../../../core/services/reviews.service';
import { TourNetService } from '../../../../../../core/services/tourNet.service';
import { TravelersNetService } from '../../../../../../core/services/travelersNet.service';
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
    private tourNetService: TourNetService,
    private travelersNetService: TravelersNetService
  ) {}

  ngOnInit(): void {
    this.loadReviews();
  }

  loadReviews(): void {
    this.reviewsService.getTopReviews(20, { 
      showOnHomePage: true,
      status: 'ACTIVE' 
    }).pipe(
      switchMap(reviews => {
        // Create an array of observables for each tour and traveler request
        const reviewRequests = reviews.map(review => {
          // Get tour information
          const tourRequest = this.tourNetService.getTourById(review.tourId).pipe(
            map(tour => ({
              ...review,
              tourName: tour.name
            })),
            catchError(() => of(review))
          );
          
          // Get traveler information if travelerId exists
          return tourRequest.pipe(
            switchMap(reviewWithTour => {
              if (reviewWithTour.travelerId) {
                return this.travelersNetService.getTravelerById(reviewWithTour.travelerId).pipe(
                  map(traveler => ({
                    ...reviewWithTour,
                    travelerName: traveler.name // Update travelerName with the name from traveler service
                  })),
                  catchError(() => of(reviewWithTour))
                );
              }
              return of(reviewWithTour);
            })
          );
        });
        
        // Wait for all requests to complete
        return forkJoin(reviewRequests);
      })
    ).subscribe({
      next: (reviewsWithData) => {
        // Map the API reviews to ReviewCard format
        this.reviewsCards = reviewsWithData.map(review => ({
          review: review.text,
          score: review.rating,
          traveler: review.travelerName,
          tour: review.tourName || '',
          date: review.reviewDate,
        }));

      },
      error: (error) => {
        console.error('Error fetching reviews:', error);
        // Initialize with empty array on error
        this.reviewsCards = [];
      }
    });
  }
}
