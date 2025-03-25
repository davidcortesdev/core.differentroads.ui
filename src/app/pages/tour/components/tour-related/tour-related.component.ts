import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { catchError } from 'rxjs';
import { ToursService } from '../../../../core/services/tours.service';

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
}

@Component({
  selector: 'app-tour-related',
  standalone: false,
  templateUrl: './tour-related.component.html',
  styleUrl: './tour-related.component.scss'
})
export class TourRelatedComponent implements OnInit, OnChanges {
  @Input() destinations: string[] | undefined = [];
  
  displayedTours: ITour[] = [];
  isLoading: boolean = false;

  constructor(private readonly toursService: ToursService) {}

  ngOnInit() {
    console.log('Destinations in related component:', this.destinations);
    this.checkAndLoadTours();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['destinations']) {
      this.checkAndLoadTours();
    }
  }

  checkAndLoadTours() {
    console.log('Destinations in related component:', this.destinations);
    if (this.destinations && this.destinations.length > 0) {
      this.loadTours();
    } else {
      console.log('No destinations provided to tour-related component');
      this.displayedTours = [];
    }
  }

  loadTours() {
    this.isLoading = true;
    this.displayedTours = [];
    
    // Trim each destination and filter out empty strings
    const trimmedDestinations = this.destinations
      ?.map(dest => dest.trim())
      .filter(dest => dest.length > 0) || [];
    
    console.log('Trimmed destinations:', trimmedDestinations);
    
    if (trimmedDestinations.length === 0) {
      this.isLoading = false;
      return;
    }
    
    // Process each destination individually
    let completedRequests = 0;
    const totalRequests = trimmedDestinations.length;
    
    trimmedDestinations.forEach(destination => {
      const filters = {
        destination: destination,
        sort: 'next-departures'
      };

      console.log(`Fetching related tours for destination: ${destination}`);

      this.toursService
        .getFilteredToursList(filters)
        .pipe(
          catchError((error: Error) => {
            console.error(`Error loading related tours for ${destination}:`, error);
            completedRequests++;
            if (completedRequests === totalRequests) {
              this.isLoading = false;
            }
            return [];
          })
        )
        .subscribe((tours: any) => {
          console.log(`Related tours response for ${destination}:`, tours);
          
          // Process tour data
          if (tours && tours.data && tours.data.length > 0) {
            const newTours = tours.data.map((tour: any) => {
              const days = tour?.activePeriods?.[0]?.days || '';

              return {
                imageUrl: tour.image?.[0]?.url || '',
                title: tour.name || '',
                description:
                  tour.country && days ? `${tour.country} en: ${days} dias` : '',
                rating: 5,
                tag: tour.marketingSection?.marketingSeasonTag || '',
                price: tour.price || 0,
                availableMonths:
                  tour.monthTags?.map((month: string) =>
                    month.substring(0, 3).toUpperCase()
                  ) || [],
                isByDr: true,
                webSlug: tour.webSlug || '',
              };
            });
            
            // Add new tours to the displayed tours array, avoiding duplicates
            newTours.forEach((newTour: ITour) => {
              if (!this.displayedTours.some(existingTour => existingTour.webSlug === newTour.webSlug)) {
                this.displayedTours.push(newTour);
              }
            });
          }
          
          completedRequests++;
          if (completedRequests === totalRequests) {
            console.log('All requests completed. Final displayed tours:', this.displayedTours);
            this.isLoading = false;
          }
        });
    });
  }
}
