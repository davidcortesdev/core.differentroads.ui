import { Component, Input, OnInit } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TourNetService } from '../../../../core/services/tourNet.service';
import { CMSTourService, ICMSTourResponse } from '../../../../core/services/cms/cms-tour.service';
import { CMSCreatorService } from '../../../../core/services/cms/cms-creator.service';
import { forkJoin, of, Observable } from 'rxjs';
import { catchError, switchMap, map } from 'rxjs/operators';

interface TourData {
  id?: number;
  name?: string;
  [key: string]: any;
}

interface CMSTourData {
  creatorId?: number;
  creatorComments?: string;
  imageUrl?: string;
  imageAlt?: string;
  [key: string]: any;
}

interface CreatorData {
  id?: number;
  name?: string;
  description?: string;
  imageUrl?: string;
  imageAlt?: string;
  [key: string]: any;
}

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
    private cmsTourService: CMSTourService,
    private cmsCreatorService: CMSCreatorService
  ) {}

  ngOnInit(): void {
    if (this.tourId) {
      this.loadTour(this.tourId);
    }
  }

  private loadTour(id: number): void {
    // First, fetch tour data and CMS tour data in parallel
    forkJoin([
      this.tourNetService.getTourById(id).pipe(
        catchError(error => {
          console.error('Error loading tour data:', error);
          return of(null);
        })
      ) as Observable<TourData | null>,
      this.cmsTourService.getAllTours({ tourId: id }).pipe(
        catchError(error => {
          console.error('Error loading CMS tour data:', error);
          return of([]);
        })
      ) as Observable<CMSTourData[]>
    ]).pipe(
      // Once we have the initial data, fetch creator information if available
      switchMap(([tourData, cmsTourData]) => {
        const cmsTour: CMSTourData | null = Array.isArray(cmsTourData) && cmsTourData.length > 0 ? cmsTourData[0] : null;
        const creatorId = cmsTour?.creatorId;
        
        // If we have a creator ID, fetch creator details
        if (creatorId) {
          return (this.cmsCreatorService.getById(creatorId) as Observable<CreatorData>).pipe(
            catchError(error => {
              console.error('Error loading creator data:', error);
              // Return null for creator if there's an error
              return of(null);
            }),
            map((creator: CreatorData | null) => ({
              tourData,
              cmsTour,
              creator
            }))
          );
        }
        
        // If no creator ID, just return the data we have
        return of({
          tourData,
          cmsTour,
          creator: null as CreatorData | null
        });
      })
    ).subscribe(({ tourData, cmsTour, creator }: { tourData: TourData | null; cmsTour: CMSTourData | null; creator: CreatorData | null }) => {
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
            // Use creator data if available, otherwise fall back to CMS tour data or defaults
            name: creator?.name || this.tour.expert.name,
            charge: creator?.description || this.tour.expert.charge,
            opinion: cmsTour.creatorComments || this.tour.expert.opinion,
            creatorId: cmsTour.creatorId,
            // Use creator image if available, otherwise use default
            ephoto: creator?.imageUrl ? [{
              url: creator.imageUrl,
              alt: creator.imageAlt || 'Creator Image'
            }] : this.tour.expert.ephoto
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
