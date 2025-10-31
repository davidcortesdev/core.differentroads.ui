import { Component, Input, OnDestroy, OnInit, OnChanges, SimpleChanges, EventEmitter, Output } from '@angular/core';
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
import { TourDataV2 } from '../../../../shared/components/tour-card-v2/tour-card-v2.model';
import { AnalyticsService, EcommerceItem } from '../../../../core/services/analytics/analytics.service';

// Servicios para filtros por tag y ubicación
import { TourTagService } from '../../../../core/services/tag/tour-tag.service';
import { TourLocationService, ITourLocationResponse } from '../../../../core/services/tour/tour-location.service';
import { LocationNetService, Location } from '../../../../core/services/locations/locationNet.service';

// Servicios para fechas y tags
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

// Importar traducciones de PrimeNG directamente
import { es } from 'primelocale/es.json';

export interface FilterChangeEvent {
  orderOption?: string;
  priceOption?: string[];
  seasonOption?: string[];
  monthOption?: string[];
}

@Component({
  selector: 'app-tour-grid-v2',
  standalone: false,
  templateUrl: './tour-grid-v2.component.html',
  styleUrls: ['./tour-grid-v2.component.scss'],
})
export class TourGridV2Component implements OnInit, OnDestroy, OnChanges {
  /**
   * Lista de IDs de tours a mostrar en el grid
   */
  @Input() tourIds: number[] = [];

  /**
   * ID para Google Analytics (item_list_id)
   */
  @Input() itemListId: string = 'tour_grid';

  /**
   * Nombre para Google Analytics (item_list_name)
   */
  @Input() itemListName: string = 'Grid de tours';

  /**
   * Mostrar precios de Scalapay en las tarjetas
   */
  @Input() showScalapayPrice: boolean = false;

  /**
   * Número máximo de tours a mostrar
   */
  @Input() maxToursToShow?: number;

  /**
   * Mostrar o ocultar la sección de filtros
   */
  @Input() showFilters: boolean = false;

  /**
   * Output para notificar cambios en filtros (opcional, para compatibilidad)
   */
  @Output() filterChange = new EventEmitter<FilterChangeEvent>();

  tours: TourDataV2[] = []; // Tours filtrados y ordenados que se muestran
  allTours: TourDataV2[] = []; // Todos los tours sin filtrar
  isLoading: boolean = false;
  
  // Opciones de filtros
  orderOptions = [
    { name: 'Próximas salidas', value: 'next-departures' },
    { name: 'Precio (de menor a mayor)', value: 'min-price' },
    { name: 'Precio (de mayor a menor)', value: 'max-price' },
  ];
  selectedOrderOption: string = 'next-departures';

  priceOptions: { name: string; value: string }[] = [
    { name: 'Hasta 1000€', value: '0-1000' },
    { name: '1000 - 3000€', value: '1000-3000' },
    { name: 'Desde 3000€', value: '3000+' },
  ];
  selectedPriceOption: string[] = [];

  seasonOptions: { name: string; value: string }[] = [
    { name: 'Verano', value: 'Verano' },
    { name: 'Invierno', value: 'invierno' },
    { name: 'Primavera', value: 'Primavera' },
    { name: 'Otoño', value: 'otono' },
  ];
  selectedSeasonOption: string[] = [];

  monthOptions: { name: string; value: string }[] = [];
  selectedMonthOption: string[] = [];
  
  private destroy$ = new Subject<void>();
  
  // ✅ DEBUG: Flag para controlar logs de debug (cambiar a false en producción)
  private readonly DEBUG_MODE = false;
  // Control de disparo del evento durante la carga inicial
  private hasFiredInitialViewItemList: boolean = false;
  private isInitialLoadingView: boolean = false;

  constructor(
    private readonly tourService: TourService,
    private readonly cmsTourService: CMSTourService,
    private readonly tourTagService: TourTagService,
    private readonly departureService: DepartureService,
    private readonly itineraryService: ItineraryService,
    private readonly itineraryDayService: ItineraryDayService,
    private readonly analyticsService: AnalyticsService,
    private readonly tourLocationService: TourLocationService,
    private readonly locationService: LocationNetService
  ) {}

