import { Component, Input, OnInit } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TourNetService } from '../../../../core/services/tourNet.service';

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
      ephoto: [{ url: 'assets/images/placeholder-avatar.png' }]
    },
    image: [{ url: 'assets/images/placeholder-tour.jpg', alt: 'Tour Image' }]
  };

  constructor(
    private sanitizer: DomSanitizer,
    private tourNetService: TourNetService
  ) {}

  ngOnInit(): void {
    if (this.tourId) {
      this.loadTour(this.tourId);
    }
  }

  private loadTour(id: number): void {
    this.tourNetService.getTourById(id).subscribe({
      next: (tourData) => {
        this.tour = {
          ...this.tour, // Keep default values
          ...tourData,  // Override with API data
          // Map API fields to expected format if needed
          cities: ['Ejemplo','Ejemplo2'], //TODO:Example mapping, adjust as needed
          vtags: ['Tag1','Tag2']   //TODO:Example mapping, adjust as needed
        };
      },
      error: (error) => {
        console.error('Error loading tour:', error);
        // Keep the default tour data on error
      }
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
