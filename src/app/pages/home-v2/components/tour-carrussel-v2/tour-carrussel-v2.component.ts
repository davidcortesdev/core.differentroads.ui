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
  forkJoin,
  switchMap,
} from 'rxjs';

import { ProcessedTour } from '../../../../core/models/tours/processed-tour.model';
import { CAROUSEL_CONFIG } from '../../../../shared/constants/carousel.constants';

// Importar los servicios de configuración del home
import {
  HomeSectionConfigurationService,
  IHomeSectionConfigurationResponse,
} from '../../../../core/services/home/home-section-configuration.service';
import {
  HomeSectionTourFilterService,
  IHomeSectionTourFilterResponse,
} from '../../../../core/services/home/home-section-tour-filter.service';

@Component({
  selector: 'app-tour-carrussel-v2',
  standalone: false,
  templateUrl: './tour-carrussel-v2.component.html',
  styleUrls: ['./tour-carrussel-v2.component.scss'],
})
export class TourCarrusselV2Component implements OnInit, OnDestroy {
  @Input() configurationId?: number; // ID de la configuración específica (opcional)
  @Input() sectionDisplayOrder?: number; // Orden de visualización de la sección (opcional)

  tours: ProcessedTour[] = [];
  title: string = '';
  description: string = '';
  showMonthTags: boolean = false;
  maxToursToShow: number = 6;
  viewMoreButton?: {
    text: string;
    url: string;
  };

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
    private readonly toursService: ToursService,
    private readonly homeSectionConfigurationService: HomeSectionConfigurationService,
    private readonly homeSectionTourFilterService: HomeSectionTourFilterService
  ) {}

  ngOnInit(): void {
    this.loadTourCarousel();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadTourCarousel(): void {
    // Si se proporciona un configurationId específico, úsalo
    if (this.configurationId) {
      this.loadSpecificConfiguration(this.configurationId);
      return;
    }

    // Si no, cargar la primera configuración activa del carrusel de tours
    this.homeSectionConfigurationService
      .getTourCarouselConfigurations()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (configurations) => {
          if (configurations.length > 0) {
            // Si se especifica un orden de visualización, buscar esa configuración
            let targetConfig = configurations[0];
            if (this.sectionDisplayOrder !== undefined) {
              const foundConfig = configurations.find(
                (c) => c.displayOrder === this.sectionDisplayOrder
              );
              if (foundConfig) {
                targetConfig = foundConfig;
              }
            }
            this.loadSpecificConfiguration(targetConfig.id);
          }
        },
        error: (error) => {
          console.error('Error loading tour carousel configurations:', error);
        },
      });
  }

  private loadSpecificConfiguration(configId: number): void {
    // Cargar la configuración específica
    this.homeSectionConfigurationService
      .getById(configId)
      .pipe(
        switchMap((configuration) => {
          // Establecer datos de la configuración
          this.title = configuration.title || '';
          this.description = configuration.content || '';
          this.showMonthTags = configuration.showMonthTags || false;
          this.maxToursToShow = configuration.maxToursToShow || 6;

          // Cargar filtros de tours para esta configuración
          return this.homeSectionTourFilterService.getByConfigurationOrdered(
            configId,
            true
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (filters) => {
          if (filters.length > 0) {
            this.loadToursFromFilters(filters);
          } else {
            this.tours = [];
          }
        },
        error: (error) => {
          console.error('Error loading configuration or filters:', error);
          this.tours = [];
        },
      });
  }

  private loadToursFromFilters(
    filters: IHomeSectionTourFilterResponse[]
  ): void {
    // Tomar el primer filtro activo para simplificar
    // En una implementación más compleja, podrías combinar múltiples filtros
    const primaryFilter = filters[0];

    if (primaryFilter.viewMoreButtonText && primaryFilter.viewMoreButtonUrl) {
      this.viewMoreButton = {
        text: primaryFilter.viewMoreButtonText,
        url: primaryFilter.viewMoreButtonUrl,
      };
    }

    // Cargar tours según el tipo de filtro
    this.loadToursByFilter(primaryFilter);
  }

  private loadToursByFilter(filter: IHomeSectionTourFilterResponse): void {
    switch (filter.filterType) {
      case 'tag':
        this.loadToursByTag(filter.tagId!);
        break;
      case 'location':
        this.loadToursByLocation(filter.locationId!);
        break;
      case 'specific_tours':
        this.loadSpecificTours(filter.specificTourIds!);
        break;
      default:
        console.warn('Unknown filter type:', filter.filterType);
        this.tours = [];
    }
  }

  private loadToursByTag(tagId: number): void {
    // Aquí necesitarías adaptar tu ToursService para aceptar filtro por tag
    // Por ahora, usar el método existente como fallback
    console.log('Loading tours by tag:', tagId);
    // TODO: Implementar this.toursService.getToursByTag(tagId, this.maxToursToShow)
    this.tours = [];
  }

  private loadToursByLocation(locationId: number): void {
    // Aquí necesitarías adaptar tu ToursService para aceptar filtro por localización
    console.log('Loading tours by location:', locationId);
    // TODO: Implementar this.toursService.getToursByLocation(locationId, this.maxToursToShow)
    this.tours = [];
  }

  private loadSpecificTours(specificTourIdsJson: string): void {
    try {
      const tourIds =
        this.homeSectionTourFilterService.parseSpecificTourIds(
          specificTourIdsJson
        );

      if (tourIds.length === 0) {
        this.tours = [];
        return;
      }

      // Convertir números a strings si es necesario (según tu API)
      const tourIdsAsStrings = tourIds.map((id) => id.toString());

      // Usar tu método existente pero adaptado
      this.loadToursFromIds(tourIdsAsStrings);
    } catch (error) {
      console.error('Error parsing specific tour IDs:', error);
      this.tours = [];
    }
  }

  private loadToursFromIds(tourIds: string[]): void {
    // Usar tu lógica existente pero limitando a maxToursToShow
    const limitedTourIds = tourIds.slice(0, this.maxToursToShow);

    // Reset tours array
    this.tours = [];

    // Use concatMap to load tours sequentially and display them as they arrive
    of(...limitedTourIds)
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
                price: tour.price || 0,
                availableMonths: this.showMonthTags
                  ? (tour.monthTags || []).map((month: string): string =>
                      month.toLocaleUpperCase().slice(0, 3)
                    )
                  : [], // Solo mostrar meses si está configurado
                isByDr: tour.tourType !== 'FIT',
                webSlug:
                  tour.webSlug ||
                  tour.name?.toLowerCase().replace(/\s+/g, '-') ||
                  '',
                tripType: tripType || [],
                externalID: tour.externalID,
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

  onViewMore(): void {
    if (this.viewMoreButton?.url) {
      this.router.navigate([this.viewMoreButton.url]);
    }
  }
}
