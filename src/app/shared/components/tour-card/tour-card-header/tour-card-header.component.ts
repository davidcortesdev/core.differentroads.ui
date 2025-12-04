import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Subscription, catchError, finalize, of, tap, switchMap } from 'rxjs';
import { ReviewsService } from '../../../../core/services/reviews/reviews.service';
import { TourService } from '../../../../core/services/tour/tour.service';
import { TourReviewService } from '../../../../core/services/reviews/tour-review.service';
import { ReviewTypeService } from '../../../../core/services/reviews/review-type.service';

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

  constructor(
    private reviewsService: ReviewsService,
    private tourService: TourService,
    private tourReviewService: TourReviewService,
    private reviewTypeService: ReviewTypeService
  ) {}

  ngOnInit() {
    // Deshabilitado temporalmente: el rating se carga desde TourReview pero el endpoint está fallando
    // if (this.tourData.externalID) {
    //   this.loadRatingAndReviewCount(this.tourData.externalID);
    // }
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  handleTourClick(): void {
    this.tourClick.emit();
  }

  private loadRatingAndReviewCount(tkId: string) {
    if (!tkId) return;

    this.isLoadingRating = true;
    
    this.subscriptions.add(
      this.tourService.getTourIdByTKId(tkId).pipe(
        switchMap((id) => {
          if (!id) {
            this.isLoadingRating = false;
            return of(null);
          }

          // Primero obtener el ReviewType con code "GENERAL"
          return this.reviewTypeService.getByCode('GENERAL').pipe(
            switchMap((reviewType) => {
              if (!reviewType) {
                console.warn('ReviewType con code "GENERAL" no encontrado');
                this.averageRating = undefined;
                this.isLoadingRating = false;
                return of(null);
              }

              // Usar TourReviewService con filtro ReviewTypeId
              const filters = {
                tourId: id,
                reviewTypeId: reviewType.id,
                isActive: true
              };

              return this.tourReviewService.getAverageRating(filters).pipe(
                tap((rating) => {
                  if (rating) {
                    this.averageRating = Math.round(rating.averageRating * 10) / 10;
                  } else {
                    this.averageRating = undefined;
                  }
                }),
                catchError((error) => {
                  console.error('Error al cargar el rating promedio desde TourReview:', error);
                  this.averageRating = undefined;
                  return of(null);
                }),
                finalize(() => {
                  this.isLoadingRating = false;
                })
              );
            }),
            catchError((error) => {
              console.error('Error obteniendo ReviewType GENERAL:', error);
              this.averageRating = undefined;
              this.isLoadingRating = false;
              return of(null);
            })
          );
        }),
        catchError((error) => {
          console.error('Error al obtener el ID del tour:', error);
          this.isLoadingRating = false;
          return of(null);
        })
      ).subscribe()
    );
  }
}
