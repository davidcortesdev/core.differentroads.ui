import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';
import { ToursService } from '../../../../core/services/tours.service';

@Component({
  selector: 'app-tour-related',
  standalone: false,
  templateUrl: './tour-related.component.html',
  styleUrl: './tour-related.component.scss'
})
export class TourRelatedComponent implements OnInit, OnChanges {
  @Input() destinations: string[] | undefined = [];
  
  isLoading: boolean = false;
  sectionContent: any = null;

  constructor(private readonly toursService: ToursService) {}

  ngOnInit() {
    this.checkAndLoadTours();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['destinations']) {
      this.checkAndLoadTours();
    }
  }

  checkAndLoadTours() {
    if (this.destinations && this.destinations.length > 0) {
      this.loadTours();
    } else {
      console.log('No destinations provided to tour-related component');
      this.sectionContent = null;
    }
  }

  loadTours() {
    this.isLoading = true;
    
    // Trim each destination and filter out empty strings
    const trimmedDestinations = this.destinations
      ?.map(dest => dest.trim())
      .filter(dest => dest.length > 0) || [];
    
    if (trimmedDestinations.length === 0) {
      this.isLoading = false;
      this.sectionContent = null;
      return;
    }
    
    // Create an array of observables for each destination
    const requests = trimmedDestinations.map(destination => {
      const filters = {
        destination: destination,
        sort: 'next-departures',
        limit: 5 // Limit to 5 tours per destination
      };
      
      return this.toursService.getFilteredToursList(filters).pipe(
        catchError(error => {
          console.error(`Error loading related tours for ${destination}:`, error);
          return of({ data: [] });
        })
      );
    });
    
    // Execute all requests in parallel
    forkJoin(requests).subscribe(results => {
      // Combine all tour IDs from all destinations
      const tourIds = results.flatMap(result => 
        (result.data || []).map((tour: any) => ({ id: tour.id }))
      );
      
      // Remove duplicates by ID
      const uniqueTourIds = tourIds.filter((tour, index, self) => 
        index === self.findIndex(t => t.id === tour.id)
      );
      
      // Create the section content object in the format expected by tours-section
      this.sectionContent = {
        title: 'Tours relacionados',
        'featured-tours': uniqueTourIds.slice(0, 10) // Limit to 10 tours total
      };
      
      this.isLoading = false;
    });
  }
}
