import {
  Component,
  Input,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CAROUSEL_CONFIG } from '../../constants/carousel.constants';
import { ReviewsService } from '../../../core/services/reviews.service';
import { TourNetService } from '../../../core/services/tourNet.service';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-reviews',
  standalone: false,
  templateUrl: './reviews.component.html',
  styleUrls: ['./reviews.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewsComponent implements OnInit {
  @Input() reviews: any[] = []; // Para recibir reviews desde el componente padre
  @Input() tourId?: number;
  @Input() showOnHomePage?: boolean;
  @Input() showOnTourPage?: boolean;
  @Input() limit?: number;

  enrichedReviews: any[] = []; // Mantener el nombre que usa el template
  loading = true;
  skeletonArray = Array(6).fill({});
  showFullReviewModal = false;
  selectedReview: any = null;

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
      breakpoint: '1024px', // Tablet - 2 reviews
      numVisible: 2,
      numScroll: 1,
    },
    {
      breakpoint: '768px', // Móvil - 1 review
      numVisible: 1,
      numScroll: 1,
    },
  ];

  protected carouselConfig = CAROUSEL_CONFIG;

  constructor(
    private reviewsService: ReviewsService,
    private tourNetService: TourNetService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Si recibe reviews desde el padre, las usa directamente pero las enriquece
    if (this.reviews && this.reviews.length > 0) {
      this.enrichReviewsWithTourData(this.reviews);
    } else {
      // Si no, carga las reviews desde el servicio
      this.loadReviews();
    }
  }

  loadReviews(): void {
    this.loading = true;
    
    // Construir filtros basados en los inputs
    const filter: any = {};
    
    if (this.tourId) {
      filter.tourId = this.tourId;
    }
    
    if (this.showOnHomePage !== undefined) {
      filter.showOnHomePage = this.showOnHomePage;
    }
    
    if (this.showOnTourPage !== undefined) {
      filter.showOnTourPage = this.showOnTourPage;
    }

    // Usar getTopReviews si hay límite, sino getReviews
    const reviewsObservable = this.limit 
      ? this.reviewsService.getTopReviews(this.limit, filter)
      : this.reviewsService.getReviews(filter);

    reviewsObservable.subscribe({
      next: (reviews) => {
        const mappedReviews = reviews.map(review => ({
          ...review,
          traveler: review.travelerName,
          tour: review.tourName,
          review: review.text,
          score: review.rating,
          date: review.reviewDate || review.createdAt
        }));
        this.enrichReviewsWithTourData(mappedReviews);
      },
      error: (error) => {
        console.error('Error loading reviews:', error);
        this.enrichedReviews = [];
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private enrichReviewsWithTourData(reviews: any[]): void {
    // Obtener IDs únicos de tours
    const uniqueTourIds = [...new Set(reviews.map(review => review.tourId).filter(id => id))];
    
    if (uniqueTourIds.length === 0) {
      this.enrichedReviews = reviews;
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }

    // Crear observables para obtener información de cada tour
    const tourObservables = uniqueTourIds.map(tourId => 
      this.tourNetService.getTourById(tourId)
    );

    forkJoin(tourObservables).subscribe({
      next: (tours) => {
        // Crear un mapa de tourId -> tour info
        const tourMap = new Map();
        uniqueTourIds.forEach((tourId, index) => {
          if (tours[index]) {
            tourMap.set(tourId, tours[index]);
          }
        });

        // Enriquecer las reviews con la información del tour
        this.enrichedReviews = reviews.map(review => {
          const tourInfo = tourMap.get(review.tourId);
          return {
            ...review,
            tour: tourInfo?.name || review.tour || review.tourName || 'Tour Desconocido',
            tourSlug: tourInfo?.slug || review.tourSlug
          };
        });

        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error enriching reviews with tour data:', error);
        // En caso de error, usar las reviews sin enriquecer
        this.enrichedReviews = reviews;
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  openFullReview(review: any): void {
    this.selectedReview = review;
    this.showFullReviewModal = true;
  }

  navigateToTour(tourSlug: string, event: MouseEvent): void {
    event.stopPropagation();
    if (tourSlug) {
      this.router.navigate(['/tour-v2', tourSlug]);
    }
  }
}