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

// Importar servicios para filtros por tag y ubicación
import { TourTagService } from '../../../../core/services/tag/tour-tag.service';
import { TourLocationService } from '../../../../core/services/tour/tour-location.service';

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
  
  // Debug: IDs de tours para mostrar en pantalla
  debugTourIds: number[] = [];

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
    private readonly homeSectionTourFilterService: HomeSectionTourFilterService,
    private readonly tourTagService: TourTagService,
    private readonly tourLocationService: TourLocationService
  ) {}

  ngOnInit(): void {
    this.loadTourCarousel();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadTourCarousel(): void {
    console.log('loadTourCarousel', this.configurationId);
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
    if (filters.length === 0) {
      this.tours = [];
      return;
    }

    // Configurar el botón "Ver más" del primer filtro
    const primaryFilter = filters[0];
    if (primaryFilter.viewMoreButtonText && primaryFilter.viewMoreButtonUrl) {
      this.viewMoreButton = {
        text: primaryFilter.viewMoreButtonText,
        url: primaryFilter.viewMoreButtonUrl,
      };
    }

    console.log('loadToursFromFilters', filters);
    
    // Recopilar todos los IDs de tours de todos los filtros
    this.loadToursFromAllFilters(filters);
  }

  /**
   * Procesa todos los filtros y combina los IDs de tours de cada uno
   * @param filters Array de filtros a procesar
   */
  private loadToursFromAllFilters(filters: IHomeSectionTourFilterResponse[]): void {
    console.log('🔍 DEBUG: Procesando', filters.length, 'filtros:', filters.map(f => ({ 
      type: f.filterType, 
      tagId: f.tagId, 
      locationId: f.locationId, 
      specificTourIds: f.specificTourIds 
    })));

    // Crear observables para cada filtro
    const filterObservables = filters.map((filter, index) => 
      this.getTourIdsFromFilter(filter).pipe(
        map(tourIds => {
          console.log(`📋 DEBUG: Filtro ${index + 1} (${filter.filterType}):`, tourIds.length, 'tours encontrados:', tourIds);
          return tourIds;
        })
      )
    );
    
    // Combinar todos los observables usando forkJoin
    forkJoin(filterObservables)
      .pipe(
        takeUntil(this.destroy$),
        map((tourIdArrays: number[][]) => {
          // Combinar todos los arrays de IDs y eliminar duplicados
          const allTourIds = tourIdArrays.flat();
          const uniqueTourIds = [...new Set(allTourIds)];
          
          console.log('🔄 DEBUG: IDs combinados antes de eliminar duplicados:', allTourIds.length, 'tours');
          console.log('✨ DEBUG: IDs únicos después de eliminar duplicados:', uniqueTourIds.length, 'tours');
          console.log('📊 DEBUG: IDs únicos:', uniqueTourIds);
          
          // NO limitar por ahora - mostrar todos los tours
          console.log('🎯 DEBUG: Mostrando TODOS los tours sin limitación:', uniqueTourIds.length, 'tours finales');
          console.log('🏷️ DEBUG: IDs finales a cargar:', uniqueTourIds);
          
          return uniqueTourIds;
        }),
        catchError((error) => {
          console.error('❌ DEBUG: Error loading tours from filters:', error);
          return of([]);
        })
      )
      .subscribe((tourIds: number[]) => {
        if (tourIds.length === 0) {
          console.log('⚠️ DEBUG: No se encontraron tours, array vacío');
          this.tours = [];
          this.debugTourIds = [];
          return;
        }

        console.log('🚀 DEBUG: Iniciando carga de', tourIds.length, 'tours');
        
        // Guardar IDs para mostrar en pantalla
        this.debugTourIds = tourIds;
        
        // Convertir a strings y cargar los tours
        const tourIdsAsStrings = tourIds.map(id => id.toString());
        this.loadToursFromIds(tourIdsAsStrings);
      });
  }

  /**
   * Obtiene los IDs de tours de un filtro específico
   * @param filter Filtro a procesar
   * @returns Observable con array de IDs de tours
   */
  private getTourIdsFromFilter(filter: IHomeSectionTourFilterResponse): Observable<number[]> {
    console.log(`🔎 DEBUG: Procesando filtro tipo '${filter.filterType}'`);
    
    switch (filter.filterType) {
      case 'tag':
        console.log(`🏷️ DEBUG: Buscando tours por tag ID: ${filter.tagId}`);
        return this.tourTagService.getToursByTags([filter.tagId!]).pipe(
          map(tourIds => {
            console.log(`✅ DEBUG: Tag ${filter.tagId} devolvió ${tourIds.length} tours:`, tourIds);
            return tourIds;
          }),
          catchError((error) => {
            console.error(`❌ DEBUG: Error loading tours by tag ${filter.tagId}:`, error);
            return of([]);
          })
        );
      
      case 'location':
        console.log(`📍 DEBUG: Buscando tours por location ID: ${filter.locationId}`);
        return this.tourLocationService.getToursByLocations([filter.locationId!]).pipe(
          map(tourIds => {
            console.log(`✅ DEBUG: Location ${filter.locationId} devolvió ${tourIds.length} tours:`, tourIds);
            return tourIds;
          }),
          catchError((error) => {
            console.error(`❌ DEBUG: Error loading tours by location ${filter.locationId}:`, error);
            return of([]);
          })
        );
      
      case 'specific_tours':
        console.log(`🎯 DEBUG: Procesando tours específicos: ${filter.specificTourIds}`);
        try {
          const tourIds = this.homeSectionTourFilterService.parseSpecificTourIds(
            filter.specificTourIds!
          );
          console.log(`✅ DEBUG: Tours específicos parseados: ${tourIds.length} tours:`, tourIds);
          return of(tourIds);
        } catch (error) {
          console.error('❌ DEBUG: Error parsing specific tour IDs:', error);
          return of([]);
        }
      
      default:
        console.warn(`⚠️ DEBUG: Unknown filter type: ${filter.filterType}`);
        return of([]);
    }
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
    // Obtener IDs de tours relacionados con la etiqueta
    this.tourTagService
      .getToursByTags([tagId])
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error('Error loading tours by tag:', error);
          return of([]);
        })
      )
      .subscribe((tourIds: number[]) => {
        if (tourIds.length === 0) {
          this.tours = [];
          return;
        }

        // Limitar a maxToursToShow y convertir a strings
        const limitedTourIds = tourIds
          .slice(0, this.maxToursToShow)
          .map((id) => id.toString());

        // Cargar los tours usando el método existente
        this.loadToursFromIds(limitedTourIds);
      });
  }

  private loadToursByLocation(locationId: number): void {
    // Obtener IDs de tours relacionados con la ubicación
    this.tourLocationService
      .getToursByLocations([locationId])
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error('Error loading tours by location:', error);
          return of([]);
        })
      )
      .subscribe((tourIds: number[]) => {
        if (tourIds.length === 0) {
          this.tours = [];
          return;
        }

        // Limitar a maxToursToShow y convertir a strings
        const limitedTourIds = tourIds
          .slice(0, this.maxToursToShow)
          .map((id) => id.toString());

        // Cargar los tours usando el método existente
        this.loadToursFromIds(limitedTourIds);
      });
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
