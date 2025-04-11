import {
  Component,
  Input,
  OnInit,
  ChangeDetectionStrategy,
  Output,
  EventEmitter,
  ChangeDetectorRef,
} from '@angular/core';
import { ReviewCard } from '../../models/reviews/review-card.model';
import { CAROUSEL_CONFIG } from '../../constants/carousel.constants';
import { ReviewsService } from '../../../core/services/reviews.service';
import { TourNetService } from '../../../core/services/tourNet.service';
import { TravelersNetService } from '../../../core/services/travelersNet.service';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-reviews',
  standalone: false,
  templateUrl: './reviews.component.html',
  styleUrls: ['./reviews.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewsComponent implements OnInit {
  @Input() reviews: ReviewCard[] = [];
  
  // New array to hold the fully enriched reviews
  enrichedReviews: ReviewCard[] = [];
  
  // Add loading state
  loading = true;
  
  // Create an array for skeleton items
  skeletonArray = Array(6).fill({});

  readonly responsiveOptions = [
    {
      breakpoint: '3500px',
      numVisible: 6,
      numScroll: 1,
    },
    {
      breakpoint: '2500px',
      numVisible: 5,
      numScroll: 1,
    },
    {
      breakpoint: '2000px',
      numVisible: 4,
      numScroll: 1,
    },
    {
      breakpoint: '1500px',
      numVisible: 3,
      numScroll: 1,
    },
    {
      breakpoint: '1200px',
      numVisible: 2,
      numScroll: 1,
    },
    {
      breakpoint: '850px',
      numVisible: 1,
      numScroll: 1,
    },
  ];

  protected carouselConfig = CAROUSEL_CONFIG;

  constructor(
    private tourNetService: TourNetService,
    private travelersNetService: TravelersNetService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    console.log('reviews', this.reviews);
    if (this.reviews?.length) {
      this.loading = true;
      this.loadMissingNames();
    } else {
      this.loading = false;
      console.warn('No reviews provided to ReviewsComponent');
    }
  }

  loadMissingNames(): void {
    if (!this.reviews || this.reviews.length === 0) {
      this.loading = false;
      return;
    }

    // Create a copy of the reviews array to work with
    const reviewsToProcess = [...this.reviews];
    
    // Create an array of observables for each review that needs name enrichment
    const reviewRequests = reviewsToProcess
      .filter(review => (review.tourId && !review.tour) || (review.travelerId && !review.traveler))
      .map(review => this.enrichReviewData(review));
    
    if (reviewRequests.length === 0) {
      // If no enrichment needed, just use the original reviews
      this.enrichedReviews = [...reviewsToProcess];
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }
    
    // Wait for all requests to complete
    forkJoin(reviewRequests).subscribe({
      next: (enrichedData) => {
        // Create the enriched reviews array
        this.enrichedReviews = reviewsToProcess.map(review => {
          // Find if this review has enriched data
          const enriched = enrichedData.find(data => 
            data.tourId === review.tourId && data.travelerId === review.travelerId
          );
          
          if (enriched) {
            // Return a new review object with the enriched data
            return {
              ...review,
              tour: enriched.tourName || review.tour || 'Unknown Tour',
              traveler: enriched.travelerName || review.traveler || 'Unknown Traveler'
            };
          }
          
          // If no enriched data found, return the original review
          return review;
        });
        
        // Set loading to false when done
        this.loading = false;
        
        // Trigger change detection to update the view
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error enriching reviews with names:', error);
        // In case of error, use the original reviews
        this.enrichedReviews = [...reviewsToProcess];
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private enrichReviewData(review: ReviewCard) {
    const reviewData = {
      tourId: review.tourId,
      travelerId: review.travelerId,
      tourName: review.tour,
      travelerName: review.traveler
    };

    // Get tour information if needed
    let observable = of(reviewData);
    
    if (review.tourId && !review.tour) {
      observable = this.tourNetService.getTourById(review.tourId).pipe(
        map(tour => ({
          ...reviewData,
          tourName: tour?.name || 'Unknown Tour'
        })),
        catchError(() => of({
          ...reviewData,
          tourName: 'Unknown Tour'
        }))
      );
    }
    
    // Get traveler information if needed
    return observable.pipe(
      switchMap(data => {
        if (review.travelerId && !review.traveler) {
          return this.travelersNetService.getTravelerById(review.travelerId).pipe(
            map(traveler => ({
              ...data,
              travelerName: traveler?.name || 'Unknown Traveler'
            })),
            catchError(() => of({
              ...data,
              travelerName: 'Unknown Traveler'
            }))
          );
        }
        return of(data);
      })
    );
  }
}
