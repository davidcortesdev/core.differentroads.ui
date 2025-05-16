import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToursService } from '../../../../core/services/tours.service';
import { catchError } from 'rxjs';
import { TourListContent } from '../../../../core/models/blocks/tour-list-content.model';
import { Tour } from '../../../../core/models/tours/tour.model';
interface ITour {
  imageUrl: string;
  title: string;
  description: string;
  rating: number;
  tag: string;
  price: number;
  availableMonths: string[];
  isByDr: boolean;
  webSlug: string;
  externalID?: string;
}

@Component({
  selector: 'app-tours-list-section',
  standalone: false,
  templateUrl: './tours-list-section.component.html',
  styleUrls: ['./tours-list-section.component.scss'],
})
export class ToursListComponent implements OnInit {
  @Input() content!: TourListContent;
  @Input() type!: string;

  tours: ITour[] = [];
  layout: 'grid' | 'list' = 'grid';
  showMoreButton: boolean = false;
  displayedTours: ITour[] = [];

  private readonly maxDisplayedTours = 8;
  private currentDisplayedTours = this.maxDisplayedTours;

  constructor(
    private router: Router,
    private readonly toursService: ToursService
  ) {}

  ngOnInit() {
    this.loadTours();
  }

  getTagDisplay(tour: ITour): string {
    if (!tour.tag) return ''; // Return empty string if no tag
    return tour.isByDr ? 'ByDR' : 'Beyond Different';
  }

  private loadTours(): void {
    const tourIds: Array<string> = this.content['tour-list'].map(
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
            //console.error(`Error loading tour with ID ${id}:`, error);
            return [];
          })
        )
        .subscribe((tour: Partial<Tour>): void => {
          if (tour) {
            const days = tour.activePeriods?.[0]?.days || '';
            const processedTour: ITour = {
              imageUrl: tour.image?.[0]?.url || '',
              title: tour.name || '',
              description:
                tour.country && days ? `${tour.country} en: ${days} dias` : '',
              rating: 5,
              tag: tour.marketingSection?.marketingSeasonTag || '',
              price: tour.price || 0,
              availableMonths: Array.isArray(tour.monthTags)
                ? tour.monthTags.map((month) =>
                    month.substring(0, 3).toUpperCase()
                  )
                : [],
              isByDr: tour.tourType !== 'FIT',
              webSlug:
                tour.webSlug ||
                tour.name?.toLowerCase().replace(/\s+/g, '-') ||
                '',
              externalID: tour.externalID,
            };
            this.tours = [...this.tours, processedTour];
            this.displayedTours = this.tours.slice(
              0,
              this.currentDisplayedTours
            );
            this.showMoreButton =
              this.tours.length > this.currentDisplayedTours;
          }
        });
    });
  }

  showMoreTours(): void {
    this.currentDisplayedTours += this.maxDisplayedTours;
    this.displayedTours = this.tours.slice(0, this.currentDisplayedTours);
    this.showMoreButton = this.tours.length > this.currentDisplayedTours;
  }

  navigateToAllContents(type: string) {
    this.router.navigate(['/tours']);
  }
}
