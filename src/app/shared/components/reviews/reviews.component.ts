import {
  Component,
  Input,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { ReviewCard } from '../../models/reviews/review-card.model';
import { CAROUSEL_CONFIG } from '../../constants/carousel.constants';
import { TourNetService } from '../../../core/services/tourNet.service';
import { TravelersNetService } from '../../../core/services/travelersNet.service';
import { ToursService } from '../../../core/services/tours.service';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router'; // Add this import

// Update the EnrichedReviewData interface to include tourSlug
interface EnrichedReviewData {
  tourId: string | number;
  travelerId: string | number;
  tourName: string;
  travelerName: string;
  tourSlug?: string; // Add this property
}

@Component({
  selector: 'app-reviews',
  standalone: false,
  templateUrl: './reviews.component.html',
  styleUrls: ['./reviews.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewsComponent implements OnInit {
  @Input() reviews: ReviewCard[] = [];

  enrichedReviews: ReviewCard[] = [];
  loading = true;
  skeletonArray = Array(6).fill({});
  showFullReviewModal = false;
  selectedReview: ReviewCard | null = null;

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
    private toursService: ToursService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (this.reviews?.length) {
      this.loading = true;
      // Initialize with reviews that don't need enrichment
      this.initializeReviews();
    } else {
      this.loading = false;
    }
  }

  initializeReviews(): void {
    if (!this.reviews?.length) {
      this.loading = false;
      return;
    }

    const reviewsToProcess = [...this.reviews];
    
    // Immediately show reviews that don't need enrichment
    const completeReviews = reviewsToProcess.filter(
      review => (review.tourId && review.tour && review.travelerId && review.traveler)
    );
    
    const reviewsNeedingEnrichment = reviewsToProcess.filter(
      review => (review.tourId && !review.tour) || (review.travelerId && !review.traveler)
    );
    
    // If we have complete reviews, show them immediately and remove loading state
    if (completeReviews.length > 0) {
      this.enrichedReviews = completeReviews;
      this.loading = false; // Remove loading state as soon as we have at least one review
      this.cdr.markForCheck();
    }
    
    // If we have reviews that need enrichment, process them individually
    if (reviewsNeedingEnrichment.length > 0) {
      this.processReviewsIncrementally(reviewsNeedingEnrichment);
    } else if (completeReviews.length === 0) {
      // Only if we have no complete reviews and no reviews to enrich
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  processReviewsIncrementally(reviewsToEnrich: ReviewCard[]): void {
    // Process each review individually to update UI incrementally
    reviewsToEnrich.forEach(review => {
      this.enrichReviewData(review).subscribe({
        next: (enrichedData) => {
          const enrichedReview = this.createEnrichedReview(review, enrichedData);
          // Add the enriched review to our array
          this.enrichedReviews = [...this.enrichedReviews, enrichedReview];
          
          // As soon as we have at least one review, remove the loading state
          if (this.enrichedReviews.length > 0) {
            this.loading = false;
          }
          
          this.cdr.markForCheck();
        },
        error: () => {
          // Even on error, add the original review
          this.enrichedReviews = [...this.enrichedReviews, review];
          
          // As soon as we have at least one review, remove the loading state
          if (this.enrichedReviews.length > 0) {
            this.loading = false;
          }
          
          this.cdr.markForCheck();
        }
      });
    });
  }

  private createEnrichedReview(review: ReviewCard, enrichedData: EnrichedReviewData): ReviewCard {
    return {
      ...review,
      tour: enrichedData.tourName || review.tour || 'Unknown Tour',
      traveler: enrichedData.travelerName || review.traveler || 'Unknown Traveler',
      tourSlug: enrichedData.tourSlug
    };
  }

  // Keep the existing enrichReviewData method
  private enrichReviewData(review: ReviewCard): Observable<EnrichedReviewData> {
    const reviewData: EnrichedReviewData = {
      tourId: review.tourId || '',
      travelerId: review.travelerId || '',
      tourName: review.tour || '',
      travelerName: review.traveler || '',
    };

    let observable = of(reviewData);

    if (review.tourId && !review.tour) {
      observable = this.tourNetService.getTourById(review.tourId).pipe(
        switchMap((tour) => {
          const idext: string = tour.tkId || '';

          if (idext) {
            return this.toursService.getTourDetailByExternalID(idext,['name','webSlug']).pipe(
              map((tourDetail) => ({
                ...reviewData,
                tourName: tourDetail?.name || tour?.name || 'Unknown Tour',
                tourSlug: tourDetail?.webSlug,
              })),
              catchError(() =>
                of({
                  ...reviewData,
                  tourName: tour?.name || 'Unknown Tour',
                })
              )
            );
          }

          return of({
            ...reviewData,
            tourName: tour?.name || 'Unknown Tour',
          });
        }),
        catchError(() =>
          of({
            ...reviewData,
            tourName: 'Unknown Tour',
          })
        )
      );
    }

    return observable.pipe(
      switchMap((data) => {
        if (review.travelerId && !review.traveler) {
          return this.travelersNetService
            .getTravelerById(review.travelerId)
            .pipe(
              map((traveler) => ({
                ...data,
                travelerName: traveler?.name || 'Unknown Traveler',
              })),
              catchError(() =>
                of({
                  ...data,
                  travelerName: 'Unknown Traveler',
                })
              )
            );
        }
        return of(data);
      })
    );
  }

  openFullReview(review: ReviewCard): void {
    this.selectedReview = review;
    this.showFullReviewModal = true;
  }

  navigateToTour(tourSlug: string, event: MouseEvent): void {
    event.stopPropagation();
    if (tourSlug) {
      this.router.navigate(['/tour', tourSlug]);
    }
  }
}
