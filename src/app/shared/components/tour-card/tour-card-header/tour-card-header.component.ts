import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Subscription, catchError, finalize, of, tap, switchMap, Subject, takeUntil } from 'rxjs';
import { ReviewsService } from '../../../../core/services/reviews/reviews.service';
import { TourService } from '../../../../core/services/tour/tour.service';
import { TourReviewService } from '../../../../core/services/reviews/tour-review.service';

interface TourHeaderData {
  imageUrl: string;
  title: string;
  rating: number;
  isByDr?: boolean;
  tag?: string;
  description: string;
  webSlug: string;
  externalID?: string;
}

@Component({
  selector: 'app-tour-card-header',
  standalone: false,
  templateUrl: './tour-card-header.component.html',
  styleUrls: ['./tour-card-header.component.scss'],
})
export class TourCardHeaderComponent implements OnInit, OnDestroy {
  @Input() tourData!: TourHeaderData;
  @Output() tourClick = new EventEmitter<void>();

  averageRating?: number = undefined;
  isLoadingRating = false;

  private subscriptions = new Subscription();
  // Cancellation token para la petición de rating/reviews
  private ratingDestroy$ = new Subject<void>();
  // Variable para evitar llamadas duplicadas de rating
  private lastLoadedTKId: string | undefined = undefined;

  constructor(
    private reviewsService: ReviewsService,
    private tourService: TourService,
    private tourReviewService: TourReviewService
  ) {}

  ngOnInit() {
    if (this.tourData.externalID) {
      this.loadRatingAndReviewCount(this.tourData.externalID);
    }
  }

  ngOnDestroy() {
    // Cancelar petición de rating/reviews
    this.ratingDestroy$.next();
    this.ratingDestroy$.complete();
    // Cancelar otras peticiones
    this.subscriptions.unsubscribe();
  }

  handleTourClick(): void {
    this.tourClick.emit();
  }

  private loadRatingAndReviewCount(tkId: string) {
    if (!tkId) return;

    // Evitar llamadas duplicadas para el mismo tkId (a nivel de componente)
    // El servicio también tiene cache compartido para evitar llamadas HTTP duplicadas
    if (this.lastLoadedTKId === tkId) {
      return;
    }
    this.lastLoadedTKId = tkId;

    this.isLoadingRating = true;
    
    this.tourService.getTourIdByTKId(tkId).pipe(
      takeUntil(this.ratingDestroy$),
      switchMap((id) => {
        if (!id) {
          this.isLoadingRating = false;
          return of(null);
        }

        // Usar TourReviewService con ReviewTypeId = 1 (GENERAL) directamente
        const filters = {
          tourId: [id],
          reviewTypeId: [1], // ID 1 para tipo GENERAL
          isActive: true
        };

        return this.tourReviewService.getAverageRating(filters).pipe(
          takeUntil(this.ratingDestroy$),
          tap((rating) => {
            if (rating && rating.averageRating > 0) {
              this.averageRating = Math.round(rating.averageRating * 10) / 10;
            } else {
              this.averageRating = undefined;
            }
          }),
          catchError((error) => {
            this.averageRating = undefined;
            return of(null);
          }),
          finalize(() => {
            this.isLoadingRating = false;
          })
        );
      }),
      catchError((error) => {
        this.isLoadingRating = false;
        return of(null);
      })
    ).subscribe();
  }
}
