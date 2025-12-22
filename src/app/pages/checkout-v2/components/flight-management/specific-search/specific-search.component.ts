import { Component, EventEmitter, Input, OnInit, Output, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { forkJoin, of, Subject, Observable } from 'rxjs';
import { takeUntil, catchError, switchMap, map } from 'rxjs/operators';
import { FlightSegment, Flight } from '../../../../../core/models/tours/flight.model';
import { TextsService } from '../../../../../core/services/checkout/texts.service';
import { TravelersService } from '../../../../../core/services/checkout/travelers.service';
import { DepartureConsolidadorSearchLocationService, ConsolidadorSearchLocationWithSourceResponse } from '../../../../../core/services/departure/departure-consolidador-search-location.service';
import { DepartureConsolidadorTourAirportService, DepartureConsolidadorTourAirportResponse } from '../../../../../core/services/departure/departure-consolidador-tour-airport.service';
import { DepartureService, DepartureAirportTimesResponse } from '../../../../../core/services/departure/departure.service';
import { LocationAirportNetService } from '../../../../../core/services/locations/locationAirportNet.service';
import { LocationNetService } from '../../../../../core/services/locations/locationNet.service';
import { LocationAirport, Location } from '../../../../../core/models/location/location.model';
import { FlightSearchService, FlightSearchRequest, IFlightPackDTO, IFlightDetailDTO, IFlightSearchResultDTO, IFlightSearchWarning, IFlightSearchMeta } from '../../../../../core/services/flight/flight-search.service';
import { IFlightPackDTO as IFlightsNetFlightPackDTO } from '../../../services/flightsNet.service';
import { ReservationTravelerService, IReservationTravelerResponse } from '../../../../../core/services/reservation/reservation-traveler.service';
import { ReservationTravelerActivityPackService, IReservationTravelerActivityPackResponse } from '../../../../../core/services/reservation/reservation-traveler-activity-pack.service';
import { FlightSelectionState } from '../../../types/flight-selection-state';
import { AirportCityCacheService } from '../../../../../core/services/locations/airport-city-cache.service';

interface Ciudad {
  nombre: string;
  codigo: string;
}

// Constantes para tipos de fuente de aeropuertos
enum AirportSourceType {
  DEFAULT = 'Default',
  TOUR_AIRPORT = 'TourAirport',
  LOCATION = 'Location'
}

// Constantes para tipos de fuente de vuelos
enum FlightSourceType {
  AMADEUS = 'amadeus'
}

@Component({
  selector: 'app-specific-search',
  standalone: false,
  templateUrl: './specific-search.component.html',
  styleUrls: ['./specific-search.component.scss'],
})
export class SpecificSearchComponent implements OnInit, OnDestroy, OnChanges {
  // Inputs y Outputs
  @Output() filteredFlightsChange = new EventEmitter<any[]>();
  @Output() flightSelectionChange = new EventEmitter<FlightSelectionState>();
  @Output() specificFlightSelected = new EventEmitter<{
    selectedFlight: IFlightPackDTO | null;
    totalPrice: number;
    shouldAssignNoFlight?: boolean; // ✅ NUEVO: Indicar si se debe asignar "sin vuelos"
  }>();
  @Input() flights: Flight[] = [];
  @Input() departureId: number | null = null;
  @Input() reservationId: number | null = null;
  @Input() tourId: number | null = null; // ✅ NUEVO: Necesario para obtener aeropuertos permitidos
  @Input() departureActivityPackId: number | null = null; // ✅ NUEVO: ID del paquete del departure
  @Input() selectedFlightFromParent: IFlightPackDTO | null = null; // Nuevo input para sincronización con el padre

  // Propiedades públicas
  flightForm: FormGroup;
  tipoViaje: 'Ida' | 'Vuelta' | 'IdaVuelta' = 'IdaVuelta';
  equipajeMano = false;
  equipajeBodega = false;
  tourOrigenConstante: Ciudad = { nombre: '', codigo: '' };
  tourDestinoConstante: Ciudad = { nombre: '', codigo: '' }; // ✅ CORREGIDO: Ya no está hardcodeado, se llena desde la API
  fechaIdaConstante = '';
  fechaRegresoConstante = '';
  horaIdaConstante = '';
  horaRegresoConstante = '';
  filteredCities: Ciudad[] = [];
  combinedCities: { nombre: string; codigo: string; source: string; id: number }[] = [];
  readonly aerolineas: Ciudad[] = [
    { nombre: 'Todas', codigo: 'ALL' },
    { nombre: 'Royal Air Maroc', codigo: 'AT' },
    { nombre: 'TAP Air Portugal', codigo: 'TP' },
  ];
  readonly escalaOptions = [
    { label: 'Directos', value: 'directos' },
    { label: '1 Escala', value: 'unaEscala' },
    { label: '2+ Escalas', value: 'multiples' },
  ];
  readonly aerolineaOptions = this.aerolineas.map((a) => ({ label: a.nombre, value: a.codigo }));
  isLoading = false;
  isLoadingDetails = false;
  searchPerformed = false;
  selectedFlightId: string | null = null;
  transformedFlights: Flight[] = [];
  tourName = 'Destino';
  readonly sortOptions = [
    { label: 'Precio (menor a mayor)', value: 'price-asc' },
    { label: 'Precio (mayor a menor)', value: 'price-desc' },
    { label: 'Duración (más corto)', value: 'duration' },
  ];
  selectedSortOption = 'price-asc';
  flightOffersRaw: IFlightPackDTO[] = [];
  selectedFlight: IFlightPackDTO | null = null;
  adaptedFlightPacks: IFlightsNetFlightPackDTO[] = []; // Variable para almacenar los objetos transformados
  errorMessage = '';

  // Nuevas propiedades para manejar la respuesta del servicio actualizado
  searchWarnings: IFlightSearchWarning[] = [];
  searchMeta: IFlightSearchMeta | null = null;
  hasSearchWarnings = false;
  isEmptySearchResult = false;

  // Propiedades para la selección de vuelos
  travelers: IReservationTravelerResponse[] = [];
  private isInternalSelection: boolean = false;

  // Propiedades privadas
  private searchTimeout: any;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly fb: FormBuilder,
    private readonly travelersService: TravelersService,
    private readonly textsService: TextsService,
    private readonly departureConsolidadorSearchLocationService: DepartureConsolidadorSearchLocationService,
    private readonly departureConsolidadorTourAirportService: DepartureConsolidadorTourAirportService,
    private readonly departureService: DepartureService,
    private readonly locationAirportNetService: LocationAirportNetService,
    private readonly locationNetService: LocationNetService,
    private readonly flightSearchService: FlightSearchService,
    private readonly reservationTravelerService: ReservationTravelerService,
    private readonly reservationTravelerActivityPackService: ReservationTravelerActivityPackService,
    private readonly airportCityCacheService: AirportCityCacheService
  ) {
    this.flightForm = this.createFlightForm();
  }

  ngOnInit() {
    this.initTexts();
    this.initFormListeners();
    this.initTravelersListener();
    if (this.departureId) {
      this.loadCombinedCities();
      this.loadAirportTimes();
    }
    if (this.reservationId) {
      this.getTravelers();
      // Verificar si hay un vuelo ya seleccionado en el servicio
      this.checkExistingFlightSelection();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['departureId'] && changes['departureId'].currentValue && 
        changes['departureId'].currentValue !== changes['departureId'].previousValue) ||
        (changes['tourId'] && changes['tourId'].currentValue !== changes['tourId'].previousValue)) {
      if (this.departureId) {
        this.loadCombinedCities();
        this.loadAirportTimes();
      }
    }

    // Nuevo: Actualizar selectedFlight cuando cambie desde el padre
    if (
      changes['selectedFlightFromParent'] &&
      changes['selectedFlightFromParent'].currentValue !==
        changes['selectedFlightFromParent'].previousValue
    ) {

      this.selectedFlight = changes['selectedFlightFromParent'].currentValue;

      // Solo guardar asignaciones si NO es una selección interna
      if (
        !this.isInternalSelection &&
        this.selectedFlight &&
        this.reservationId
      ) {

        this.saveFlightAssignments()
          .then((success) => {
            if (success) {

            } else {
            }
          })
          .catch((error) => {
          });
      }

      // Resetear la bandera después de procesar el cambio
      this.isInternalSelection = false;
    }
  }

  ngOnDestroy() {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  // --- Métodos de inicialización ---

  private createFlightForm(): FormGroup {
    return this.fb.group({
      origen: [null],
      destinoVuelta: [null], // ✅ NUEVO: Campo para destino de vuelta en ida y vuelta
      tipoViaje: [this.tipoViaje],
      equipajeMano: [this.equipajeMano],
      equipajeBodega: [this.equipajeBodega],
      adults: [1],
      children: [0],
      infants: [0],
      aerolinea: [null],
      escala: [null],
    });
  }

  private initTexts(): void {
    const tourTexts = this.textsService.getTextsForCategory('tour');
    if (tourTexts && tourTexts['name']) {
      this.tourName = tourTexts['name'];
    }
  }

  private initFormListeners(): void {
      this.flightForm.get('tipoViaje')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((value) => {
        this.tipoViaje = value;
        
        if (value === 'IdaVuelta' && this.flightForm.get('origen')?.value) {
          this.flightForm.get('destinoVuelta')?.setValue(this.flightForm.get('origen')?.value);
        }
        
        if (value === 'Ida' || value === 'Vuelta') {
          this.flightForm.get('destinoVuelta')?.setValue(null);
        }
      });
    
    this.flightForm.get('origen')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((value) => {
      if (this.tipoViaje === 'IdaVuelta' && value) {
        this.flightForm.get('destinoVuelta')?.setValue(value);
      }
    });
    
    this.flightForm.get('equipajeMano')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((value) => {
      this.equipajeMano = value;
    });
    this.flightForm.get('equipajeBodega')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((value) => {
      this.equipajeBodega = value;
    });
  }

  private initTravelersListener(): void {
    this.travelersService.travelersNumbers$
      .pipe(takeUntil(this.destroy$))
      .subscribe((travelersNumbers: any) => {
        this.flightForm.patchValue({
          adults: travelersNumbers.adults,
          children: travelersNumbers.childs,
          infants: travelersNumbers.babies,
        });
      });
  }

  private loadCombinedCities(): void {
    if (!this.departureId) {
      this.combinedCities = [];
      return;
    }

    // Obtener aeropuertos por defecto (IsDefaultConsolidator=true) desde la API de Locations
    const defaultAirports$ = this.locationAirportNetService.getAirports({ IsDefaultConsolidator: true }).pipe(
      map((airports: LocationAirport[]) => {
        return airports.filter(airport => airport.isDefaultConsolidator === true);
      }),
      catchError(error => {
        return of([]);
      })
    );

    // Obtener ubicaciones configuradas en el consolidador (Tour + Departure)
    const configuredLocations$ = this.departureConsolidadorSearchLocationService.getCombinedLocations(this.departureId!).pipe(
      catchError(error => {
        return of([]);
      })
    );
    
    // También obtener las localizaciones directamente del departure (por si el combined no las incluye)
    const departureLocations$ = this.departureConsolidadorSearchLocationService.getDepartureLocations(this.departureId!).pipe(
      catchError(error => {
        return of([]);
      })
    );

    // Obtener aeropuertos del tour configurados en el consolidador
    const tourAirports$ = this.departureConsolidadorTourAirportService.getTourAirports(this.departureId!).pipe(
      catchError(error => {
        return of([]);
      })
    );

    // Combinar todas las fuentes
    forkJoin({
      defaultAirports: defaultAirports$,
      configuredLocations: configuredLocations$,
      departureLocations: departureLocations$,
      tourAirports: tourAirports$
    }).pipe(
      takeUntil(this.destroy$),
      switchMap(({ defaultAirports, configuredLocations, departureLocations, tourAirports }) => {
        // Combinar configuredLocations y departureLocations, eliminando duplicados por ID
        const allLocationsMap = new Map<number, ConsolidadorSearchLocationWithSourceResponse>();
        [...configuredLocations, ...departureLocations].forEach(loc => {
          if (!allLocationsMap.has(loc.id)) {
            allLocationsMap.set(loc.id, loc);
          }
        });
        const allConfiguredLocations = Array.from(allLocationsMap.values());

        // Obtener IDs de aeropuertos del tour (solo los incluidos)
        const tourAirportIds = tourAirports
          .filter((airport: DepartureConsolidadorTourAirportResponse) => airport.isIncluded === true)
          .map((airport: DepartureConsolidadorTourAirportResponse) => airport.locationAirportId);

        // Obtener detalles de las ubicaciones configuradas (usando todas las localizaciones combinadas)
        const locationIds = allConfiguredLocations.filter(item => typeof item.locationId === 'number').map(item => item.locationId as number);
        const configuredAirportIds = allConfiguredLocations.filter(item => typeof item.locationAirportId === 'number').map(item => item.locationAirportId as number);
        
        // TODO: Obtener todos los aeropuertos asociados a las localizaciones configuradas
        // Para cada locationId, obtener sus aeropuertos usando el filtro LocationId
        // COMENTADO TEMPORALMENTE - Hay un problema en el backend que no devuelve las localizaciones configuradas
        // const locationAirportsRequests = locationIds.map(locationId => 
        //   this.locationAirportNetService.getAirports({ LocationId: locationId }).pipe(
        //     catchError(error => {
        //       return of([]);
        //     })
        //   )
        // );
        
        // Combinar todos los IDs de aeropuertos (configurados + tour) sin duplicados
        const allAirportIds = [...new Set([...configuredAirportIds, ...tourAirportIds])];
        
        return forkJoin({
          locations: locationIds.length ? this.locationNetService.getLocationsByIds(locationIds) : of([]),
          airports: allAirportIds.length ? this.locationAirportNetService.getAirportsByIds(allAirportIds) : of([]),
          // locationAirports: locationAirportsRequests.length > 0 ? forkJoin(locationAirportsRequests) : of([])
          locationAirports: of([]) // COMENTADO TEMPORALMENTE
        }).pipe(
          map(configuredLocationsDetails => {
            // Crear mapa con aeropuertos por defecto
            // La API ya debe devolver solo los que tienen IsDefaultConsolidator=true
            const citiesMap = new Map<string, { nombre: string; codigo: string; source: string; id: number }>();
            defaultAirports.forEach((airport: LocationAirport) => {
              if (airport.iata && airport.name) {
                const key = airport.iata.toUpperCase();
                citiesMap.set(key, {
                  nombre: airport.name,
                  codigo: airport.iata,
                  source: AirportSourceType.DEFAULT,
                  id: airport.id
                });
              }
            });

            // Agregar ubicaciones configuradas al mapa
            const locationMap = new Map(configuredLocationsDetails.locations.map((l: Location) => [l.id, l]));
            const airportMap = new Map(configuredLocationsDetails.airports.map((a: LocationAirport) => [a.id, a]));
            
            // TODO: Agregar aeropuertos asociados a las localizaciones configuradas
            // COMENTADO TEMPORALMENTE - Hay un problema en el backend que no devuelve las localizaciones configuradas
            // locationAirports es un array de arrays (cada elemento es un array de aeropuertos para cada locationId)
            // const locationAirportsArray = configuredLocationsDetails.locationAirports || [];
            // if (Array.isArray(locationAirportsArray) && locationAirportsArray.length > 0) {
            //   locationAirportsArray.forEach((airportsForLocation: any[]) => {
            //     if (Array.isArray(airportsForLocation)) {
            //       airportsForLocation.forEach((airport: any) => {
            //         if (airport.iata && airport.name) {
            //           const key = airport.iata.toUpperCase();
            //           if (!citiesMap.has(key)) {
            //             citiesMap.set(key, {
            //               nombre: airport.name,
            //               codigo: airport.iata,
            //               source: AirportSourceType.LOCATION,
            //               id: airport.id
            //             });
            //           }
            //         }
            //       });
            //     }
            //   });
            // }

            // Agregar ubicaciones configuradas (search locations) - usar allConfiguredLocations
            allConfiguredLocations.forEach(item => {
              if (item.locationId && locationMap.has(item.locationId)) {
                const loc = locationMap.get(item.locationId);
                const codigo = loc && loc.iataCode ? String(loc.iataCode) : (loc && loc.code ? String(loc.code) : '');
                if (codigo) {
                  const key = codigo.toUpperCase();
                  citiesMap.set(key, {
                    nombre: loc && loc.name ? loc.name : '',
                    codigo: codigo,
                    source: item.source,
                    id: item.id
                  });
                }
              } else if (item.locationAirportId && airportMap.has(item.locationAirportId)) {
                const airport = airportMap.get(item.locationAirportId);
                if (airport && airport.iata) {
                  const key = airport.iata.toUpperCase();
                  citiesMap.set(key, {
                    nombre: airport.name ? airport.name : '',
                    codigo: airport.iata,
                    source: item.source,
                    id: item.id
                  });
                }
              }
            });

            // Agregar aeropuertos del tour configurados (solo los incluidos)
            tourAirports
              .filter((airport: DepartureConsolidadorTourAirportResponse) => airport.isIncluded === true)
              .forEach((tourAirport: DepartureConsolidadorTourAirportResponse) => {
                if (airportMap.has(tourAirport.locationAirportId)) {
                  const airport = airportMap.get(tourAirport.locationAirportId);
                  if (airport && airport.iata) {
                    const key = airport.iata.toUpperCase();
                    citiesMap.set(key, {
                      nombre: airport.name ? airport.name : '',
                      codigo: airport.iata,
                      source: AirportSourceType.TOUR_AIRPORT,
                      id: tourAirport.id
                    });
                  }
                }
              });

            return { defaultAirports, configuredLocationsDetails, citiesMap };
          })
        );
      })
    ).subscribe({
      next: ({ citiesMap }) => {
        this.combinedCities = Array.from(citiesMap.values());
      },
      error: (error) => {
        this.combinedCities = [];
      }
    });
  }

  private loadAirportTimes(): void {
    this.departureService.getAirportTimes(this.departureId!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: DepartureAirportTimesResponse) => {
          // Origen (llegada al inicio del tour)
          if (data.arrivalAirportIATA) {
            let cityName = data.ArrivalCity;
            if (!cityName || cityName.trim() === '') {
              const filter = { iata: data.arrivalAirportIATA };
              this.locationAirportNetService.getAirports(filter).pipe(takeUntil(this.destroy$)).subscribe(airports => {
                cityName = airports && airports.length > 0 ? airports[0].name || data.arrivalAirportIATA : data.arrivalAirportIATA;
                this.tourOrigenConstante = {
                  nombre: cityName ?? '',
                  codigo: data.arrivalAirportIATA ?? ''
                };
              });
            } else {
              this.tourOrigenConstante = {
                nombre: cityName,
                codigo: data.arrivalAirportIATA
              };
            }
          }
          // Destino (salida al final del tour)
          if (data.departureAirportIATA) {
            let cityName = data.DepartureCity;
            if (!cityName || cityName.trim() === '') {
              const filter = { iata: data.departureAirportIATA };
              this.locationAirportNetService.getAirports(filter).pipe(takeUntil(this.destroy$)).subscribe(airports => {
                cityName = airports && airports.length > 0 ? airports[0].name || data.departureAirportIATA : data.departureAirportIATA;
                this.tourDestinoConstante = {
                  nombre: cityName ?? '',
                  codigo: data.departureAirportIATA ?? ''
                };
              });
            } else {
              this.tourDestinoConstante = {
                nombre: cityName,
                codigo: data.departureAirportIATA
              };
            }
          }
          if (data.maxArrivalDateAtAirport) {
            this.fechaIdaConstante = data.maxArrivalDateAtAirport || '';
            this.horaIdaConstante = data.maxArrivalTimeAtAirport || '';
          }
          if (data.minDepartureDateFromAirport) {
            this.fechaRegresoConstante = data.minDepartureDateFromAirport || '';
            this.horaRegresoConstante = data.minDepartureTimeFromAirport || '';
          }
        },
        error: (err) => {
        }
      });
  }

  // --- Métodos públicos y de lógica de negocio ---

  buscar() {
    this.searchPerformed = true;
    this.searchFlights();
  }

  searchFlights() {
    if (!this.departureId || !this.reservationId) {
      return;
    }

    this.isLoading = true;
    this.searchPerformed = true;
    this.errorMessage = '';
    
    // Limpiar estado anterior de warnings y meta
    this.clearSearchState();
    
    // Reinicializar el estado de carga de ciudades
    this.airportCityCacheService.clearCache();

    const formValue = this.flightForm.value;
    const tipoViaje = formValue.tipoViaje;
    
    // ✅ CORREGIDO: Determinar códigos según el tipo de viaje
    let originCode: string | null = null;
    let destinationCode: string | null = null;
    
    if (tipoViaje === 'Ida') {
      originCode = formValue.origen?.codigo || null;
      destinationCode = this.tourOrigenConstante.codigo || null;
    } else if (tipoViaje === 'Vuelta') {
      originCode = this.tourDestinoConstante.codigo || null;
      destinationCode = formValue.origen?.codigo || null;
    } else if (tipoViaje === 'IdaVuelta') {
      originCode = formValue.origen?.codigo || null;
      destinationCode = formValue.destinoVuelta?.codigo || formValue.origen?.codigo || null;
    }

    const request: FlightSearchRequest = {
      departureId: this.departureId!,
      reservationId: this.reservationId || 0,
      tipoViaje: tipoViaje,
      iataOrigen: originCode,
      iataDestino: destinationCode
    };
    
    this.flightSearchService.searchFlights(request, false).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response: IFlightSearchResultDTO) => {
        this.isLoading = false;
        this.flightOffersRaw = response.flightPacks || [];
        
        // Procesar warnings y meta información
        this.hasSearchWarnings = response.hasWarnings || false;
        this.isEmptySearchResult = response.isEmptyResult || false;
        
        // Procesar warnings JSON si existe
        if (response.warningsJson) {
          try {
            const warningsArray = JSON.parse(response.warningsJson);
            this.searchWarnings = Array.isArray(warningsArray) ? warningsArray : [];
          } catch (error) {
            this.searchWarnings = [];
          }
        } else {
          this.searchWarnings = [];
        }
        
        // Procesar meta JSON si existe
        if (response.metaJson) {
          try {
            this.searchMeta = JSON.parse(response.metaJson);
          } catch (error) {
            this.searchMeta = null;
          }
        } else {
          this.searchMeta = null;
        }
        
        // Log de información de la búsqueda
        if (this.hasSearchWarnings && this.searchWarnings.length > 0) {
          this.searchWarnings.forEach(warning => {
          });
        }
        
        // Transformar los datos directamente aquí para evitar recreaciones constantes
        this.adaptedFlightPacks = this.flightOffersRaw.map(flightPack => this.adaptFlightPackForFlightItem(flightPack));
        
        // Precargar nombres de ciudades para todos los aeropuertos
        this.preloadAllAirportCities().then(() => {
          this.filterOffers();
        });
      },
      error: (err: any) => {
        this.isLoading = false;
        this.flightOffersRaw = [];
        this.adaptedFlightPacks = [];
        this.transformedFlights = [];
        this.filteredFlightsChange.emit([]);
        this.errorMessage = 'Ocurrió un error al buscar vuelos. Por favor, inténtalo de nuevo.';
      },
    });
  }

  getCityCode(cityName: string): string {
    const city = this.filteredCities.find(
      (c) => c.nombre.toLowerCase() === cityName.toLowerCase()
    );
    // ✅ CORREGIDO: Ya no hay valor hardcodeado, retorna vacío si no se encuentra
    return city ? city.codigo : '';
  }

  filterOffers() {
    const formValue = this.flightForm.value;
    
    // Si se especifica filtro de escalas, cargar detalles primero
    if (formValue.escala) {
      this.loadFlightDetailsAndFilter();
      return;
    }
    
    // Si no hay filtros de escalas, aplicar filtros básicos y ordenamiento
    this.sortFlights(this.selectedSortOption);
    
    // Solo mostrar vuelos si las ciudades están cargadas
    if (!this.hasPendingCities()) {
      this.displayFlights();
    } else {
      // Si las ciudades no están cargadas, esperar a que se completen

      this.preloadAllAirportCities().then(() => {
        this.displayFlights();
      });
    }
  }

  /**
   * Método privado para mostrar los vuelos una vez que las ciudades están cargadas
   */
  private displayFlights(): void {
    // Actualizar adaptedFlightPacks para mantener sincronización
    this.adaptedFlightPacks = this.flightOffersRaw.map(flightPack => this.adaptFlightPackForFlightItem(flightPack));
    
    this.transformedFlights = this.transformOffersToFlightFormat(this.flightOffersRaw);
    this.filteredFlightsChange.emit(this.transformedFlights);

  }

  // Método para obtener detalles de un vuelo específico cuando sea necesario
  getFlightDetails(consolidatorSearchId: number, amadeusFlightId: string): Observable<IFlightDetailDTO> {
    return this.flightSearchService.getFlightDetails(consolidatorSearchId, amadeusFlightId);
  }

  // Método para cargar detalles de todos los vuelos y aplicar filtros de escalas
  loadFlightDetailsAndFilter(): void {
    if (!this.flightOffersRaw || this.flightOffersRaw.length === 0) return;

    const formValue = this.flightForm.value;
    if (!formValue.escala) {
      this.filterOffers();
      return;
    }

    this.isLoadingDetails = true;

    // Cargar detalles de todos los vuelos en todos los paquetes para poder filtrar por escalas
    // El nuevo endpoint requiere: /api/FlightSearch/{packId}/details/{flightId}
    // Por eso necesitamos tanto el ID del paquete como el ID del vuelo individual
    const detailRequests: Observable<IFlightDetailDTO>[] = [];
    
    this.flightOffersRaw.forEach(flightPack => {
      if (flightPack.flights) {
        flightPack.flights.forEach(flight => {
          detailRequests.push(this.getFlightDetails(flightPack.id, flight.id.toString()));
        });
      }
    });

    forkJoin(detailRequests).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (flightDetails) => {
        this.isLoadingDetails = false;
        // Aplicar filtros basados en los detalles cargados
        this.applyScaleFilters(flightDetails);
      },
      error: (err) => {
        this.isLoadingDetails = false;
        // Si falla la carga de detalles, mostrar todos los vuelos
        this.filterOffers();
      }
    });
  }

  // Aplicar filtros de escalas basándose en los detalles cargados
  private applyScaleFilters(flightDetails: IFlightDetailDTO[]): void {
    const formValue = this.flightForm.value;
    
    // Filtrar paquetes basándose en los detalles de escalas
    this.flightOffersRaw = this.flightOffersRaw.filter((flightPack) => {
      if (!flightPack.flights || flightPack.flights.length === 0) return false;
      
      // Buscar el primer vuelo de ida (flightTypeId === 4)
      const outboundFlight = flightPack.flights.find(f => f.flightTypeId === 4);
      if (!outboundFlight) return false;
      
      // Por ahora, mostrar todos los vuelos ya que los detalles se cargan internamente
      // en cada flight-item cuando useNewService="true"
      return true;
    });
    
    this.sortFlights(this.selectedSortOption);
    
    // Solo mostrar vuelos si las ciudades están cargadas
    if (!this.hasPendingCities()) {
      this.displayFlights();
    } else {
      // Si las ciudades no están cargadas, esperar a que se completen

      this.preloadAllAirportCities().then(() => {
        this.displayFlights();
      });
    }
  }

  sortFlights(sortOption: string) {
    switch (sortOption) {
      case 'price-asc':
        this.flightOffersRaw.sort((a, b) => {
          const priceA = a.ageGroupPrices?.[0]?.price || 0;
          const priceB = b.ageGroupPrices?.[0]?.price || 0;
          return priceA - priceB;
        });
        break;
      case 'price-desc':
        this.flightOffersRaw.sort((a, b) => {
          const priceA = a.ageGroupPrices?.[0]?.price || 0;
          const priceB = b.ageGroupPrices?.[0]?.price || 0;
          return priceB - priceA;
        });
        break;
      case 'duration':
        // Por ahora ordenamos por precio ya que no tenemos duración detallada
        this.flightOffersRaw.sort((a, b) => {
          const priceA = a.ageGroupPrices?.[0]?.price || 0;
          const priceB = b.ageGroupPrices?.[0]?.price || 0;
          return priceA - priceB;
        });
        break;
    }
  }

  onSortChange(event: any) {
    this.selectedSortOption = event.value;
    if (this.flightOffersRaw.length > 0) {
      this.sortFlights(this.selectedSortOption);
      
      // Solo mostrar vuelos si las ciudades están cargadas
      if (!this.hasPendingCities()) {
        this.displayFlights();
      } else {
        // Si las ciudades no están cargadas, esperar a que se completen

        this.preloadAllAirportCities().then(() => {
          this.displayFlights();
        });
      }
    }
  }

  // --- Utilidades privadas y helpers ---

  private getTimeFromDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      if (date instanceof Date && !isNaN(date.getTime())) {
        return date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0');
      }
    } catch {}
    const parts = dateStr.split('T');
    if (parts.length > 1) {
      return parts[1].substring(0, 5);
    }
    return '00:00';
  }

  transformOffersToFlightFormat(offers: IFlightPackDTO[]): Flight[] {
    return offers.map((flightPack) => {
      const outboundFlight = flightPack.flights?.find(f => f.flightTypeId === 4); // IDA
      const inboundFlight = flightPack.flights?.find(f => f.flightTypeId === 5); // VUELTA

      // Crear segmentos básicos basados en la información disponible
      const outboundSegments: FlightSegment[] = outboundFlight ? [{
        departureCity: outboundFlight.departureCity || outboundFlight.departureIATACode || '',
        arrivalCity: outboundFlight.arrivalCity || outboundFlight.arrivalIATACode || '',
        departureTime: outboundFlight.departureTime || '',
        arrivalTime: outboundFlight.arrivalTime || '',
        departureIata: outboundFlight.departureIATACode || '',
        arrivalIata: outboundFlight.arrivalIATACode || '',
        flightNumber: outboundFlight.tkId || '',
        numNights: 0,
        differential: 0,
        order: 0,
        airline: {
          name: outboundFlight.name || '',
          code: outboundFlight.tkId || '',
          email: '',
          logo: '',
        },
      }] : [];

      let inboundSegments: FlightSegment[] = [];
      if (inboundFlight) {
        inboundSegments = [{
          departureCity: inboundFlight.departureCity || inboundFlight.departureIATACode || '',
          arrivalCity: inboundFlight.arrivalCity || inboundFlight.arrivalIATACode || '',
          departureTime: inboundFlight.departureTime || '',
          arrivalTime: inboundFlight.arrivalTime || '',
          departureIata: inboundFlight.departureIATACode || '',
          arrivalIata: inboundFlight.arrivalIATACode || '',
          flightNumber: inboundFlight.tkId || '',
          numNights: 0,
          differential: 0,
          order: 0,
          airline: {
            name: inboundFlight.name || '',
            code: inboundFlight.tkId || '',
            email: '',
            logo: '',
          },
        }];
      }

      // Convertir IAgeGroupPriceDTO a PriceData
      const priceData = flightPack.ageGroupPrices?.map(price => ({
        id: price.ageGroupId?.toString() || '',
        value: price.price || 0,
        value_with_campaign: price.price || 0,
        campaign: null,
        age_group_name: price.ageGroupName || 'Adultos',
        category_name: 'Vuelo',
        period_product: undefined,
        _id: undefined,
      })) || [];

      const flight: Flight = {
        id: flightPack.id.toString(),
        externalID: flightPack.id.toString(),
        name: `Vuelo ${outboundFlight?.departureIATACode || ''} - ${outboundFlight?.arrivalIATACode || ''}`,
        outbound: {
          activityID: 0,
          availability: 1,
          date: this.fechaIdaConstante,
          name: `Vuelo a ${outboundFlight?.arrivalCity || outboundFlight?.arrivalIATACode || ''}`,
          segments: outboundSegments,
          serviceCombinationID: 0,
          prices: priceData,
        },
        inbound: inboundFlight
          ? {
              activityID: 0,
              availability: 1,
              date: this.fechaRegresoConstante,
              name: `Vuelo de regreso desde ${inboundFlight.departureCity || inboundFlight.departureIATACode || ''} a ${inboundFlight.arrivalCity || inboundFlight.arrivalIATACode || ''}`,
              segments: inboundSegments,
              serviceCombinationID: 0,
              prices: [],
            }
          : {
              activityID: 0,
              availability: 0,
              date: '',
              name: 'No return flight',
              segments: [],
              serviceCombinationID: 0,
              prices: [],
            },
        price: flightPack.ageGroupPrices?.[0]?.price || 0,
        priceData: priceData,
        source: FlightSourceType.AMADEUS,
      };

      return flight;
    });
  }

  getCityName(cityName: string): string {
    const city = this.filteredCities.find(
      (c) => c.nombre.toLowerCase() === cityName.toLowerCase()
    );
    // ✅ CORREGIDO: Ya no hay valor hardcodeado, retorna vacío si no se encuentra
    return city ? city.codigo : '';
  }

  /**
   * Obtiene el nombre de la ciudad a partir del código IATA del aeropuerto
   * @param airportIATA Código IATA del aeropuerto
   * @returns Nombre de la ciudad o string vacío si no se encuentra
   */
  private getCityNameFromAirport(airportIATA: string | null | undefined): string {
    if (!airportIATA) return '';

    // Usar el servicio de cache
    return this.airportCityCacheService.getCityNameFromCache(airportIATA);
  }

  /**
   * Obtiene el nombre de la ciudad desde el cache
   * @param airportIATA Código IATA del aeropuerto
   * @returns Nombre de la ciudad o string vacío si no está en cache
   */
  private getCityNameFromCache(airportIATA: string | null | undefined): string {
    if (!airportIATA) return '';

    return this.airportCityCacheService.getCityNameFromCache(airportIATA);
  }

  /**
   * Verifica si hay ciudades pendientes de cargar
   * @returns true si hay ciudades pendientes, false si todas están cargadas
   */
  public hasPendingCities(): boolean {
    if (!this.flightOffersRaw || this.flightOffersRaw.length === 0) {
      return false;
    }

    // Obtener todos los códigos IATA únicos de aeropuertos
    const allAirportCodes: string[] = [];
    
    this.flightOffersRaw.forEach(flightPack => {
      if (flightPack.flights) {
        flightPack.flights.forEach(flight => {
          if (flight.departureIATACode) {
            allAirportCodes.push(flight.departureIATACode);
          }
          if (flight.arrivalIATACode) {
            allAirportCodes.push(flight.arrivalIATACode);
          }
        });
      }
    });

    return this.airportCityCacheService.hasPendingCities(allAirportCodes);
  }

  /**
   * Precarga los nombres de ciudades para todos los aeropuertos utilizados en los vuelos
   * @returns Promise que se resuelve cuando todas las ciudades están cargadas
   */
  private preloadAllAirportCities(): Promise<void> {
    if (!this.flightOffersRaw || this.flightOffersRaw.length === 0) {
      return Promise.resolve();
    }

    // Obtener todos los códigos IATA únicos de aeropuertos
    const allAirportCodes: string[] = [];
    
    this.flightOffersRaw.forEach(flightPack => {
      if (flightPack.flights) {
        flightPack.flights.forEach(flight => {
          if (flight.departureIATACode) {
            allAirportCodes.push(flight.departureIATACode);
          }
          if (flight.arrivalIATACode) {
            allAirportCodes.push(flight.arrivalIATACode);
          }
        });
      }
    });

    // Usar el servicio para precargar todas las ciudades
    return this.airportCityCacheService.preloadAllAirportCities(allAirportCodes);
  }

  formatDuration(duration: string): string {
    if (!duration) return '';
    const hours = duration.match(/(\d+)H/);
    const minutes = duration.match(/(\d+)M/);
    let formatted = '';
    if (hours) formatted += `${hours[1]}h `;
    if (minutes) formatted += `${minutes[1]}m`;
    return formatted.trim();
  }

  getAirlineName(code: string): string {
    return code;
  }

  selectFlight(flightPack: any): void {

    // Convertir de vuelta al formato del FlightSearchService si es necesario
    if (flightPack && typeof flightPack === 'object') {
      // Buscar el vuelo original en flightOffersRaw
      const originalFlight = this.flightOffersRaw.find(f => f.id === flightPack.id);
      if (originalFlight) {

        this.selectFlightFromFlightItem(originalFlight);
      } else {
      }
    } else {
    }
  }

  // Método para obtener viajeros de la reserva
  getTravelers(): void {
    if (!this.reservationId) {
      return;
    }

    this.reservationTravelerService
      .getByReservation(this.reservationId)
      .subscribe({
        next: (travelers) => {
          this.travelers = travelers;

        },
        error: (error) => {
        },
      });
  }

  // Método para verificar si hay un vuelo ya seleccionado en el servicio
  checkExistingFlightSelection(): void {
    if (!this.reservationId) {
      return;
    }

    // Por ahora, no hay un método directo para obtener el vuelo seleccionado
    // del FlightSearchService. La selección se maneja a través de la sincronización
    // con el componente padre via selectedFlightFromParent

  }

  // Método para seleccionar/deseleccionar vuelos (similar a default-flights)
  selectFlightFromFlightItem(flightPack: IFlightPackDTO): void {

    if (this.selectedFlight === flightPack) {
      // Deseleccionar vuelo

      this.selectedFlight = null;
      
      // Deseleccionar usando el FlightSearchService
      if (this.reservationId) {
        this.flightSearchService.unselectAllFlights(this.reservationId).subscribe({
          next: () => {

          },
          error: (error) => {
          }
        });
      }
      
      this.flightSelectionChange.emit({ 
        selectedFlight: null, 
        totalPrice: 0, 
        source: 'specific', 
        packId: null 
      });

      this.specificFlightSelected.emit({
        selectedFlight: null,
        totalPrice: 0,
      });
    } else {
      // Seleccionar nuevo vuelo

      this.selectedFlight = flightPack;
      
      const basePrice =
        flightPack.ageGroupPrices?.find(
          (price) => price.ageGroupId === this.travelers[0]?.ageGroupId
        )?.price || 0;
      const totalTravelers = this.travelers.length;
      const totalPrice = totalTravelers > 0 ? basePrice * totalTravelers : 0;

      // Emitir eventos
      this.specificFlightSelected.emit({
        selectedFlight: flightPack,
        totalPrice: basePrice,
      });

      this.flightSelectionChange.emit({
        selectedFlight: flightPack,
        totalPrice: basePrice,
        source: 'specific',
        packId: flightPack.id
      });

      // Buscar el flightPack "sin vuelos" y asignarlo a todos los viajeros

      this.findAndAssignNoFlightOption();
    }
  }

  /**
   * ✅ MÉTODO CORREGIDO: Buscar el flightPack "sin vuelos" y asignarlo a todos los viajeros
   * Nota: En specific-search no tenemos acceso directo a los flightPacks "sin vuelos",
   * por lo que emitimos un evento para que el componente padre (flight-management) lo maneje
   */
  private async findAndAssignNoFlightOption(): Promise<void> {

    if (!this.reservationId) {

      return;
    }

    if (!this.selectedFlight) {

      return;
    }

    try {
      // Obtener todos los viajeros de la reserva
      const travelers = await new Promise<IReservationTravelerResponse[]>(
        (resolve, reject) => {
          this.reservationTravelerService
            .getAll({ reservationId: this.reservationId! })
            .subscribe({
              next: (travelers) => {

                resolve(travelers);
              },
              error: (error) => {
                reject(error);
              },
            });
        }
      );

      if (travelers.length === 0) {

        return;
      }

      // ✅ CORRECCIÓN: En specific-search no tenemos acceso a flightPacks "sin vuelos"
      // Por lo tanto, emitimos un evento para que el componente padre lo maneje

      // Emitir evento específico para que el padre sepa que debe asignar "sin vuelos"
      this.specificFlightSelected.emit({
        selectedFlight: this.selectedFlight,
        totalPrice: this.selectedFlight.ageGroupPrices?.[0]?.price || 0,
        shouldAssignNoFlight: true // ✅ NUEVO: Indicar que se debe asignar "sin vuelos"
      });

      // Llamar a select de specific-search para guardar la selección
      if (this.reservationId && this.selectedFlight) {

        this.flightSearchService.selectFlight(this.reservationId, this.selectedFlight.id).subscribe({
          next: () => {

          },
          error: (error) => {
          },
        });
      }

    } catch (error) {
    }
  }

  // Método para guardar asignaciones de vuelos (similar a default-flights)
  async saveFlightAssignments(): Promise<boolean> {

    if (!this.selectedFlight || !this.reservationId) {

      return true;
    }

    try {

      const travelers = await new Promise<IReservationTravelerResponse[]>(
        (resolve, reject) => {
          this.reservationTravelerService
            .getAll({ reservationId: this.reservationId! })
            .subscribe({
              next: (travelers) => {

                resolve(travelers);
              },
              error: (error) => {
                reject(error);
              },
            });
        }
      );

      if (travelers.length === 0) {

        return true;
      }

      const activityPackId = this.selectedFlight.id;

      // ✅ MODIFICADO: Solo actualizar asignaciones existentes del departure, NUNCA crear nuevas

      const existingAssignmentsPromises = travelers.map((traveler) => {
        return new Promise<{
          traveler: IReservationTravelerResponse;
          existingAssignments: IReservationTravelerActivityPackResponse[];
        }>((resolve, reject) => {
          this.reservationTravelerActivityPackService
            .getByReservationTraveler(traveler.id)
            .subscribe({
              next: (assignments) => {
                // ✅ SOLO buscar asignaciones del departure (por departureActivityPackId)
                const departureAssignments = assignments.filter(
                  (a) => a.activityPackId === this.departureActivityPackId
                );

                // Ordenar por ID descendente para obtener el más reciente
                const sortedAssignments = departureAssignments.sort(
                  (a, b) => b.id - a.id
                );

                resolve({
                  traveler,
                  existingAssignments: sortedAssignments,
                });
              },
              error: (error) => {
                reject(error);
              },
            });
        });
      });

      const existingAssignmentsResults = await Promise.all(
        existingAssignmentsPromises
      );

      // ✅ MODIFICADO: SOLO actualizar registros existentes, NUNCA crear nuevos
      const hasExistingDepartureAssignments = existingAssignmentsResults.some(
        (result) => result.existingAssignments.length > 0
      );

      if (hasExistingDepartureAssignments) {

        const updatePromises = existingAssignmentsResults.map((result) => {
          return new Promise<boolean>((resolve, reject) => {
            const { traveler, existingAssignments } = result;

            if (existingAssignments.length > 0) {
              // Siempre usar la primera asignación (la más reciente por ID)
              const mostRecentAssignment = existingAssignments[0];

              const updateData = {
                id: mostRecentAssignment.id,
                reservationTravelerId: traveler.id,
                activityPackId: activityPackId,
                updatedAt: new Date().toISOString(),
              };

              this.reservationTravelerActivityPackService
                .update(mostRecentAssignment.id, updateData)
                .subscribe({
                  next: (updated: boolean) => {
                    if (updated) {

                    } else {
                    }
                    resolve(updated);
                  },
                  error: (error: any) => {
                    reject(error);
                  },
                });
            } else {
              // ✅ MODIFICADO: NO crear nuevas asignaciones, solo log

              resolve(true); // Resolver como éxito sin crear nada
            }
          });
        });

        await Promise.all(updatePromises);

      } else {
        // ✅ MODIFICADO: NO crear nuevas asignaciones si no existen

      }

      // ✅ NUEVO: Marcar "Sin Vuelos" en default-flights después de guardar
      if (this.reservationId) {
        // En lugar de crear asignaciones duplicadas, solo emitir el evento
        // El componente padre se encargará de marcar "Sin Vuelos" en default-flights

      }

      return true;
    } catch (error) {
      return false;
    }
  }

  trackByFlightId(index: number, flightPack: IFlightsNetFlightPackDTO): number {
    return flightPack.id;
  }

  // Adaptador para convertir IFlightPackDTO del FlightSearchService al formato esperado por app-flight-item
  adaptFlightPackForFlightItem(flightPack: IFlightPackDTO): IFlightsNetFlightPackDTO {
    // Crear nuevo objeto adaptado
    const adaptedObject: IFlightsNetFlightPackDTO = {
      id: flightPack.id,
      code: flightPack.code || '',
      name: flightPack.name || '',
      description: flightPack.description || '',
      tkId: typeof flightPack.tkId === 'string' ? parseInt(flightPack.tkId) || 0 : (flightPack.tkId || 0),
      itineraryId: flightPack.itineraryId,
      isOptional: flightPack.isOptional,
      imageUrl: flightPack.imageUrl || '',
      imageAlt: flightPack.imageAlt || '',
      isVisibleOnWeb: flightPack.isVisibleOnWeb,
      ageGroupPrices: flightPack.ageGroupPrices?.map(price => ({
        price: price.price || 0,
        ageGroupId: price.ageGroupId || 0,
        ageGroupName: price.ageGroupName || 'Adultos'
      })) || [],
      flights: flightPack.flights?.map(flight => ({
        id: flight.id,
        tkId: flight.tkId || '',
        name: flight.name || '',
        activityId: flight.activityId,
        departureId: flight.departureId,
        tkActivityPeriodId: flight.tkActivityPeriodId || '',
        tkServiceCombinationId: flight.tkServiceCombinationId || '',
        date: flight.date || '',
        tkServiceId: flight.tkServiceId || '',
        tkJourneyId: flight.tkJourneyId || '',
        flightTypeId: flight.flightTypeId,
        departureIATACode: flight.departureIATACode || '',
        arrivalIATACode: flight.arrivalIATACode || '',
        departureDate: flight.departureDate || '',
        departureTime: flight.departureTime || '',
        arrivalDate: flight.arrivalDate || '',
        arrivalTime: flight.arrivalTime || '',
        departureCity: this.airportCityCacheService.getCityNameFromCache(flight.departureIATACode) || flight.departureCity || '',
        arrivalCity: this.airportCityCacheService.getCityNameFromCache(flight.arrivalIATACode) || flight.arrivalCity || ''
      })) || []
    };

    return adaptedObject;
  }

  // Método helper para verificar si un vuelo está seleccionado
  isFlightSelected(flightPack: IFlightsNetFlightPackDTO): boolean {
    return this.selectedFlight !== null && this.selectedFlight.id === flightPack.id;
  }

  // Método para obtener el texto del botón de selección
  getSelectionButtonText(flightPack: IFlightsNetFlightPackDTO): string {
    return this.isFlightSelected(flightPack) ? 'Seleccionado' : 'Seleccionar';
  }

  // Método para obtener la clase CSS del botón de selección
  getSelectionButtonClass(flightPack: IFlightsNetFlightPackDTO): string {
    return this.isFlightSelected(flightPack) ? 'selected-flight-button' : '';
  }

  searchCities(event: any): void {
    const query = event.query.toLowerCase();
    this.filteredCities = this.combinedCities.filter(city =>
      city.nombre.toLowerCase().includes(query) ||
      city.codigo.toLowerCase().includes(query)
    );
  }

  /**
   * Obtiene un mensaje amigable para el usuario cuando no hay resultados
   * @returns Mensaje descriptivo basado en el estado de la búsqueda
   */
  getNoResultsMessage(): string {
    if (this.hasSearchWarnings && this.searchWarnings.length > 0) {
      const firstWarning = this.searchWarnings[0];
      if (firstWarning.title === 'IncompleteSearchWarning') {
        return 'La búsqueda no se pudo completar completamente. Esto puede deberse a limitaciones temporales del servicio.';
      }
      return `Búsqueda con advertencias: ${firstWarning.detail}`;
    }
    
    if (this.searchMeta && this.searchMeta.count === 0) {
      return 'No se encontraron vuelos disponibles con los criterios seleccionados.';
    }
    
    return 'No hay vuelos disponibles con los criterios seleccionados. Por favor, intenta modificar tu búsqueda.';
  }

  private clearSearchState(): void {
    this.searchWarnings = [];
    this.searchMeta = null;
    this.hasSearchWarnings = false;
    this.isEmptySearchResult = false;
  }
}
