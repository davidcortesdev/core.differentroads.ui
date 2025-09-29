import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToursService } from '../../../../core/services/tours.service';
import {
  TourNetService,
  Tour as TourNetTour,
} from '../../../../core/services/tour/tourNet.service';
import {
  CMSTourService,
  ICMSTourResponse,
} from '../../../../core/services/cms/cms-tour.service';
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
import { TourDataV2 } from '../../../../shared/components/tour-card-v2/tour-card-v2.model';

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

// ✅ NUEVOS SERVICIOS: Para precios, fechas y tags
import {
  TourDeparturesPricesService,
  ITourDeparturesPriceResponse,
} from '../../../../core/services/tour/tour-departures-prices.service';
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
import {
  TourBasePriceService,
  TourBasePrice,
} from '../../../../core/services/tour/tour-base-price.service';

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
  layout: string = 'grid';
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
    private readonly tourNetService: TourNetService,
    private readonly cmsTourService: CMSTourService,
    private readonly homeSectionConfigurationService: HomeSectionConfigurationService,
    private readonly homeSectionTourFilterService: HomeSectionTourFilterService,
    private readonly tourTagService: TourTagService,
    private readonly tourLocationService: TourLocationService,
    // ✅ NUEVOS SERVICIOS: Para precios, fechas y tags
    private readonly tourDeparturesPricesService: TourDeparturesPricesService,
    private readonly departureService: DepartureService,
    private readonly itineraryService: ItineraryService,
    private readonly itineraryDayService: ItineraryDayService,
    private readonly tourBasePriceService: TourBasePriceService
  ) {}

  ngOnInit(): void {
    this.loadTourList();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadTourList(): void {
    console.log('🔍 TourListV2 - loadTourList iniciado');
    console.log('🔍 configurationId:', this.configurationId);
    console.log('🔍 sectionDisplayOrder:', this.sectionDisplayOrder);

    // Si se proporciona un configurationId específico, úsalo
    if (this.configurationId) {
      console.log(
        '✅ Usando configurationId específico:',
        this.configurationId
      );
      this.loadSpecificConfiguration(this.configurationId);
      return;
    }

    // Determinar el tipo de sección a cargar
    const sectionType = this.sectionType || 3; // Por defecto TOUR_GRID (ID: 3)
    console.log('🔍 Buscando configuraciones para sectionType:', sectionType);

    // Cargar configuraciones según el tipo de sección
    let configObservable;
    if (sectionType === 3) {
      console.log('📋 Cargando TOUR_GRID (ID: 3)...');
      configObservable =
        this.homeSectionConfigurationService.getTourGridConfigurations();
    } else {
      console.log('📋 Cargando sección ID:', sectionType);
      configObservable = this.homeSectionConfigurationService.getBySectionType(
        sectionType,
        true
      );
    }

    configObservable.pipe(takeUntil(this.destroy$)).subscribe({
      next: (configurations) => {
        console.log(
          '📋 Configuraciones encontradas para sectionType',
          sectionType,
          ':',
          configurations
        );
        console.log('📊 Total de configuraciones:', configurations.length);

        if (configurations.length > 0) {
          // Si se especifica un orden de visualización, buscar esa configuración
          let targetConfig = configurations[0];
          console.log('🎯 Configuración inicial seleccionada:', targetConfig);

          if (this.sectionDisplayOrder !== undefined) {
            console.log(
              '🔍 Buscando configuración con displayOrder:',
              this.sectionDisplayOrder
            );
            const foundConfig = configurations.find(
              (c) => c.displayOrder === this.sectionDisplayOrder
            );
            if (foundConfig) {
              targetConfig = foundConfig;
              console.log(
                '✅ Configuración encontrada por displayOrder:',
                targetConfig
              );
            } else {
              console.warn(
                '⚠️ No se encontró configuración con displayOrder:',
                this.sectionDisplayOrder
              );
            }
          }

          console.log(
            '🚀 Cargando configuración específica con ID:',
            targetConfig.id
          );
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
    console.log(
      '🔧 TourListV2 - loadSpecificConfiguration iniciado con ID:',
      configId
    );

    // Cargar la configuración específica
    this.homeSectionConfigurationService
      .getById(configId)
      .pipe(
        switchMap((configuration) => {
          console.log('📋 Configuración cargada:', configuration);

          // Establecer datos de la configuración
          this.title = configuration.title || '';
          this.description = configuration.content || '';
          this.showMonthTags = configuration.showMonthTags || false;
          this.maxToursToShow = configuration.maxToursToShow || 6;

          console.log('⚙️ Datos de configuración establecidos:');
          console.log('  - title:', this.title);
          console.log('  - description:', this.description);
          console.log('  - showMonthTags:', this.showMonthTags);
          console.log('  - maxToursToShow:', this.maxToursToShow);

          console.log(
            '🔍 Cargando filtros de tours para configuración ID:',
            configId
          );

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
          console.log('🎯 Filtros cargados:', filters);
          console.log('📊 Total de filtros:', filters.length);

          if (filters.length > 0) {
            console.log('✅ Procesando filtros...');
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
    console.log('🎪 TourListV2 - loadToursFromFilters iniciado');
    console.log('📋 Filtros recibidos:', filters);

    if (filters.length === 0) {
      console.warn('⚠️ No hay filtros para procesar');
      this.tours = [];
      return;
    }

    // Configurar el botón "Ver más" del primer filtro
    const primaryFilter = filters[0];
    console.log('🔘 Filtro primario:', primaryFilter);

    if (primaryFilter.viewMoreButtonText && primaryFilter.viewMoreButtonUrl) {
      this.viewMoreButton = {
        text: primaryFilter.viewMoreButtonText,
        url: primaryFilter.viewMoreButtonUrl,
      };
      console.log('🔗 Botón "Ver más" configurado:', this.viewMoreButton);
    } else {
      console.log('ℹ️ No se configuró botón "Ver más"');
    }

    console.log('🚀 Iniciando procesamiento de todos los filtros...');

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
    console.log(
      '🔍 DEBUG: Procesando',
      filters.length,
      'filtros:',
      filters.map((f) => ({
        type: f.filterType,
        tagId: f.tagId,
        locationId: f.locationId,
        specificTourIds: f.specificTourIds,
      }))
    );

    // Crear observables para cada filtro
    const filterObservables = filters.map((filter, index) =>
      this.getTourIdsFromFilter(filter).pipe(
        map((tourIds) => {
          console.log(
            `📋 DEBUG: Filtro ${index + 1} (${filter.filterType}):`,
            tourIds.length,
            'tours encontrados:',
            tourIds
          );
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

          console.log(
            '🔄 DEBUG: IDs combinados antes de eliminar duplicados:',
            allTourIds.length,
            'tours'
          );
          console.log(
            '✨ DEBUG: IDs únicos después de eliminar duplicados:',
            uniqueTourIds.length,
            'tours'
          );
          console.log('📊 DEBUG: IDs únicos:', uniqueTourIds);

          // NO limitar por ahora - mostrar todos los tours
          console.log(
            '🎯 DEBUG: Mostrando TODOS los tours sin limitación:',
            uniqueTourIds.length,
            'tours finales'
          );
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
        const tourIdsAsStrings = tourIds.map((id) => id.toString());
        console.log(
          '🔗 DEBUG: Llamando loadToursFromIds con:',
          tourIdsAsStrings
        );
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
    console.log(`🔎 DEBUG: Procesando filtro tipo '${filter.filterType}'`);

    switch (filter.filterType) {
      case 'tag':
        console.log(`🏷️ DEBUG: Buscando tours por tag ID: ${filter.tagId}`);
        return this.tourTagService.getToursByTags([filter.tagId!]).pipe(
          map((tourIds) => {
            console.log(
              `✅ DEBUG: Tag ${filter.tagId} devolvió ${tourIds.length} tours:`,
              tourIds
            );
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
        console.log(
          `📍 DEBUG: Buscando tours por location ID: ${filter.locationId}`
        );
        return this.tourLocationService
          .getToursByLocations([filter.locationId!])
          .pipe(
            map((tourIds) => {
              console.log(
                `✅ DEBUG: Location ${filter.locationId} devolvió ${tourIds.length} tours:`,
                tourIds
              );
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
        console.log(
          `🎯 DEBUG: Procesando tours específicos: ${filter.specificTourIds}`
        );
        try {
          const tourIds =
            this.homeSectionTourFilterService.parseSpecificTourIds(
              filter.specificTourIds!
            );
          console.log(
            `✅ DEBUG: Tours específicos parseados: ${tourIds.length} tours:`,
            tourIds
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

  // ✅ MÉTODO AUXILIAR: Obtener precios base usando TourBasePriceService
  private getBasePricesForTour(tourId: number): Observable<TourBasePrice[]> {
    console.log(`💰 DEBUG: Obteniendo precios base para tour ${tourId}`);

    return this.tourBasePriceService.getByTourId(tourId).pipe(
      map((prices: TourBasePrice[]) => {
        console.log(
          `💰 DEBUG: Precios base encontrados para tour ${tourId}:`,
          prices.length,
          'precios:',
          prices.map((p) => ({
            id: p.id,
            ageGroupId: p.ageGroupId,
            basePrice: p.basePrice,
            campaignPrice: p.campaignPrice,
          }))
        );
        return prices;
      }),
      catchError((error) => {
        console.error(
          `❌ Error obteniendo precios base para tour ${tourId}:`,
          error
        );
        return of([]);
      })
    );
  }

  // ✅ MÉTODO AUXILIAR: Obtener datos adicionales (precios base, fechas, tags, días)
  private getAdditionalTourData(tourId: number): Observable<{
    basePrices: TourBasePrice[];
    departures: IDepartureResponse[];
    tags: string[];
    itineraryDays: IItineraryDayResponse[];
  }> {
    console.log(`🔍 DEBUG: Obteniendo datos adicionales para tour ${tourId}`);

    // ✅ USAR LOS MISMOS FILTROS QUE TOUR-DEPARTURES-V2
    const itineraryFilters: ItineraryFilters = {
      tourId: tourId,
      isVisibleOnWeb: true, // ✅ FILTRO ADICIONAL
      isBookable: true, // ✅ FILTRO ADICIONAL
    };

    console.log(
      `🔍 DEBUG: Filtros de itinerarios para tour ${tourId}:`,
      itineraryFilters
    );

    // Obtener itinerarios del tour para luego obtener departures
    return this.itineraryService.getAll(itineraryFilters, false).pipe(
      switchMap((itineraries: IItineraryResponse[]) => {
        console.log(
          `📅 DEBUG: Tour ${tourId} tiene ${itineraries.length} itinerarios`
        );

        if (itineraries.length === 0) {
          return of({
            basePrices: [],
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
            console.log(
              `✈️ DEBUG: Tour ${tourId} tiene ${allDepartures.length} departures`
            );

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

            // ✅ OBTENER PRECIOS BASE: Usar TourBasePriceService para obtener precios base
            const basePriceRequest = this.getBasePricesForTour(tourId).pipe(
              catchError((error) => {
                console.error(
                  `❌ Error obteniendo precios base para tour ${tourId}:`,
                  error
                );
                return of([]);
              })
            );

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

            return forkJoin([
              basePriceRequest,
              tagRequest,
              itineraryDaysRequest,
            ]).pipe(
              map(([basePrices, tags, itineraryDays]) => {
                const result = {
                  basePrices: basePrices as TourBasePrice[],
                  departures: allDepartures,
                  tags: tags as string[],
                  itineraryDays: itineraryDays as IItineraryDayResponse[],
                };
                console.log(
                  `🔍 DEBUG: Datos adicionales obtenidos para tour ${tourId}:`,
                  {
                    basePrices: result.basePrices.length,
                    departures: result.departures.length,
                    tags: result.tags.length,
                    itineraryDays: result.itineraryDays.length,
                    primerDeparture: result.departures[0]?.departureDate,
                    primerPrecioBase: result.basePrices[0]?.basePrice,
                    totalDias: result.itineraryDays.length,
                    todosLosPreciosBase: result.basePrices.map((p) => ({
                      id: p.id,
                      ageGroupId: p.ageGroupId,
                      basePrice: p.basePrice,
                      campaignPrice: p.campaignPrice,
                    })),
                  }
                );

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
          basePrices: [],
          departures: [],
          tags: [],
          itineraryDays: [],
        });
      })
    );
  }

  private loadToursFromIds(tourIds: string[]): void {
    console.log('🚀 DEBUG: loadToursFromIds llamado con IDs:', tourIds);

    // Usar tu lógica existente pero limitando a maxToursToShow
    const limitedTourIds = tourIds.slice(0, this.maxToursToShow);
    console.log(
      '📊 DEBUG: IDs limitados a mostrar:',
      limitedTourIds,
      'maxToursToShow:',
      this.maxToursToShow
    );

    // Reset tours array
    this.tours = [];

    // Use concatMap to load tours sequentially and display them as they arrive
    of(...limitedTourIds)
      .pipe(
        concatMap((id: string) => {
          console.log(`🔄 DEBUG: Procesando tour ID: ${id}`);

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
                    basePrices: TourBasePrice[];
                    departures: IDepartureResponse[];
                    tags: string[];
                    itineraryDays: IItineraryDayResponse[];
                  };
                } | null
              ): TourDataV2 | null => {
                console.log(
                  `📋 DEBUG: Tour ${id} recibido:`,
                  combinedData ? '✅ Datos recibidos' : '❌ Sin datos'
                );
                if (!combinedData) return null;

                // Mapear datos combinados de TourNetService, CMSTourService y datos adicionales a TourDataV2
                const tour = combinedData.tourData;
                const cmsArray = combinedData.cmsData;
                const cms =
                  cmsArray && cmsArray.length > 0 ? cmsArray[0] : null;
                const additional = combinedData.additionalData;

                // ✅ OBTENER PRECIO: Usar TourBasePriceService para obtener precios base
                let tourPrice = 0;
                console.log(`💰 ===== CÁLCULO DE PRECIO PARA TOUR ${id} =====`);
                console.log(
                  `💰 Precios base disponibles:`,
                  additional.basePrices?.length || 0
                );

                if (additional.basePrices && additional.basePrices.length > 0) {
                  // Buscar precio para adultos (ageGroupId = 1 por defecto, o el primer precio disponible)
                  const adultPrice =
                    additional.basePrices.find(
                      (price: TourBasePrice) => price.ageGroupId === 1
                    ) || additional.basePrices[0]; // Fallback al primer precio

                  if (adultPrice) {
                    // Usar campaignPrice si está disponible, sino basePrice
                    tourPrice =
                      adultPrice.campaignPrice > 0
                        ? adultPrice.campaignPrice
                        : adultPrice.basePrice;
                    console.log(
                      `💰 ✅ Precio encontrado para tour ${id}: ${tourPrice}€ (ageGroupId: ${adultPrice.ageGroupId}, basePrice: ${adultPrice.basePrice}, campaignPrice: ${adultPrice.campaignPrice})`
                    );
                  } else {
                    console.log(
                      `⚠️ DEBUG: No se encontró precio para adultos en el tour ${id}`
                    );
                  }
                } else {
                  console.log(
                    `⚠️ DEBUG: No hay precios base disponibles para el tour ${id}`
                  );
                }
                console.log(
                  `💰 ===== FIN CÁLCULO DE PRECIO PARA TOUR ${id} =====`
                );

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

                  console.log(
                    `📅 DEBUG: Tour ${id} - Meses: ${availableMonths.join(
                      ', '
                    )}, Próxima salida: ${nextDepartureDate}`
                  );
                } else {
                  console.log(
                    `⚠️ DEBUG: No hay departures con fechas para el tour ${id}`
                  );
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
                console.log(`🖼️ DEBUG: Imagen para tour ${id}:`, {
                  cmsArrayLength: cmsArray.length,
                  selectedCms: cms
                    ? {
                        id: cms.id,
                        tourId: cms.tourId,
                        imageUrl: cms.imageUrl,
                      }
                    : null,
                  finalImageUrl: imageUrl,
                  hasImage: !!imageUrl,
                });

                return {
                  imageUrl: imageUrl, // ✅ IMAGEN CORRECTA DEL CMS
                  title: tour.name || '', // ✅ TÍTULO ORIGINAL
                  description: '', // ✅ DESCRIPCIÓN REMOVIDA
                  rating: 5, // Valor por defecto
                  tag: tourTag, // ✅ TAG REAL
                  price: tourPrice, // ✅ PRECIO REAL
                  availableMonths: availableMonths, // ✅ MESES REALES
                  departureDates: departureDates, // ✅ FECHAS DE DEPARTURE
                  nextDepartureDate: nextDepartureDate, // ✅ PRÓXIMA FECHA DE SALIDA
                  itineraryDaysCount: itineraryDaysCount, // ✅ CANTIDAD DE DÍAS
                  itineraryDaysText: itineraryDaysText, // ✅ TEXTO DE DÍAS FORMATEADO
                  isByDr: true, // Valor por defecto
                  webSlug:
                    tour.slug ||
                    tour.name?.toLowerCase().replace(/\s+/g, '-') ||
                    '',
                  tripType: [], // TourNetService no tiene tripType
                  externalID: tour.tkId || '',
                };
              }
            )
          );
        }),
        // Accumulate tours as they arrive
        scan((acc: TourDataV2[], tour: TourDataV2 | null) => {
          console.log(
            `📈 DEBUG: Scan - Tour procesado:`,
            tour ? '✅ Agregado' : '❌ Null',
            'Total acumulado:',
            acc.length + (tour ? 1 : 0)
          );
          if (tour) {
            return [...acc, tour];
          }
          return acc;
        }, [] as TourDataV2[]),
        takeUntil(this.destroy$)
      )
      .subscribe((accumulatedTours: TourDataV2[]) => {
        console.log(
          '🎯 DEBUG: Subscribe - Tours acumulados:',
          accumulatedTours.length,
          'tours'
        );
        console.log('📋 DEBUG: Tours finales:', accumulatedTours);
        this.tours = accumulatedTours;
      });
  }

  onViewMore(): void {
    if (this.viewMoreButton?.url) {
      this.router.navigate([this.viewMoreButton.url]);
    }
  }
}
