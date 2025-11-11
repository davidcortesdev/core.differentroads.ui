import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  TourService,
  Tour as TourNetTour,
} from '../../../../core/services/tour/tour.service';
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

import { CAROUSEL_CONFIG } from '../../../../shared/constants/carousel.constants';
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
import { TagService } from '../../../../core/services/tag/tag.service';
import { TourLocationService } from '../../../../core/services/tour/tour-location.service';
import { LocationNetService, Location } from '../../../../core/services/locations/locationNet.service';
import { ITripTypeResponse, TripTypeService } from '../../../../core/services/trip-type/trip-type.service';

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
import { ReviewsService } from '../../../../core/services/reviews/reviews.service';

@Component({
  selector: 'app-tour-carrussel-v2',
  standalone: false,
  templateUrl: './tour-carrussel-v2.component.html',
  styleUrls: ['./tour-carrussel-v2.component.scss'],
})
export class TourCarrusselV2Component implements OnInit, OnDestroy {
  @Input() configurationId?: number; // ID de la configuración específica (opcional)
  @Input() sectionDisplayOrder?: number; // Orden de visualización de la sección (opcional)

  tours: TourDataV2[] = [];
  title: string = '';
  description: string = '';
  showMonthTags: boolean = false;
  maxToursToShow: number = 6;
  viewMoreButton?: {
    text: string;
    url: string;
  };

