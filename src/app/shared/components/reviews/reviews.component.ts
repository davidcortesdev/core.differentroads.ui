import {
  Component,
  Input,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CAROUSEL_CONFIG } from '../../constants/carousel.constants';
import { ReviewsService } from '../../../core/services/reviews/reviews.service';
import { TourService } from '../../../core/services/tour/tour.service';
import { UsersNetService } from '../../../core/services/users/usersNet.service';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { IEnrichedReviewResponse } from '../../../core/models/reviews/review.model';

@Component({
  selector: 'app-reviews',
  standalone: false,
  templateUrl: './reviews.component.html',
  styleUrls: ['./reviews.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewsComponent implements OnInit {
  @Input() reviews: IEnrichedReviewResponse[] = []; // Para recibir reviews desde el componente padre
  @Input() tourId?: number;
  @Input() showOnHomePage?: boolean;
  @Input() showOnTourPage?: boolean;
  @Input() limit?: number;

  enrichedReviews: IEnrichedReviewResponse[] = []; // Mantener el nombre que usa el template
  loading = true;
  skeletonArray = Array(6).fill({});
  showFullReviewModal = false;
  selectedReview: any = null;
  
  // Nuevas propiedades para aprovechar los métodos del servicio
  totalReviews = 0;
  averageRating = 0;

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
    private tourService: TourService,
    private usersNetService: UsersNetService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Si recibe reviews desde el padre, las usa directamente pero las enriquece
    if (this.reviews && this.reviews.length > 0) {
      this.enrichReviewsWithTourData(this.reviews);
      // Ya no se cargan estadísticas desde reviewsService, se obtienen de TourReview
    } else {
      // Si no, carga las reviews desde el servicio
      this.loadReviews();
      // Ya no se cargan estadísticas desde reviewsService, se obtienen de TourReview
    }
  }

  loadReviews(): void {
    this.loading = true;
    
    // Construir filtros adicionales basados en los inputs
    const additionalFilters: any = {};
    
    if (this.showOnHomePage !== undefined) {
      additionalFilters.showOnHomePage = this.showOnHomePage;
    }
    
    if (this.showOnTourPage !== undefined) {
      additionalFilters.showOnTourPage = this.showOnTourPage;
    }

    // Determinar qué método usar según los inputs y usar los métodos específicos del servicio
    let reviewsObservable;
    
    if (this.showOnHomePage) {
      // Usar método específico para homepage
      reviewsObservable = this.limit 
        ? this.reviewsService.getTopReviews(this.limit, additionalFilters)
        : this.reviewsService.getForHomePage(additionalFilters);
    } else if (this.showOnTourPage && this.tourId) {
      // Usar método específico para tour page
      reviewsObservable = this.limit 
        ? this.reviewsService.getTopReviews(this.limit, { tourId: this.tourId, ...additionalFilters })
        : this.reviewsService.getForTourPage(this.tourId, additionalFilters);
    } else if (this.tourId) {
      // Usar método específico por tour ID
      reviewsObservable = this.limit 
        ? this.reviewsService.getTopReviews(this.limit, { tourId: this.tourId, ...additionalFilters })
        : this.reviewsService.getByTourId(this.tourId, additionalFilters);
    } else {
      // Usar getAll como fallback
      reviewsObservable = this.limit 
        ? this.reviewsService.getTopReviews(this.limit, additionalFilters)
        : this.reviewsService.getAll(additionalFilters);
    }

    reviewsObservable.pipe(
      switchMap(reviews => {
        if (reviews.length === 0) {
          return of([]);
        }

        // Mapear reviews al formato esperado
        const mappedReviews = reviews.map((review: IEnrichedReviewResponse) => ({
          ...review,
          traveler: review.traveler,
          tour: 'Tour', // Se enriquecerá después con tourService
          review: review.text,
          score: review.rating,
          date: review.reviewDate
        }));

        // Obtener nombres de travelers
        return this.enrichWithTravelerNames(mappedReviews);
      }),
      catchError(error => {
        console.error('Error loading reviews:', error);
        return of([]);
      })
    ).subscribe({
      next: (reviewsWithTravelers) => {
        this.enrichReviewsWithTourData(reviewsWithTravelers);
        // Ya no se cargan estadísticas desde reviewsService, se obtienen de TourReview
      },
      error: (error) => {
        console.error('Error in loadReviews:', error);
        this.enrichedReviews = [];
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Carga estadísticas de reviews (conteo y rating promedio)
   * DESHABILITADO: Ya no se usa reviewsService, las estadísticas se obtienen de TourReview
   */
  loadReviewStats(): void {
    // Ya no se cargan estadísticas desde reviewsService, se obtienen de TourReview
    // Este método se mantiene por compatibilidad pero no hace nada
  }

  private enrichWithTravelerNames(reviews: IEnrichedReviewResponse[]) {
    // Extraer todos los user IDs únicos para reviews que no tienen travelerName
    const userIds = [...new Set(reviews
      .filter(review => !review.traveler || review.traveler === 'Usuario desconocido')
      .map(review => review.userId)
      .filter(id => id)
    )];

    if (userIds.length === 0) {
      return of(reviews);
    }

    // Obtener todos los users en llamadas individuales
    const userObservables = userIds.map(id => 
      this.usersNetService.getUserById(id).pipe(
        catchError(error => {
          console.error(`Error fetching user ${id}:`, error);
          return of(null); // Retorna null en caso de error para no romper el forkJoin
        })
      )
    );

    return forkJoin(userObservables).pipe(
      map(users => {
        // Filtrar usuarios nulos y crear un mapa para acceso rápido a los users por ID
        const usersMap = new Map(users.filter(user => user !== null).map(t => [t!.id, t]));

        // Mapear reviews con nombres de users
        return reviews.map((review: IEnrichedReviewResponse) => {
          const user = usersMap.get(review.userId);
          let travelerName = 'Usuario desconocido';

          if (user) {
            travelerName = user.name || 'Usuario desconocido';
            if (user.lastName) {
              travelerName += ` ${user.lastName}`;
            }
          }
          return {
            ...review,
            traveler: review.traveler || travelerName
          };
        });
      }),
      catchError(error => {
        console.error('Error processing users with individual calls:', error);
        // Fallback: mantener nombres existentes o asignar por defecto
        return of(reviews.map((review: IEnrichedReviewResponse) => ({
          ...review,
          traveler: review.traveler || 'Usuario desconocido'
        })));
      })
    );
  }

  private enrichReviewsWithTourData(reviews: IEnrichedReviewResponse[]): void {
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
      this.tourService.getTourById(tourId)
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

  /**
   * Métodos de utilidad adicionales para aprovechar el ReviewsService
   */

  /**
   * Obtiene reviews por ID de departure
   * @param departureId ID del departure
   */
  loadReviewsByDeparture(departureId: number): void {
    this.loading = true;
    this.reviewsService.getByDepartureId(departureId).pipe(
      switchMap(reviews => {
        if (reviews.length === 0) {
          return of([]);
        }
        const mappedReviews = reviews.map((review: IEnrichedReviewResponse) => ({
          ...review,
          traveler: review.traveler || 'Usuario desconocido', // Se enriquecerá después
          tour: 'Tour', // Se enriquecerá después con tourService
          review: review.text,
          score: review.rating,
          date: review.reviewDate
        }));
        return this.enrichWithTravelerNames(mappedReviews);
      }),
      catchError(error => {
        console.error('Error loading reviews by departure:', error);
        return of([]);
      })
    ).subscribe({
      next: (reviewsWithTravelers) => {
        this.enrichReviewsWithTourData(reviewsWithTravelers);
        this.loadReviewStats();
      },
      error: (error) => {
        console.error('Error in loadReviewsByDeparture:', error);
        this.enrichedReviews = [];
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Obtiene reviews por ID de user
   * @param userId ID del user
   */
  loadReviewsByTraveler(userId: number): void {
    this.loading = true;
    this.reviewsService.getByUserId(userId).pipe(
      switchMap(reviews => {
        if (reviews.length === 0) {
          return of([]);
        }
        const mappedReviews = reviews.map((review: IEnrichedReviewResponse) => ({
          ...review,
          traveler: review.traveler, // Se enriquecerá después
          tour: 'Tour', // Se enriquecerá después con tourService
          review: review.text,
          score: review.rating,
          date: review.reviewDate
        }));
        return this.enrichWithTravelerNames(mappedReviews);
      }),
      catchError(error => {
        console.error('Error loading reviews by traveler:', error);
        return of([]);
      })
    ).subscribe({
      next: (reviewsWithTravelers) => {
        this.enrichReviewsWithTourData(reviewsWithTravelers);
        this.loadReviewStats();
      },
      error: (error) => {
        console.error('Error in loadReviewsByTraveler:', error);
        this.enrichedReviews = [];
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }
}