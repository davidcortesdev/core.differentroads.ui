import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToursService } from '../../../../core/services/tours.service';
import { Tour } from '../../../../core/models/tours/tour.model';
import {
  catchError,
  Observable,
  of,
  Subject,
  takeUntil,
  map,
  concatMap,
  scan,
} from 'rxjs';

import { ProcessedTour } from '../../../../core/models/tours/processed-tour.model';
import { BlockType } from '../../../../core/models/blocks/block.model';
import { CAROUSEL_CONFIG } from '../../../../shared/constants/carousel.constants';

interface TourSectionContent {
  title?: string;
  'featured-tours'?: Array<{ id: string }>;
  [key: string]: any;
}

@Component({
  selector: 'app-tours-section',
  standalone: false,
  templateUrl: './tours-section.component.html',
  styleUrls: ['./tours-section.component.scss'],
})
export class ToursSectionComponent implements OnInit, OnDestroy {
  @Input() content!: TourSectionContent;
  @Input() type!: string;
  tours: ProcessedTour[] = [];
  title: string = '';
  private destroy$ = new Subject<void>();
  protected carouselConfig = CAROUSEL_CONFIG;

  responsiveOptions = [
    {
      breakpoint: '2100px',
      numVisible: 4,
      numScroll: 1,
    },
    {
      breakpoint: '1700px',
      numVisible: 3,
      numScroll: 1,
    },
    {
      breakpoint: '1024px',
      numVisible: 2,
      numScroll: 1,
    },
    {
      breakpoint: '560px',
      numVisible: 1,
      numScroll: 1,
    },
  ];

  constructor(
    private readonly router: Router,
    private readonly toursService: ToursService
  ) {}

  ngOnInit(): void {
    this.title = this.content?.title || '';
    this.loadTours();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadTours(): void {
    if (!this.content || !this.content['featured-tours']?.length) {
      this.tours = [];
      return;
    }

    const tourIds: string[] = this.content['featured-tours']
      .map((tour: { id: string }): string => tour.id)
      .filter(Boolean);

    if (tourIds.length === 0) {
      this.tours = [];
      return;
    }

    // Reset tours array
    this.tours = [];

    // Use concatMap to load tours sequentially and display them as they arrive
    of(...tourIds)
      .pipe(
        concatMap((id: string) =>
          this.toursService.getTourCardData(id).pipe(
            catchError((error: Error) => {
              console.error(`Error loading tour with ID ${id}:`, error);
              return of(null);
            }),
            map((tour: Partial<Tour> | null): ProcessedTour | null => {
              if (!tour) return null;

              const tripType = tour.activePeriods
                ?.map((period) => period.tripType)
                .filter((type): type is string => !!type)
                .filter((value, index, self) => self.indexOf(value) === index);

              const days = tour.activePeriods?.[0]?.days || 0;

              return {
                imageUrl: tour.image?.[0]?.url || '',
                title: tour.name || '',
                description:
                  tour.country && days
                    ? `${tour.country} en: ${days} dias`
                    : '',
                rating: 5,
                tag: tour.marketingSection?.marketingSeasonTag || '',
                price: tour.basePrice || 0,
                availableMonths: (tour.monthTags || []).map(
                  (month: string): string =>
                    month.toLocaleUpperCase().slice(0, 3)
                ),
                isByDr: tour.tourType !== 'FIT',
                webSlug:
                  tour.webSlug ||
                  tour.name?.toLowerCase().replace(/\s+/g, '-') ||
                  '',
                tripType: tripType || [],
              };
            })
          )
        ),
        // Accumulate tours as they arrive
        scan((acc: ProcessedTour[], tour: ProcessedTour | null) => {
          if (tour) {
            return [...acc, tour];
          }
          return acc;
        }, [] as ProcessedTour[]),
        takeUntil(this.destroy$)
      )
      .subscribe((accumulatedTours: ProcessedTour[]) => {
        this.tours = accumulatedTours;
      });
  }
}
