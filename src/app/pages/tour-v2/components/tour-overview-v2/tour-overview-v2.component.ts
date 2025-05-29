import { Component, Input, OnInit } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TourNetService } from '../../../../core/services/tourNet.service';
import { CMSTourService, ICMSTourResponse } from '../../../../core/services/cms/cms-tour.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-tour-overview-v2',
  templateUrl: './tour-overview-v2.component.html',
  styleUrls: ['./tour-overview-v2.component.scss'],
  standalone: false
})
export class TourOverviewV2Component implements OnInit {
  @Input() tourId: number | undefined;
  
  tour: any = {
    id: 0,
    name: '',
    subtitle: '',
    description: '',
    continent: 'Unknown',
    country: 'Unknown',
    cities: [],
    vtags: [],
    expert: {
      name: 'Expert Name',
      charge: 'Travel Expert',
      opinion: 'This is a sample expert opinion about the tour.',
      ephoto: [{ url: 'assets/images/placeholder-avatar.png' }],
      creatorId: undefined
    },
    image: [{ url: 'assets/images/placeholder-tour.jpg', alt: 'Tour Image' }]
  };

  constructor(
    private sanitizer: DomSanitizer,
    private tourNetService: TourNetService,
    private cmsTourService: CMSTourService
  ) {}

  ngOnInit(): void {
    if (this.tourId) {
      this.loadTour(this.tourId);
    }
  }

  private loadTour(id: number): void {
    // Fetch both tour data and CMS data in parallel
    forkJoin([
      this.tourNetService.getTourById(id).pipe(
        catchError(error => {
          console.error('Error loading tour data:', error);
          return of(null);
        })
      ),
      this.cmsTourService.getAllTours({ tourId: id }).pipe(
        catchError(error => {
          console.error('Error loading CMS tour data:', error);
          return of([]);
        })
      )
    ]).subscribe(([tourData, cmsTourData]) => {
      // Get the first CMS tour data (if any)
      const cmsTour = Array.isArray(cmsTourData) && cmsTourData.length > 0 ? cmsTourData[0] : null;
      
      // Merge all data sources
      this.tour = {
        ...this.tour, // Default values
        ...tourData,  // Tour data from TourNetService
        // Map CMS data if available
        ...(cmsTour ? {
          image: [{
            url: cmsTour.imageUrl || '',
            alt: cmsTour.imageAlt || 'Tour Image'
          }],
          expert: {
            ...this.tour.expert,
            opinion: cmsTour.creatorComments || this.tour.expert.opinion,
            // Add creator ID to expert object if needed
            creatorId: cmsTour.creatorId
          }
        } : {}),
        // Keep the example cities and tags
        cities: ['Ejemplo', 'Ejemplo2'], //TODO: Replace with actual data as needed
        vtags: ['Tag1', 'Tag2']   //TODO: Replace with actual data as needed
      };
    });
  }

  sanitizeHtml(html: string = ''): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  get destinationItems(): MenuItem[] {
    return this.tour?.cities?.map((city: string) => ({
      label: city,
    })) || [];
  }

  get breadcrumbItems(): MenuItem[] {
    return [
      {
        label: this.tour?.continent,
        routerLink: ['/tours'],
        queryParams: {
          destination: typeof this.tour?.continent === 'string' 
            ? this.tour.continent.trim() 
            : this.tour?.continent || ''
        }
      },
      {
        label: this.tour?.country,
        routerLink: ['/tours'],
        queryParams: {
          destination: typeof this.tour?.country === 'string' 
            ? this.tour.country.trim() 
            : this.tour?.country || ''
        }
      },
      { label: this.tour?.name || 'Tour Details' }
    ];
  }
}
