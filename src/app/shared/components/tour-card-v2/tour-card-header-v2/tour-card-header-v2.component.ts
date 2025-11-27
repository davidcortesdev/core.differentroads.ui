import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Subscription, catchError, finalize, of, tap, forkJoin } from 'rxjs';
import { ReviewsService } from '../../../../core/services/reviews/reviews.service';
import { TourService } from '../../../../core/services/tour/tour.service';
import { TripTypeService, ITripTypeResponse } from '../../../../core/services/trip-type/trip-type.service';
import { TourDataV2 } from '../tour-card-v2.model';

@Component({
  selector: 'app-tour-card-header-v2',
  standalone: false,
  templateUrl: './tour-card-header-v2.component.html',
  styleUrls: ['./tour-card-header-v2.component.scss'],
})
export class TourCardHeaderV2Component implements OnInit, OnDestroy {
  @Input() tourData!: TourDataV2;
  @Output() tourClick = new EventEmitter<void>();

  averageRating?: number = undefined;
  isLoadingRating = false;
  isLoadingTripTypes = false;

  private subscriptions = new Subscription();

  constructor(
    private reviewsService: ReviewsService,
    private tourService: TourService,
    private tripTypeService: TripTypeService
  ) {}

  ngOnInit() {
    if (this.tourData.externalID) {
      this.loadRatingAndReviewCount(this.tourData.externalID);
    }
    
    // Cargar trip types usando el nuevo endpoint
    if (this.tourData.id) {
      this.loadTripTypes(this.tourData.id);
    }
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  handleTourClick(): void {
    this.tourClick.emit();
  }

  /**
   * Carga los tipos de viaje usando el nuevo endpoint /api/Tour/{id}/triptype-ids
   * @param tourId ID del tour
   */
  private loadTripTypes(tourId: number): void {
    if (!tourId) return;

    this.isLoadingTripTypes = true;

    this.subscriptions.add(
      this.tourService
        .getTripTypeIds(tourId, true)
        .pipe(
          catchError((error) => {
            console.error('Error al obtener tripTypeIds del tour:', error);
            return of([]);
          })
        )
        .subscribe((tripTypeIds: number[]) => {
          if (tripTypeIds.length === 0) {
            this.isLoadingTripTypes = false;
            return;
          }

          // Obtener los detalles de cada trip type
          const tripTypeRequests = tripTypeIds.map((id) =>
            this.tripTypeService.getById(id).pipe(
              catchError((error) => {
                console.error(`Error al obtener trip type con ID ${id}:`, error);
                return of(null);
              })
            )
          );

          forkJoin(tripTypeRequests)
            .pipe(
              catchError((error) => {
                console.error('Error al obtener detalles de trip types:', error);
                return of([]);
              }),
              finalize(() => {
                this.isLoadingTripTypes = false;
              })
            )
            .subscribe((tripTypes: (ITripTypeResponse | null)[]) => {
              // Filtrar nulls y mapear a el formato esperado
              const validTripTypes = tripTypes.filter(
                (tt): tt is ITripTypeResponse => tt !== null
              );

              const mappedTripTypes = validTripTypes.map((tripType) => ({
                name: tripType.name,
                code: tripType.code,
                color: tripType.color,
                abbreviation: tripType.abbreviation || tripType.name.charAt(0).toUpperCase(),
              }));

              // Actualizar tourData con los trip types obtenidos
              this.tourData.tripTypes = mappedTripTypes;
            });
        })
    );
  }

  private loadRatingAndReviewCount(tkId: string) {
    if (!tkId) return;

    this.isLoadingRating = true;
    this.subscriptions.add(
      this.tourService
        .getTourIdByTKId(tkId)
        .pipe(
          tap((id) => {
            if (!id) {
              //console.warn('No se encontró ID para el tour con tkId:', tkId);
            }
          }),
          catchError((error) => {
            console.error('Error al obtener el ID del tour:', error);
            return of(null);
          })
        )
        .subscribe((id) => {
          if (id) {
            const filter = { tourId: id };

            this.subscriptions.add(
              this.reviewsService
                .getAverageRating(filter)
                .pipe(
                  tap((rating) => {
                    if (rating) {
                      this.averageRating = Math.ceil(rating.averageRating * 10) / 10;
                    }
                  }),
                  catchError((error) => {
                    console.error('Error al cargar el rating promedio:', error);
                    return of(null);
                  }),
                  finalize(() => {
                    this.isLoadingRating = false;
                  })
                )
                .subscribe()
            );
          } else {
            this.isLoadingRating = false;
          }
        })
    );
  }
}
