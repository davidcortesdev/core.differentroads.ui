import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  TourNetService,
  Tour as TourNetTour,
} from '../../../../core/services/tour/tourNet.service';
import {
  CMSTourService,
  ICMSTourResponse,
} from '../../../../core/services/cms/cms-tour.service';
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
import { TourDataV2 } from '../../../../shared/components/tour-card-v2/tour-card-v2.model';

// Importar los servicios de configuración del home
import {
  HomeSectionConfigurationService,
} from '../../../../core/services/home/home-section-configuration.service';
import {
  HomeSectionTourFilterService,
  IHomeSectionTourFilterResponse,
} from '../../../../core/services/home/home-section-tour-filter.service';

// Importar servicios para filtros por tag y ubicación
import { TourTagService } from '../../../../core/services/tag/tour-tag.service';
import { TourLocationService } from '../../../../core/services/tour/tour-location.service';

// ✅ NUEVOS SERVICIOS: Para fechas y tags
import {
  DepartureService,
  IDepartureResponse,
} from '../../../../core/services/departure/departure.service';
import {
  ItineraryService,
  IItineraryResponse,
  ItineraryFilters,
} from '../../../../core/services/itinerary/itinerary.service';
import {
  ItineraryDayService,
  IItineraryDayResponse,
} from '../../../../core/services/itinerary/itinerary-day/itinerary-day.service';

@Component({
  selector: 'app-tour-list-v2',
  standalone: false,
  templateUrl: './tour-list-v2.component.html',
  styleUrls: ['./tour-list-v2.component.scss'],
})
export class TourListV2Component implements OnInit, OnDestroy {
  @Input() configurationId?: number; // ID de la configuración específica (opcional)
  @Input() sectionDisplayOrder?: number; // Orden de visualización de la sección (opcional)
  @Input() sectionType?: number; // Tipo de sección (3 = TOUR_GRID, 5 = MIXED_SECTION)

  tours: TourDataV2[] = [];
  title: string = '';
  description: string = '';
  showMonthTags: boolean = false;
  maxToursToShow: number = 6;
  viewMoreButton?: {
    text: string;
    url: string;
  };

  private destroy$ = new Subject<void>();

  constructor(
    private readonly router: Router,
    private readonly tourNetService: TourNetService,
    private readonly cmsTourService: CMSTourService,
    private readonly homeSectionConfigurationService: HomeSectionConfigurationService,
    private readonly homeSectionTourFilterService: HomeSectionTourFilterService,
    private readonly tourTagService: TourTagService,
    private readonly tourLocationService: TourLocationService,
    // ✅ NUEVOS SERVICIOS: Para fechas y tags
    private readonly departureService: DepartureService,
    private readonly itineraryService: ItineraryService,
    private readonly itineraryDayService: ItineraryDayService
  ) {}