  private tripTypesMap: Map<number, ITripTypeResponse> = new Map();

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
    private readonly tourService: TourService,
    private readonly cmsTourService: CMSTourService,
    private readonly homeSectionConfigurationService: HomeSectionConfigurationService,
    private readonly homeSectionTourFilterService: HomeSectionTourFilterService,
    private readonly tourTagService: TourTagService,
    private readonly tagService: TagService,
    private readonly tourLocationService: TourLocationService,
    private readonly locationService: LocationNetService,
    // ✅ NUEVOS SERVICIOS: Para precios, fechas y tags
    private readonly departureService: DepartureService,
    private readonly itineraryService: ItineraryService,
    private readonly itineraryDayService: ItineraryDayService,
    private readonly reviewsService: ReviewsService,
    private readonly tripTypeService: TripTypeService
  ) { }

  ngOnInit(): void {
    this.loadTripTypes().pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.loadTourCarousel();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadTripTypes(): Observable<void> {
    return this.tripTypeService.getActiveTripTypes().pipe(
      map((tripTypes: ITripTypeResponse[]) => {
        this.tripTypesMap.clear();
        tripTypes.forEach(tripType => {
          // Crear abreviación (primera letra del nombre)
          const abbreviation = tripType.name.charAt(0).toUpperCase();

          this.tripTypesMap.set(tripType.id, {
            ...tripType,
            abbreviation: abbreviation
          });
        });
      }),
      catchError((error) => {
        console.error('❌ Error loading trip types:', error);
        return of(undefined);
      })
    );
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
          // Error loading tour carousel configurations
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
          console.error(
            '❌ [Tour Carrussel V2] Error loading configuration or filters:',
            error
          );
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

          // NO limitar por ahora - mostrar todos los tours

          return uniqueTourIds;
        }),
        catchError((error) => {
          // Error loading tours from filters
          return of([]);
        })
      )
      .subscribe((tourIds: number[]) => {
        if (tourIds.length === 0) {
          this.tours = [];
          this.debugTourIds = [];
          return;
        }

        // Guardar IDs para mostrar en pantalla
        this.debugTourIds = tourIds;

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
              '❌ [Tour Carrussel V2] Error loading tours by tag:',
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
                '❌ [Tour Carrussel V2] Error loading tours by location:',
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
          console.error(
            '❌ [Tour Carrussel V2] Error parsing specific tour IDs:',
            error
          );
          return of([]);
        }

      default:
        // Unknown filter type
        return of([]);
    }
  }

  // ✅ MÉTODO AUXILIAR: Obtener datos adicionales (fechas, tags, días)
  // NOTA: Este método está duplicado de home-v2.component.ts
  // TODO: Extraer a un servicio compartido para evitar duplicación
  private getAdditionalTourData(tourId: number): Observable<{
    departures: IDepartureResponse[];
    tags: string[];
    itineraryDays: IItineraryDayResponse[];
    continent?: string;
    country?: string;
  }> {
    const itineraryFilters: ItineraryFilters = {
      tourId: tourId,
      isVisibleOnWeb: true,
      isBookable: true,
    };

    return this.itineraryService.getAll(itineraryFilters, false).pipe(
      switchMap((itineraries: IItineraryResponse[]) => {
        if (itineraries.length === 0) {
          return of({
            departures: [],
            tags: [],
            itineraryDays: [],
            continent: '',
            country: '',
          });
        }

        const departureRequests = itineraries.map((itinerary) =>
          this.departureService.getByItinerary(itinerary.id, false).pipe(
            catchError(() => of([]))
          )
        );

        return forkJoin(departureRequests).pipe(
          switchMap((departureArrays: IDepartureResponse[][]) => {
            const allDepartures = departureArrays.flat();

            const itineraryDaysRequest =
              itineraries.length > 0
                ? this.itineraryDayService
                  .getAll({ itineraryId: itineraries[0].id })
                  .pipe(catchError(() => of([])))
                : of([]);

            const tagRequest = this.tourTagService
              .getByTourAndType(tourId, 'VISIBLE')
              .pipe(
                switchMap((tourTags) => {
                  if (tourTags.length > 0 && tourTags[0]?.tagId && tourTags[0].tagId > 0) {
                    const firstTagId = tourTags[0].tagId;
                    return this.tagService.getById(firstTagId).pipe(
                      map((tag) => tag?.name && tag.name.trim().length > 0 ? [tag.name.trim()] : []),
                      catchError(() => of([]))
                    );
                  }
                  return of([]);
                }),
                catchError(() => of([]))
              );

            const countryLocationRequest = this.tourLocationService
              .getByTourAndType(tourId, 'COUNTRY')
              .pipe(
                map((response) => Array.isArray(response) ? response : response ? [response] : []),
                catchError(() => of([]))
              );

            const continentLocationRequest = this.tourLocationService
              .getByTourAndType(tourId, 'CONTINENT')
              .pipe(
                map((response) => Array.isArray(response) ? response : response ? [response] : []),
                catchError(() => of([]))
              );

            return forkJoin([tagRequest, itineraryDaysRequest, countryLocationRequest, continentLocationRequest]).pipe(
              switchMap(([tags, itineraryDays, countryLocations, continentLocations]) => {
                const validCountryLocations = countryLocations.filter(
                  (loc: any) => loc && loc.id && loc.locationId
                );
                const validContinentLocations = continentLocations.filter(
                  (loc: any) => loc && loc.id && loc.locationId
                );

                const allLocationIds = [
                  ...validCountryLocations.map((tl: any) => tl.locationId),
                  ...validContinentLocations.map((tl: any) => tl.locationId),
                ];
                const uniqueLocationIds = [...new Set(allLocationIds)];

                if (uniqueLocationIds.length === 0) {
                  return of({
                    departures: allDepartures,
                    tags: tags as string[],
                    itineraryDays: itineraryDays as IItineraryDayResponse[],
                    continent: '',
                    country: '',
                  });
                }

                return this.locationService.getLocationsByIds(uniqueLocationIds).pipe(
                  map((locations: Location[]) => {
                    const locationsMap = new Map<number, Location>();
                    locations.forEach((location) => {
                      locationsMap.set(location.id, location);
                    });

                    const countries = validCountryLocations
                      .sort((a: any, b: any) => a.displayOrder - b.displayOrder)
                      .map((tl: any) => locationsMap.get(tl.locationId)?.name)
                      .filter((name) => name) as string[];

                    const continents = validContinentLocations
                      .sort((a: any, b: any) => a.displayOrder - b.displayOrder)
                      .map((tl: any) => locationsMap.get(tl.locationId)?.name)
                      .filter((name) => name) as string[];

                    return {
                      departures: allDepartures,
                      tags: tags as string[],
                      itineraryDays: itineraryDays as IItineraryDayResponse[],
                      continent: continents.join(', ') || '',
                      country: countries.join(', ') || '',
                    };
                  }),
                  catchError(() => {
                    return of({
                      departures: allDepartures,
                      tags: tags as string[],
                      itineraryDays: itineraryDays as IItineraryDayResponse[],
                      continent: '',
                      country: '',
                    });
                  })
                );
              })
            );
          })
        );
      }),
      catchError(() => {
        return of({
          departures: [],
          tags: [],
          itineraryDays: [],
          continent: '',
          country: '',
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
            tourData: this.tourService.getTourById(Number(id)),
            cmsData: this.cmsTourService.getAllTours({ tourId: Number(id) }),
            additionalData: this.getAdditionalTourData(Number(id)),
            rating: this.reviewsService.getAverageRating({ tourId: Number(id) }).pipe(
              map((ratingResponse) => {
                // Si hay rating, devolverlo tal cual (sin redondeos)
                // Si no hay rating o es 0, devolver null para que formatRating devuelva ''
                const avgRating = ratingResponse?.averageRating;
                return avgRating && avgRating > 0 ? avgRating : null;
              }),
              catchError(() => of(null))
            ),
          }).pipe(
            catchError((error: Error) => {
              // Error loading tour
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
                  rating: number | null;
                } | null
              ): TourDataV2 | null => {
                if (combinedData) {
                }
                if (!combinedData) return null;

                // Mapear datos combinados de TourNetService, CMSTourService y datos adicionales a TourDataV2
                const tour = combinedData.tourData;
                const cmsArray = combinedData.cmsData;
                const cms =
                  cmsArray && cmsArray.length > 0 ? cmsArray[0] : null;
                const additional = combinedData.additionalData as {
                  departures: IDepartureResponse[];
                  tags: string[];
                  itineraryDays: IItineraryDayResponse[];
                  continent?: string;
                  country?: string;
                };

                // ✅ OBTENER PRECIO: Usar minPrice del TourNetService
                let tourPrice = tour.minPrice || 0;

                // ✅ OBTENER FECHAS: Extraer fechas de los departures
                // ✅ OBTENER FECHAS: Extraer fechas de los departures
                const availableMonths: string[] = [];
                const departureDates: string[] = [];
                const tripTypes: { name: string; code: string; color: string; abbreviation: string }[] = [];
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

                      // ✅ NUEVO: Agregar tripTypeId al array (sin duplicados)
                      if (departure.tripTypeId) {
                        const tripTypeInfo = this.tripTypesMap.get(departure.tripTypeId);
                        if (tripTypeInfo && !tripTypes.some(t => t.code === tripTypeInfo.code)) {
                          tripTypes.push({
                            name: tripTypeInfo.name,
                            code: tripTypeInfo.code,
                            color: tripTypeInfo.color,
                            abbreviation: tripTypeInfo.abbreviation
                          });
                        }
                      }


                    }
                  });
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

                // Usar el rating tal cual, sin redondeos
                // Si es null, usar undefined para que formatRating devuelva ''
                const ratingValue = combinedData.rating !== null ? combinedData.rating : undefined;

                return {
                  id: tour.id,
                  imageUrl: imageUrl,
                  title: tour.name || '',
                  description: '',
                  rating: ratingValue,
                  tag: tourTag,
                  price: tourPrice,
                  availableMonths: availableMonths,
                  nextDepartureDate: nextDepartureDate,
                  itineraryDaysCount: itineraryDaysCount,
                  itineraryDaysText: itineraryDaysText,
                  isByDr: tour.productStyleId === 1, // ✅ isByDr es true cuando productStyleId es 1 (GROUP)
                  webSlug:
                    tour.slug ||
                    tour.name?.toLowerCase().replace(/\s+/g, '-') ||
                    '',
                  tripType: [], // TourNetService no tiene tripType
                  externalID: tour.tkId || '',
                  continent: additional.continent || '',
                  country: additional.country || '',
                  productStyleId: tour.productStyleId, // ✅ Agregar productStyleId al objeto
                  tripTypes: tripTypes,
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
