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
import { ToursService } from '../../../core/services/tours.service';
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

  // Añadir propiedades para el modal
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
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
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

    // Crear una copia de los reviews para trabajar
    const reviewsToProcess = [...this.reviews];
    
    // Filtrar solo los reviews que necesitan enriquecimiento
    const reviewsNeedingEnrichment = reviewsToProcess
      .filter(review => (review.tourId && !review.tour) || (review.travelerId && !review.traveler));
    
    if (reviewsNeedingEnrichment.length === 0) {
      // Si no se necesita enriquecimiento, usar los reviews originales
      this.enrichedReviews = reviewsToProcess;
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }
    
    // Crear observables para cada review que necesita enriquecimiento
    const reviewRequests = reviewsNeedingEnrichment
      .map(review => this.enrichReviewData(review));
    
    // Esperar a que todas las solicitudes se completen
    forkJoin(reviewRequests).subscribe({
      next: (enrichedData) => {
        this.processEnrichedData(reviewsToProcess, enrichedData);
      },
      error: (error) => {
        // Usar logger en lugar de console.error
        this.enrichedReviews = reviewsToProcess;
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  // Método separado para procesar los datos enriquecidos
  private processEnrichedData(reviewsToProcess: ReviewCard[], enrichedData: any[]): void {
    this.enrichedReviews = reviewsToProcess.map(review => {
      const enriched = enrichedData.find(data => 
        data.tourId === review.tourId && data.travelerId === review.travelerId
      );
      
      if (enriched) {
        return {
          ...review,
          tour: enriched.tourName || review.tour || 'Unknown Tour',
          traveler: enriched.travelerName || review.traveler || 'Unknown Traveler'
        };
      }
      
      return review;
    });
    
    this.loading = false;
    this.cdr.markForCheck();
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
        switchMap(tour => {
          let idext: string = tour.tkId || '';
          
          // Call getTourDetailByExternalID to get the tour name
          if (idext) {
            return this.toursService.getTourDetailByExternalID(idext).pipe(
              map(tourDetail => {
                return {
                  ...reviewData,
                  tourName: tourDetail?.name || tour?.name || 'Unknown Tour'
                };
              }),
              catchError(() => {
                return of({
                  ...reviewData,
                  tourName: tour?.name || 'Unknown Tour'
                });
              })
            );
          }
          
          return of({
            ...reviewData,
            tourName: tour?.name || 'Unknown Tour'
          });
        }),
        catchError((error) => {
          console.error('Error fetching tour data:', error);
          return of({
            ...reviewData,
            tourName: 'Unknown Tour'
          });
        })
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
    // Eliminar console.log innecesarios
  }

  // Método para abrir el modal con la reseña completa
  openFullReview(review: ReviewCard): void {
    this.selectedReview = review;
    this.showFullReviewModal = true;
  }
}
