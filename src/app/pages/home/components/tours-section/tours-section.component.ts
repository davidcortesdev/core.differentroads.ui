import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToursService } from '../../../../core/services/tours.service';
import { Tour } from '../../../../core/models/tours/tour.model';
import { catchError } from 'rxjs';

import { ProcessedTour } from '../../../../core/models/tours/processed-tour.model';
import { BlockType } from '../../../../core/models/blocks/block.model';

@Component({
  selector: 'app-tours-section',
  standalone: false,
  templateUrl: './tours-section.component.html',
  styleUrls: ['./tours-section.component.scss'],
})
export class ToursSectionComponent implements OnInit {
  @Input() content!: any;
  @Input() type!: BlockType;
  tours: ProcessedTour[] = [];

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

  ngOnInit() {
    this.loadTours();
  }

  private loadTours(): void {
    if (!this.content || !this.content['featured-tours']) {
      this.tours = [];
      return;
    }

    const tourIds: Array<string> = this.content['featured-tours'].map(
      (tour: { id: string }): string => tour.id
    );

    if (tourIds.length === 0) {
      this.tours = [];
      return;
    }

    this.tours = [];

    tourIds.forEach((id: string): void => {
      this.toursService
        .getTourCardData(id)
        .pipe(
          catchError((error: Error) => {
            console.error(`Error loading tour with ID ${id}:`, error);
            return [];
          })
        )
        .subscribe((tour: Partial<Tour>): void => {
          if (tour) {
            const days = tour.activePeriods?.[0]?.days || 0;
            const processedTour: ProcessedTour = {
              imageUrl: tour.image?.[0]?.url || '',
              title: tour.name || '',
              description:
                tour.country && days ? `${tour.country} en: ${days} dias` : '',
              rating: 5,
              tag: tour.marketingSection?.marketingSeasonTag || '',
              price: tour.basePrice || 0,
              availableMonths: (tour.monthTags || []).map(
                (month: string): string => month.toLocaleUpperCase().slice(0, 3)
              ),
              isByDr: false,
              webSlug:
                tour.webSlug ||
                tour.name?.toLowerCase().replace(/\s+/g, '-') ||
                '',
            };
            this.tours = [...this.tours, processedTour];
          }
        });
    });
  }
}
