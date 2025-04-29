import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Subscription, catchError, finalize, of, tap } from 'rxjs';
import { ReviewsService } from '../../../../core/services/reviews.service';
import { TourNetService } from '../../../../core/services/tourNet.service';

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
    private tourNetService: TourNetService
  ) {}

  ngOnInit() {
    if (this.tourData.externalID) {
      this.loadRatingAndReviewCount(this.tourData.externalID);
    }
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
      this.tourNetService.getTourIdByTKId(tkId).pipe(
        tap(id => {
          if (!id) {
            console.warn('No se encontró ID para el tour con tkId:', tkId);
          }
        }),
        catchError(error => {
          console.error('Error al obtener el ID del tour:', error);
          return of(null);
        })
      ).subscribe(id => {
        if (id) {
          const filter = { tourId: id };
          
          this.subscriptions.add(
            this.reviewsService.getAverageRating(filter).pipe(
              tap(rating => {
                if (rating) {
                  this.averageRating = Math.ceil(rating * 10) / 10;
                }
              }),
              catchError(error => {
                console.error('Error al cargar el rating promedio:', error);
                return of(null);
              }),
              finalize(() => {
                this.isLoadingRating = false;
              })
            ).subscribe()
          );
        } else {
          this.isLoadingRating = false;
        }
      })
    );
  }
}