  ngOnInit(): void {
    this.initializeMonthOptions();
    this.loadTours();
  }

  /**
   * Inicializa las opciones de meses usando las traducciones de PrimeNG
   */
  private initializeMonthOptions(): void {
    const monthNames = es.monthNames;
    const monthNamesShort = es.monthNamesShort;
    
    this.monthOptions = monthNames.map((name: string, index: number) => ({
      name: name,
      value: monthNamesShort[index].toUpperCase()
    }));
  }

  /**
   * Obtiene el mes corto desde las traducciones de PrimeNG
   */
  private getMonthShort(monthIndex: number): string {
    const monthNamesShort = es.monthNamesShort;
    return monthNamesShort[monthIndex]?.toUpperCase() || '';
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Si cambian los IDs de tours, recargar
    if (changes['tourIds'] && !changes['tourIds'].firstChange) {
      // Reiniciar control de evento para nueva carga
      this.hasFiredInitialViewItemList = false;
      this.isInitialLoadingView = true;
      this.loadTours();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Métodos para manejar cambios en filtros
   */
  onOrderChange(): void {
    this.applyFiltersAndSort();
  }

  onPriceFilterChange(): void {
    this.applyFiltersAndSort();
  }

  onSeasonFilterChange(): void {
    this.applyFiltersAndSort();
  }

  onMonthFilterChange(): void {
    this.applyFiltersAndSort();
  }

  /**
   * Aplica todos los filtros y ordenamiento a la lista de tours
   * @param shouldTrackEvent Si es true, dispara el evento view_item_list (por defecto true para cambios de filtros)
   */
  private applyFiltersAndSort(shouldTrackEvent: boolean = true): void {
    // Comenzar con todos los tours
    let filteredTours = [...this.allTours];

    // Aplicar filtro de precio
    if (this.selectedPriceOption && this.selectedPriceOption.length > 0) {
      filteredTours = this.filterByPrice(filteredTours);
    }

    // Aplicar filtro de temporada
    if (this.selectedSeasonOption && this.selectedSeasonOption.length > 0) {
      filteredTours = this.filterBySeason(filteredTours);
    }

    // Aplicar filtro de mes
    if (this.selectedMonthOption && this.selectedMonthOption.length > 0) {
      filteredTours = this.filterByMonth(filteredTours);
    }

    // Aplicar ordenamiento
    filteredTours = this.sortTours(filteredTours);

    // Actualizar la lista de tours mostrados
    this.tours = filteredTours;

    // Disparar evento view_item_list solo si se solicita
    // - Durante carga inicial: NO se dispara aquí, se dispara en complete()
    // - Después de carga inicial (filtros/orden): se dispara en cada cambio
    if (shouldTrackEvent && !this.isInitialLoadingView && this.tours.length > 0) {
      this.trackViewItemList(this.tours);
    }

    // Emitir evento de cambio (para compatibilidad con componentes existentes)
    this.filterChange.emit({
      orderOption: this.selectedOrderOption,
      priceOption: this.selectedPriceOption,
      seasonOption: this.selectedSeasonOption,
      monthOption: this.selectedMonthOption,
    });
  }

  /**
   * Filtra tours por rango de precio
   */
  private filterByPrice(tours: TourDataV2[]): TourDataV2[] {
    return tours.filter(tour => {
      return this.selectedPriceOption.some(priceRange => {
        const price = tour.price || 0;
        
        if (priceRange === '0-1000') {
          return price < 1000;
        } else if (priceRange === '1000-3000') {
          return price >= 1000 && price <= 3000;
        } else if (priceRange === '3000+') {
          return price > 3000;
        }
        
        return false;
      });
    });
  }

  /**
   * Filtra tours por temporada
   */
  private filterBySeason(tours: TourDataV2[]): TourDataV2[] {
    return tours.filter(tour => {
      // Si el tour tiene fechas de departure, verificar en qué temporada caen
      if (tour.departureDates && tour.departureDates.length > 0) {
        return tour.departureDates.some(dateStr => {
          const date = new Date(dateStr);
          const month = date.getMonth(); // 0-11
          
          return this.selectedSeasonOption.some(season => {
            const seasonLower = season.toLowerCase();
            
            // Verano: Junio (5), Julio (6), Agosto (7)
            if (seasonLower === 'verano') {
              return month >= 5 && month <= 7;
            }
            // Otoño: Septiembre (8), Octubre (9), Noviembre (10)
            else if (seasonLower === 'otono' || seasonLower === 'otoño') {
              return month >= 8 && month <= 10;
            }
            // Invierno: Diciembre (11), Enero (0), Febrero (1)
            else if (seasonLower === 'invierno') {
              return month === 11 || month <= 1;
            }
            // Primavera: Marzo (2), Abril (3), Mayo (4)
            else if (seasonLower === 'primavera') {
              return month >= 2 && month <= 4;
            }
            
            return false;
          });
        });
      }
      
      return false;
    });
  }

  /**
   * Filtra tours por mes
   */
  private filterByMonth(tours: TourDataV2[]): TourDataV2[] {
    return tours.filter(tour => {
      // Verificar si el tour tiene salidas en los meses seleccionados
      if (tour.availableMonths && tour.availableMonths.length > 0) {
        return tour.availableMonths.some(month => 
          this.selectedMonthOption.includes(month)
        );
      }
      
      return false;
    });
  }

  /**
   * Ordena los tours según la opción seleccionada
   */
  private sortTours(tours: TourDataV2[]): TourDataV2[] {
    const sorted = [...tours];
    
    switch (this.selectedOrderOption) {
      case 'next-departures':
        // Ordenar por próxima fecha de salida
        sorted.sort((a, b) => {
          const dateA = a.nextDepartureDate ? new Date(a.nextDepartureDate).getTime() : Number.MAX_SAFE_INTEGER;
          const dateB = b.nextDepartureDate ? new Date(b.nextDepartureDate).getTime() : Number.MAX_SAFE_INTEGER;
          return dateA - dateB;
        });
        break;
        
      case 'min-price':
        // Ordenar por precio de menor a mayor
        sorted.sort((a, b) => {
          const priceA = a.price || 0;
          const priceB = b.price || 0;
          return priceA - priceB;
        });
        break;
        
      case 'max-price':
        // Ordenar por precio de mayor a menor
        sorted.sort((a, b) => {
          const priceA = a.price || 0;
          const priceB = b.price || 0;
          return priceB - priceA;
        });
        break;
        
      default:
        // Sin ordenamiento específico
        break;
    }
    
    return sorted;
  }

  /**
   * Carga los tours a partir de los IDs proporcionados
   */
  private loadTours(): void {
    if (!this.tourIds || this.tourIds.length === 0) {
      this.tours = [];
      this.allTours = [];
      return;
    }

    // Aplicar límite si está definido
    const tourIdsToLoad = this.maxToursToShow 
      ? this.tourIds.slice(0, this.maxToursToShow)
      : this.tourIds;
    
    this.isLoading = true;
    this.isInitialLoadingView = true;
    this.hasFiredInitialViewItemList = false;
    this.tours = [];
    this.allTours = [];

    if (this.DEBUG_MODE) {
      console.log('🔄 Cargando tours con IDs:', tourIdsToLoad);
    }

    // Cargar tours secuencialmente y mostrarlos a medida que llegan
    of(...tourIdsToLoad)
      .pipe(
        concatMap((id: number) => {
          if (this.DEBUG_MODE) {
            console.log(`🔄 Procesando tour ID: ${id}`);
          }
          // Combinar datos del TourNetService, CMSTourService y datos adicionales
          return forkJoin({
            tourData: this.tourService.getTourById(id),
            cmsData: this.cmsTourService.getAllTours({ tourId: id }),
            additionalData: this.getAdditionalTourData(id),
          }).pipe(
            catchError((error: Error) => {
              console.error(
                `❌ Error loading tour with ID ${id}:`,
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
                    continent: string;
                    country: string;
                  };
                } | null
              ): TourDataV2 | null => {
                if (!combinedData) {
                  if (this.DEBUG_MODE) {
                    console.warn(`⚠️ No se encontraron datos para tour ID: ${id}`);
                  }
                  return null;
                }

                const mappedTour = this.mapToTourDataV2(combinedData);
                if (this.DEBUG_MODE) {
                  console.log(`✅ Tour mapeado - ID: ${mappedTour.id}, productStyleId: ${mappedTour.productStyleId}, isByDr: ${mappedTour.isByDr}`);
                }
                return mappedTour;
              }
            )
          );
        }),
        // Acumular tours a medida que llegan
        scan((acc: TourDataV2[], tour: TourDataV2 | null) => {
          if (tour) {
            return [...acc, tour];
          }
          return acc;
        }, [] as TourDataV2[]),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (accumulatedTours: TourDataV2[]) => {
          if (this.DEBUG_MODE) {
            console.log(`📊 Tours cargados: ${accumulatedTours.length}`);
          }
          // Guardar todos los tours sin filtrar
          this.allTours = accumulatedTours;
          // Aplicar filtros y ordenamiento (pero NO disparar evento todavía)
          this.applyFiltersAndSort(false);
        },
        complete: () => {
          if (this.DEBUG_MODE) {
            console.log('✅ Carga de tours completada');
          }
          this.isLoading = false;
          // Disparar evento view_item_list cuando la carga está completa y la lista es visible
          if (this.tours.length > 0 && !this.hasFiredInitialViewItemList) {
            this.trackViewItemList(this.tours);
            this.hasFiredInitialViewItemList = true;
          }
          // A partir de aquí, siguientes cambios son por filtros/orden
          this.isInitialLoadingView = false;
        },
        error: (error) => {
          console.error('❌ Error en la carga de tours:', error);
          this.isLoading = false;
        }
      });
  }

