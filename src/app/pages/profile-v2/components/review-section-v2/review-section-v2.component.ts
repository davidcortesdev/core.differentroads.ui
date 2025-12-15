import { Component, Input, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { IEnrichedReviewResponse } from '../../../../core/models/reviews/review.model';
import { ReviewsService } from '../../../../core/services/reviews/reviews.service';
import { BookingsServiceV2 } from '../../../../core/services/v2/bookings-v2.service';
import { TourService } from '../../../../core/services/tour/tour.service';
import { UsersNetService } from '../../../../core/services/users/usersNet.service';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-review-section-v2',
  standalone: false,
  templateUrl: './review-section-v2.component.html',
  styleUrls: ['./review-section-v2.component.scss'],
})

export class ReviewSectionV2Component implements OnInit, OnChanges {
  @Input() userId: string = '';
  reviewsCards: IEnrichedReviewResponse[] = [];
  loading = false;
  isExpanded = true;
  hasCompletedBookings = false;
  
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
    
    this.reviewsService.getByUserId(userIdNumber).pipe(
      switchMap(reviews => {
        if (reviews.length === 0) {
          return of([]);
        }

        // Mapear reviews al formato esperado
        const mappedReviews: IEnrichedReviewResponse[] = reviews.map((review) => ({
          ...review,
          traveler: 'Usuario desconocido', // Se enriquecerá después
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
      },
      error: (error) => {
        console.error('Error in loadReviews:', error);
        this.reviewsCards = [];
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
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
      this.reviewsCards = reviews;
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }

    // Crear observables para obtener información de cada tour
    const tourObservables = uniqueTourIds.map(tourId => 
      this.tourService.getTourById(tourId).pipe(
        catchError(error => {
          console.error(`Error fetching tour ${tourId}:`, error);
          return of(null);
        })
      )
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