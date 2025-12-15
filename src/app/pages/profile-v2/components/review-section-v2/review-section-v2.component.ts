import { Component, Input, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { IEnrichedReviewResponse } from '../../../../core/models/reviews/review.model';
import { ReviewsService } from '../../../../core/services/reviews/reviews.service';
import { BookingsServiceV2 } from '../../../../core/services/v2/bookings-v2.service';
import { TourService } from '../../../../core/services/tour/tour.service';
import { UsersNetService } from '../../../../core/services/users/usersNet.service';
import { forkJoin, of, Subject } from 'rxjs';
import { catchError, map, switchMap, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-review-section-v2',
  standalone: false,
  templateUrl: './review-section-v2.component.html',
  styleUrls: ['./review-section-v2.component.scss'],
})

export class ReviewSectionV2Component implements OnInit, OnChanges, OnDestroy {
  @Input() userId: string = '';
  reviewsCards: IEnrichedReviewResponse[] = [];
  loading = false;
  isExpanded = true;
  hasCompletedBookings = false;
  
  // Subject para manejar la destrucción del componente y cancelar suscripciones
  private destroy$ = new Subject<void>();
  
  constructor(
    private reviewsService: ReviewsService,
    private bookingsService: BookingsServiceV2,
    private tourService: TourService,
    private usersNetService: UsersNetService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (this.userId) {
      this.loadReviews();
      this.checkCompletedBookings();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['userId'] && changes['userId'].currentValue) {
      this.loadReviews();
      this.checkCompletedBookings();
    }
  }

  ngOnDestroy(): void {
    // Emitir señal de destrucción para cancelar todas las suscripciones con takeUntil
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadReviews(): void {
    if (!this.userId) {
      return;
    }

    const userIdNumber = parseInt(this.userId, 10);
    if (isNaN(userIdNumber)) {
      console.error('Invalid userId:', this.userId);
      return;
    }

    this.loading = true;
    
    // Primero obtener el nombre del usuario del perfil
    this.usersNetService.getUserById(userIdNumber).pipe(
      takeUntil(this.destroy$), // ✅ Cancelar si el componente se destruye
      switchMap(user => {
        // Obtener el nombre completo del usuario
        let userName = 'Usuario desconocido';
        if (user) {
          userName = user.name || 'Usuario desconocido';
          if (user.lastName) {
            userName += ` ${user.lastName}`;
          }
        }

        // Ahora obtener las reviews del usuario
        return this.reviewsService.getByUserId(userIdNumber).pipe(
          takeUntil(this.destroy$), // ✅ Cancelar si el componente se destruye
          switchMap(reviews => {
            if (reviews.length === 0) {
              return of([]);
            }

            // Mapear reviews al formato esperado con el nombre del usuario ya conocido
            const mappedReviews: IEnrichedReviewResponse[] = reviews.map((review) => ({
              ...review,
              traveler: userName, // Usar el nombre del usuario del perfil
              tour: 'Tour', // Se enriquecerá después con tourService
              review: review.text,
              score: review.rating,
              date: review.reviewDate
            }));

            return of(mappedReviews);
          }),
          catchError(error => {
            console.error('Error loading reviews:', error);
            return of([]);
          })
        );
      }),
      catchError(error => {
        console.error('Error loading user data:', error);
        // Si falla obtener el usuario, intentar cargar las reviews de todas formas
        return this.reviewsService.getByUserId(userIdNumber).pipe(
          takeUntil(this.destroy$), // ✅ Cancelar si el componente se destruye
          switchMap(reviews => {
            if (reviews.length === 0) {
              return of([]);
            }

            // Mapear reviews sin nombre de usuario (fallback)
            const mappedReviews: IEnrichedReviewResponse[] = reviews.map((review) => ({
              ...review,
              traveler: 'Usuario desconocido',
              tour: 'Tour',
              review: review.text,
              score: review.rating,
              date: review.reviewDate
            }));

            return of(mappedReviews);
          }),
          catchError(reviewError => {
            console.error('Error loading reviews:', reviewError);
            return of([]);
          })
        );
      })
    ).subscribe({
      next: (reviewsWithTravelers) => {
        this.enrichReviewsWithTourData(reviewsWithTravelers);
      },
      error: (error) => {
        console.error('Error in loadReviews:', error);
        this.reviewsCards = [];
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private enrichReviewsWithTourData(reviews: IEnrichedReviewResponse[]): void {
    // Obtener IDs únicos de tours
    const uniqueTourIds = [...new Set(reviews.map(review => review.tourId).filter(id => id))];
    
    if (uniqueTourIds.length === 0) {
      this.reviewsCards = reviews;
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }

    // Crear observables para obtener información de cada tour
    const tourObservables = uniqueTourIds.map(tourId => 
      this.tourService.getTourById(tourId).pipe(
        takeUntil(this.destroy$), // ✅ Cancelar si el componente se destruye
        catchError(error => {
          console.error(`Error fetching tour ${tourId}:`, error);
          return of(null);
        })
      )
    );

    forkJoin(tourObservables).pipe(
      takeUntil(this.destroy$) // ✅ Cancelar si el componente se destruye
    ).subscribe({
      next: (tours) => {
        // Crear un mapa de tourId -> tour info
        const tourMap = new Map();
        uniqueTourIds.forEach((tourId, index) => {
          if (tours[index]) {
            tourMap.set(tourId, tours[index]);
          }
        });

        // Enriquecer las reviews con la información del tour
        this.reviewsCards = reviews.map(review => {
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
        this.reviewsCards = reviews;
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private checkCompletedBookings(): void {
    if (!this.userId) {
      return;
    }

    const userIdNumber = parseInt(this.userId, 10);
    if (isNaN(userIdNumber)) {
      return;
    }

    // Usar el nuevo endpoint con bucket "History" para verificar reservas completadas
    this.bookingsService.getReservationsByBucket('History', userIdNumber).pipe(
      takeUntil(this.destroy$), // ✅ Cancelar si el componente se destruye
      map((reservations) => reservations.length > 0),
      catchError(error => {
        console.error('Error checking completed bookings:', error);
        return of(false);
      })
    ).subscribe({
      next: (hasBookings) => {
        this.hasCompletedBookings = hasBookings;
        this.cdr.markForCheck();
      }
    });
  }

  toggleContent(): void {
    this.isExpanded = !this.isExpanded;
  }
}