  /**
   * Obtiene datos adicionales del tour (departures, tags, días de itinerario, continent, country)
   */
  private getAdditionalTourData(tourId: number): Observable<{
    departures: IDepartureResponse[];
    tags: string[];
    itineraryDays: IItineraryDayResponse[];
    continent: string;
    country: string;
  }> {
    const itineraryFilters: ItineraryFilters = {
      tourId: tourId,
      isVisibleOnWeb: true,
      isBookable: true,
    };

    // Obtener itinerarios del tour para luego obtener departures
    return this.itineraryService.getAll(itineraryFilters, false).pipe(
      concatMap((itineraries: IItineraryResponse[]) => {
        if (itineraries.length === 0) {
          // Obtener continent y country incluso si no hay itinerarios
          return forkJoin({
            countryLocations: this.tourLocationService.getByTourAndType(tourId, 'COUNTRY').pipe(
              map((response) => Array.isArray(response) ? response : response ? [response] : []),
              catchError(() => of([] as ITourLocationResponse[]))
            ),
            continentLocations: this.tourLocationService.getByTourAndType(tourId, 'CONTINENT').pipe(
              map((response) => Array.isArray(response) ? response : response ? [response] : []),
              catchError(() => of([] as ITourLocationResponse[]))
            )
          }).pipe(
            switchMap(({ countryLocations, continentLocations }) => {
              const locationIds = [
                ...countryLocations.map(tl => tl.locationId),
                ...continentLocations.map(tl => tl.locationId)
              ].filter(id => id !== undefined && id !== null);
              
              if (locationIds.length === 0) {
                return of({
                  departures: [],
                  tags: [],
                  itineraryDays: [],
                  continent: '',
                  country: ''
                });
              }
              
              return this.locationService.getLocationsByIds(locationIds).pipe(
                map((locations: Location[]) => {
                  const countries = countryLocations
                    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                    .map(tl => locations.find(l => l.id === tl.locationId)?.name)
                    .filter(name => name) as string[];
                  
                  const continents = continentLocations
                    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                    .map(tl => locations.find(l => l.id === tl.locationId)?.name)
                    .filter(name => name) as string[];
                  
                  return {
                    departures: [],
                    tags: [],
                    itineraryDays: [],
                    continent: continents.join(', ') || '',
                    country: countries.join(', ') || ''
                  };
                }),
                catchError(() => of({
                  departures: [],
                  tags: [],
                  itineraryDays: [],
                  continent: '',
                  country: ''
                }))
              );
            })
          );
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
          concatMap((departureArrays: IDepartureResponse[][]) => {
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
            const tagRequest = of([]);
            
            // Obtener continent y country
            const locationRequest = forkJoin({
              countryLocations: this.tourLocationService.getByTourAndType(tourId, 'COUNTRY').pipe(
                map((response) => Array.isArray(response) ? response : response ? [response] : []),
                catchError(() => of([] as ITourLocationResponse[]))
              ),
              continentLocations: this.tourLocationService.getByTourAndType(tourId, 'CONTINENT').pipe(
                map((response) => Array.isArray(response) ? response : response ? [response] : []),
                catchError(() => of([] as ITourLocationResponse[]))
              )
            }).pipe(
              switchMap(({ countryLocations, continentLocations }) => {
                const locationIds = [
                  ...countryLocations.map(tl => tl.locationId),
                  ...continentLocations.map(tl => tl.locationId)
                ].filter(id => id !== undefined && id !== null);
                
                if (locationIds.length === 0) {
                  return of({ continent: '', country: '' });
                }
                
                return this.locationService.getLocationsByIds(locationIds).pipe(
                  map((locations: Location[]) => {
                    const countries = countryLocations
                      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                      .map(tl => locations.find(l => l.id === tl.locationId)?.name)
                      .filter(name => name) as string[];
                    
                    const continents = continentLocations
                      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                      .map(tl => locations.find(l => l.id === tl.locationId)?.name)
                      .filter(name => name) as string[];
                    
                    return {
                      continent: continents.join(', ') || '',
                      country: countries.join(', ') || ''
                    };
                  }),
                  catchError(() => of({ continent: '', country: '' }))
                );
              })
            );

            return forkJoin([tagRequest, itineraryDaysRequest, locationRequest]).pipe(
              map(([tags, itineraryDays, locationData]: [string[], IItineraryDayResponse[], { continent: string; country: string }]) => {
                return {
                  departures: allDepartures,
                  tags: tags as string[],
                  itineraryDays: itineraryDays as IItineraryDayResponse[],
                  continent: locationData.continent,
                  country: locationData.country
                };
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
          continent: '',
          country: ''
        });
      })
    );
  }

  /**
   * Mapea los datos combinados a TourDataV2
   */
  private mapToTourDataV2(combinedData: {
    tourData: TourNetTour;
    cmsData: ICMSTourResponse[];
    additionalData: {
      departures: IDepartureResponse[];
      tags: string[];
      itineraryDays: IItineraryDayResponse[];
      continent: string;
      country: string;
    };
  }): TourDataV2 {
    const tour = combinedData.tourData;
    const cmsArray = combinedData.cmsData;
    const cms = cmsArray && cmsArray.length > 0 ? cmsArray[0] : null;
    const additional = combinedData.additionalData;

    // ✅ DEBUG: Log de datos del tour
    if (this.DEBUG_MODE) {
      console.log(`🔍 Mapeando tour - ID: ${tour.id}, productStyleId: ${tour.productStyleId}, name: ${tour.name}`);
    }

    // Obtener precio: Usar minPrice del TourNetService
    let tourPrice = tour.minPrice || 0;

    // Obtener fechas: Extraer fechas de los departures
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
          const monthIndex = date.getMonth(); // 0-11
          const month = this.getMonthShort(monthIndex); // Leer desde PrimeNG
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

    // Obtener tag: Usar el primer tag disponible
    const tourTag =
      additional.tags && additional.tags.length > 0
        ? additional.tags[0]
        : '';

    // Obtener días de itinerario: Contar los días disponibles
    const itineraryDaysCount = additional.itineraryDays
      ? additional.itineraryDays.length
      : 0;

    // Crear texto de días: Formato "Colombia: en 10 días" (línea superior)
    const countryName = tour.name ? tour.name.split(':')[0].trim() : '';
    const itineraryDaysText =
      itineraryDaysCount > 0 && countryName
        ? `${countryName}: en ${itineraryDaysCount} días`
        : '';

    // Aplicar imagen como en TOUR-OVERVIEW-V2
    const imageUrl = cms?.imageUrl || '';

    // ✅ LÓGICA MEJORADA: Calcular isByDr basado en productStyleId
    // Manejar casos donde productStyleId podría ser null o undefined
    const isByDr = tour.productStyleId === 1;
    
    // ✅ DEBUG: Log de la lógica de isByDr (remover en producción)
    if (this.DEBUG_MODE) {
      console.log(`🎯 Tour ${tour.id} - productStyleId: ${tour.productStyleId}, isByDr: ${isByDr} (${isByDr ? 'GROUP' : 'NO GROUP'})`);
    }

    const mappedTour: TourDataV2 = {
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
      isByDr: isByDr, // ✅ isByDr es true cuando productStyleId es 1 (GROUP)
      webSlug:
        tour.slug ||
        tour.name?.toLowerCase().replace(/\s+/g, '-') ||
        '',
      tripType: [],
      externalID: tour.tkId || '',
      continent: additional.continent || '',
      country: additional.country || '',
      productStyleId: tour.productStyleId, // ✅ Agregar productStyleId al objeto
    };

    return mappedTour;
  }

  /**
   * Convierte un array de TourDataV2 a EcommerceItem[] para analytics
   */
  private convertToursToEcommerceItems(tours: TourDataV2[]): EcommerceItem[] {
    return tours.map((tour, index) => {
      // Calcular duración: si hay itineraryDaysCount, formatear como "X días" o "X días, Y noches"
      let duracion = '';
      if (tour.itineraryDaysCount) {
        // Intentar extraer noches del texto si está disponible, o calcular
        const days = tour.itineraryDaysCount;
        const nights = days > 0 ? days - 1 : 0; // Por defecto, noches = días - 1
        duracion = nights > 0 ? `${days} días, ${nights} noches` : `${days} días`;
      }

      // Determinar item_category5 (tipología de viaje)
      // Según especificación: "Grupos, Singles" o "Grupo, Singles" (singular cuando solo hay uno)
      let itemCategory5 = '';
      if (tour.tripType && tour.tripType.length > 0) {
        // Si tripType incluye "grupo" o "grupos", usar "Grupos"
        // Si incluye "single" o "singles", usar "Singles"
        const hasGrupo = tour.tripType.some(t => t.toLowerCase().includes('grupo'));
        const hasSingle = tour.tripType.some(t => t.toLowerCase().includes('single'));
        const parts: string[] = [];
        if (hasGrupo) parts.push('Grupos');
        if (hasSingle) parts.push('Singles');
        itemCategory5 = parts.join(', ') || tour.tripType.join(', ');
      } else {
        // Fallback: usar isByDr si está disponible
        itemCategory5 = tour.isByDr ? 'Grupos' : 'Privados';
      }

      // Convertir meses a minúsculas según especificación (ejemplo: "mayo, junio, julio")
      const monthsString = tour.availableMonths?.join(', ').toLowerCase() || '';

      return {
        item_id: tour.id?.toString() || '',
        item_name: tour.title || '',
        coupon: '',
        discount: 0,
        index: index + 1, // GA4 usa índice basado en 1
        item_brand: 'Different Roads',
        item_category: tour.continent || '',
        item_category2: tour.country || '',
        item_category3: tour.tag || '',
        item_category4: monthsString,
        item_category5: itemCategory5,
        item_list_id: this.itemListId,
        item_list_name: this.itemListName,
        item_variant: '',
        price: tour.price || 0,
        quantity: 1,
        puntuacion: this.analyticsService.formatRating(tour.rating, '5.0'),
        duracion: duracion
      };
    });
  }

  /**
   * Dispara el evento view_item_list cuando el usuario visualiza una lista de tours
   */
  private trackViewItemList(tours: TourDataV2[]): void {
    // Solo disparar si hay tours para mostrar y tenemos itemListId/itemListName
    if (!tours || tours.length === 0 || !this.itemListId || !this.itemListName) {
      return;
    }

    // Convertir tours a formato EcommerceItem
    const items = this.convertToursToEcommerceItems(tours);

    // Obtener datos del usuario y disparar evento
    this.analyticsService.getCurrentUserData().subscribe({
      next: (userData) => {
        this.analyticsService.viewItemList(
          this.itemListId,
          this.itemListName,
          items,
          userData
        );
      },
      error: (error) => {
        console.error('Error obteniendo datos de usuario para analytics:', error);
        // Disparar evento sin datos de usuario en caso de error
        this.analyticsService.viewItemList(
          this.itemListId,
          this.itemListName,
          items,
          undefined
        );
      }
    });
  }
}
