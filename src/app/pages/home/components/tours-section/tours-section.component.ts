import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToursService } from '../../../../core/services/tours.service';
import { Tour } from '../../../../core/models/tours/tour.model';
import { catchError } from 'rxjs';
import { FeaturedToursSection } from '../../../../core/models/home/featured-tours/featured-tour.model';
import { BlockType } from '../../../../core/models/blocks/block.model'; // Asegúrate de importar BlockType

interface ProcessedTour {
  imageUrl: string;
  title: string;
  description: string;
  rating: number;
  tag: string;
  price: number;
  availableMonths: string[];
  isByDr: boolean;
}

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
      breakpoint: '1400px',
      numVisible: 3,
      numScroll: 1,
    },
    {
      breakpoint: '1024px',
      numVisible: 2,
      numScroll: 1,
    },
    {
      breakpoint: '768px',
      numVisible: 1,
      numScroll: 1,
    },
  ];

  constructor(
    private readonly router: Router,
    private readonly toursService: ToursService
  ) {}

  ngOnInit() {
    console.log('Tour List Content:', this.content);
    console.log('Featured Tours:', this.content['tour-list']);
    this.loadTours();
  }

  private loadTours(): void {
    if (!this.content || !this.content['tour-list']) {
      this.tours = [];
      return;
    }

    const tourIds: Array<string> = this.content['tour-list'].map(
      (tour: { id: string }): string => tour.id
    );

    if (tourIds.length === 0) {
      this.tours = [];
      return;
    }

    this.tours = []; // Reset the list

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
          console.log('tourssss:', tour);
          if (tour) {
            const processedTour: ProcessedTour = {
              imageUrl: tour.image?.[0]?.url || '',
              title: tour.name || '',
              description: tour.description || '',
              rating: 5,
              tag: tour.marketingSection?.marketingSeasonTag || '',
              price: tour.basePrice || 0,
              availableMonths: tour.monthTags || [],
              isByDr: true,
            };
            this.tours = [...this.tours, processedTour];

            console.log('pruebaaaaa', this.tours);
          }
        });
    });
  }

  navigateToTour(tour: ProcessedTour): void {
    this.router.navigate([
      '/tours',
      tour.title.toLowerCase().replace(/\s+/g, '-'),
    ]);
  }

  onTourClick(tour: ProcessedTour): void {
    this.navigateToTour(tour);
  }
}