  ngOnInit(): void {
    this.loadTourList();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadTourList(): void {
    // Si se proporciona un configurationId específico, úsalo
    if (this.configurationId) {
      this.loadSpecificConfiguration(this.configurationId);
      return;
    }

    // Determinar el tipo de sección a cargar
    const sectionType = this.sectionType || 3; // Por defecto TOUR_GRID (ID: 3)

    // Cargar configuraciones según el tipo de sección
    let configObservable;
    if (sectionType === 3) {
      configObservable =
        this.homeSectionConfigurationService.getTourGridConfigurations();
    } else {
      configObservable = this.homeSectionConfigurationService.getBySectionType(
        sectionType,
        true
      );
    }

    configObservable.pipe(takeUntil(this.destroy$)).subscribe({
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
            } else {
              console.warn(
                '⚠️ No se encontró configuración con displayOrder:',
                this.sectionDisplayOrder
              );
            }
          }

          this.loadSpecificConfiguration(targetConfig.id);
        } else {
          console.warn(
            '⚠️ TourListV2 - No configurations found for sectionType:',
            sectionType
          );
          console.warn(
            '⚠️ Esto puede indicar que no hay configuraciones activas para esta sección'
          );
        }
      },
      error: (error) => {
        console.error(
          '❌ Error loading TOUR_GRID configurations (ID: 3):',
          error
        );
        console.error('❌ Error completo:', error);
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
            console.warn(
              '⚠️ No se encontraron filtros para la configuración ID:',
              configId
            );
            this.tours = [];
          }
        },
        error: (error) => {
          console.error('❌ Error loading configuration or filters:', error);
          console.error('❌ Error completo:', error);
          this.tours = [];
        },
      });
  }

  private loadToursFromFilters(
    filters: IHomeSectionTourFilterResponse[]
  ): void {
    if (filters.length === 0) {
      console.warn('⚠️ No hay filtros para procesar');
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

    // Recopilar todos los IDs de tours de todos los filtros
    this.loadToursFromAllFilters(filters);
  }

  /**
   * Procesa todos los filtros y combina los IDs de tours de cada uno
   * @param filters Array de filtros a procesar
   */
  private loadToursFromAllFilters(
    filters: IHomeSectionTourFilterResponse[]
  ): void {
    // Crear observables para cada filtro
    const filterObservables = filters.map((filter, index) =>
      this.getTourIdsFromFilter(filter).pipe(
        map((tourIds) => {
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

          return uniqueTourIds;
        }),
        catchError((error) => {
          console.error('❌ DEBUG: Error loading tours from filters:', error);
          return of([]);
        })
      )
      .subscribe((tourIds: number[]) => {
        if (tourIds.length === 0) {
          this.tours = [];
          return;
        }

        // Convertir a strings y cargar los tours
        const tourIdsAsStrings = tourIds.map((id) => id.toString());
        this.loadToursFromIds(tourIdsAsStrings);
      });
  }

  /**
   * Obtiene los IDs de tours de un filtro específico
   * @param filter Filtro a procesar
   * @returns Observable con array de IDs de tours
   */
  private getTourIdsFromFilter(
    filter: IHomeSectionTourFilterResponse
  ): Observable<number[]> {
    switch (filter.filterType) {
      case 'tag':
        return this.tourTagService.getToursByTags([filter.tagId!]).pipe(
          map((tourIds) => {
            return tourIds;
          }),
          catchError((error) => {
            console.error(
              `❌ DEBUG: Error loading tours by tag ${filter.tagId}:`,
              error
            );
            return of([]);
          })
        );

      case 'location':
        return this.tourLocationService
          .getToursByLocations([filter.locationId!])
          .pipe(
            map((tourIds) => {
              return tourIds;
            }),
            catchError((error) => {
              console.error(
                `❌ DEBUG: Error loading tours by location ${filter.locationId}:`,
                error
              );
              return of([]);
            })
          );

      case 'specific_tours':
        try {
          const tourIds =
            this.homeSectionTourFilterService.parseSpecificTourIds(
              filter.specificTourIds!
            );
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

  // ✅ MÉTODO AUXILIAR: Obtener datos adicionales (fechas, tags, días)
  private getAdditionalTourData(tourId: number): Observable<{
    departures: IDepartureResponse[];
    tags: string[];
    itineraryDays: IItineraryDayResponse[];
  }> {
    // ✅ USAR LOS MISMOS FILTROS QUE TOUR-DEPARTURES-V2
    const itineraryFilters: ItineraryFilters = {
      tourId: tourId,
      isVisibleOnWeb: true, // ✅ FILTRO ADICIONAL
      isBookable: true, // ✅ FILTRO ADICIONAL
    };

    // Obtener itinerarios del tour para luego obtener departures
    return this.itineraryService.getAll(itineraryFilters, false).pipe(
      switchMap((itineraries: IItineraryResponse[]) => {
        if (itineraries.length === 0) {
          return of({
            departures: [],
            tags: [],
            itineraryDays: [],
          });
        }

        // Obtener departures de todos los itinerarios
        const departureRequests = itineraries.map((itinerary) =>
          this.departureService.getByItinerary(itinerary.id, false).pipe(
            catchError((error) => {
              console.error(
                `❌ Error obteniendo departures para itinerary ${itinerary.id}:`,
                error
              );
              return of([]);
            })
          )
        );

        return forkJoin(departureRequests).pipe(
          switchMap((departureArrays: IDepartureResponse[][]) => {
            const allDepartures = departureArrays.flat();

            // Obtener días de itinerario del primer itinerario disponible
            const itineraryDaysRequest =
              itineraries.length > 0
                ? this.itineraryDayService
                    .getAll({ itineraryId: itineraries[0].id })
                    .pipe(
                      catchError((error) => {
                        console.error(
                          `❌ Error obteniendo días de itinerario para itinerary ${itineraries[0].id}:`,
                          error
                        );
                        return of([]);
                      })
                    )
                : of([]);

            // Obtener tags del tour
            const tagRequest = this.tourTagService.getAll({ tourId }).pipe(
              map((tourTags) => {
                // Por ahora retornamos un array vacío, pero aquí podrías obtener los nombres de los tags
                return [];
              }),
              catchError((error) => {
                console.error(
                  `❌ Error obteniendo tags para tour ${tourId}:`,
                  error
                );
                return of([]);
              })
            );

            return forkJoin([tagRequest, itineraryDaysRequest]).pipe(
              map(([tags, itineraryDays]) => {
                const result = {
                  departures: allDepartures,
                  tags: tags as string[],
                  itineraryDays: itineraryDays as IItineraryDayResponse[],
                };

                return result;
              })
            );
          })
        );
      }),
      catchError((error) => {
        console.error(
          `❌ Error obteniendo datos adicionales para tour ${tourId}:`,
          error
        );
        return of({
          departures: [],
          tags: [],
          itineraryDays: [],
        });
      })
    );
  }

  private loadToursFromIds(tourIds: string[]): void {
    // Usar tu lógica existente pero limitando a maxToursToShow
    const limitedTourIds = tourIds.slice(0, this.maxToursToShow);

    // Reset tours array
    this.tours = [];

    // Use concatMap to load tours sequentially and display them as they arrive
    of(...limitedTourIds)
      .pipe(
        concatMap((id: string) => {
          // Combinar datos del TourNetService, CMSTourService y datos adicionales
          return forkJoin({
            tourData: this.tourNetService.getTourById(Number(id)),
            cmsData: this.cmsTourService.getAllTours({ tourId: Number(id) }),
            additionalData: this.getAdditionalTourData(Number(id)),
          }).pipe(
            catchError((error: Error) => {
              console.error(
                `❌ DEBUG: Error loading tour with ID ${id}:`,
                error
              );
              return of(null);
            }),
            map(
              (
                combinedData: {
                  tourData: TourNetTour;
                  cmsData: ICMSTourResponse[];
                  additionalData: {
                    departures: IDepartureResponse[];
                    tags: string[];
                    itineraryDays: IItineraryDayResponse[];
                  };
                } | null
              ): TourDataV2 | null => {
                if (!combinedData) return null;

                // Mapear datos combinados de TourNetService, CMSTourService y datos adicionales a TourDataV2
                const tour = combinedData.tourData;
                const cmsArray = combinedData.cmsData;
                const cms =
                  cmsArray && cmsArray.length > 0 ? cmsArray[0] : null;
                const additional = combinedData.additionalData;

                // ✅ OBTENER PRECIO: Usar minPrice del TourNetService
                let tourPrice = tour.minPrice || 0;

                // ✅ OBTENER FECHAS: Extraer fechas de los departures
                const availableMonths: string[] = [];
                const departureDates: string[] = [];
                let nextDepartureDate: string | undefined;

                if (additional.departures && additional.departures.length > 0) {
                  // Ordenar departures por fecha
                  const sortedDepartures = additional.departures
                    .filter((departure) => departure.departureDate)
                    .sort(
                      (a, b) =>
                        new Date(a.departureDate!).getTime() -
                        new Date(b.departureDate!).getTime()
                    );

                  sortedDepartures.forEach((departure: IDepartureResponse) => {
                    if (departure.departureDate) {
                      const date = new Date(departure.departureDate);
                      const month = date
                        .toLocaleDateString('es-ES', { month: 'short' })
                        .toUpperCase();
                      if (!availableMonths.includes(month)) {
                        availableMonths.push(month);
                      }
                      departureDates.push(departure.departureDate);
                    }
                  });

                  // Obtener la próxima fecha de departure
                  const today = new Date();
                  const futureDepartures = sortedDepartures.filter(
                    (departure) =>
                      departure.departureDate &&
                      new Date(departure.departureDate) >= today
                  );

                  if (futureDepartures.length > 0) {
                    nextDepartureDate = futureDepartures[0].departureDate!;
                  }
                }

                // ✅ OBTENER TAG: Usar el primer tag disponible
                const tourTag =
                  additional.tags && additional.tags.length > 0
                    ? additional.tags[0]
                    : '';

                // ✅ OBTENER DÍAS DE ITINERARIO: Contar los días disponibles
                const itineraryDaysCount = additional.itineraryDays
                  ? additional.itineraryDays.length
                  : 0;

                // ✅ CREAR TEXTO DE DÍAS: Formato "Colombia: en 10 días" (línea superior)
                // Extraer solo el nombre del país (antes de los dos puntos)
                const countryName = tour.name
                  ? tour.name.split(':')[0].trim()
                  : '';
                const itineraryDaysText =
                  itineraryDaysCount > 0 && countryName
                    ? `${countryName}: en ${itineraryDaysCount} días`
                    : '';

                // ✅ APLICAR IMAGEN COMO EN TOUR-OVERVIEW-V2
                const imageUrl = cms?.imageUrl || '';

                return {
                  id: tour.id,
                  imageUrl: imageUrl,
                  title: tour.name || '',
                  description: '',
                  rating: 5,
                  tag: tourTag,
                  price: tourPrice,
                  availableMonths: availableMonths,
                  departureDates: departureDates,
                  nextDepartureDate: nextDepartureDate,
                  itineraryDaysCount: itineraryDaysCount,
                  itineraryDaysText: itineraryDaysText,
                  isByDr: true, // Valor por defecto
                  webSlug:
                    tour.slug ||
                    tour.name?.toLowerCase().replace(/\s+/g, '-') ||
                    '',
                  tripType: [], // TourNetService no tiene tripType
                  externalID: tour.tkId || '',
                  // ✅ NUEVOS CAMPOS: Para analytics
                  continent: '', // TourNetService no tiene continent - pendiente de agregar
                  country: '', // TourNetService no tiene country - pendiente de agregar
                };
              }
            )
          );
        }),
        // Accumulate tours as they arrive
        scan((acc: TourDataV2[], tour: TourDataV2 | null) => {
          if (tour) {
            return [...acc, tour];
          }
          return acc;
        }, [] as TourDataV2[]),
        takeUntil(this.destroy$)
      )
      .subscribe((accumulatedTours: TourDataV2[]) => {
        this.tours = accumulatedTours;
      });
  }

  onViewMore(): void {
    if (this.viewMoreButton?.url) {
      this.router.navigate([this.viewMoreButton.url]);
    }
  }
}
