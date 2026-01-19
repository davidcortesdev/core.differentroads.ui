import { Component, EventEmitter, Input, OnInit, Output, OnDestroy, OnChanges, SimpleChanges, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
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

// Constantes para tipos de vuelo (flightTypeId)
enum FlightTypeId {
  IDA_NEW = 0,        // IDA en el nuevo sistema
  VUELTA_NEW = 1,     // VUELTA en el nuevo sistema
  IDA_LEGACY = 4,     // IDA en el sistema legacy
  VUELTA_LEGACY = 5   // VUELTA en el sistema legacy
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
    shouldAssignNoFlight?: boolean; // Indicar si se debe asignar "sin vuelos"
  }>();
  @Input() flights: Flight[] = [];
  @Input() departureId: number | null = null;
  @Input() reservationId: number | null = null;
  @Input() tourId: number | null = null; // Necesario para obtener aeropuertos permitidos
  @Input() departureActivityPackId: number | null = null; // ID del paquete del departure
  @Input() selectedFlightFromParent: IFlightPackDTO | null = null;

  // Propiedades públicas
  flightForm: FormGroup;
  tipoViaje: 'Ida' | 'Vuelta' | 'IdaVuelta' = 'IdaVuelta';
  equipajeMano = false;
  equipajeBodega = false;
  tourOrigenConstante: Ciudad = { nombre: '', codigo: '' };
  tourDestinoConstante: Ciudad = { nombre: '', codigo: '' }; // Se llena desde la API
  fechaIdaConstante = '';
  fechaRegresoConstante = '';
  horaIdaConstante = '';
  horaRegresoConstante = '';
  
  // Límites para fecha/hora de ida (llegada al aeropuerto)
  maxFechaIda: Date | null = null;
  maxHoraIda: string | null = null;
  
  // Límites para fecha/hora de vuelta (salida del aeropuerto)
  minFechaVuelta: Date | null = null;
  minHoraVuelta: string | null = null;
  
  // Fecha por defecto para mostrar en el calendario cuando está vacío
  defaultDateFechaVuelta: Date | null = null;
  
  // Flag para rastrear si el valor temporal fue establecido para mostrar el mes correcto
  private fechaVueltaTemporalEstablecida: boolean = false;
  
  // Rango de años para el navegador de años del datepicker de vuelta
  get yearRangeVuelta(): string {
    const currentYear = new Date().getFullYear();
    const maxYear = currentYear + 2; // Permitir hasta 2 años en el futuro
    return `${currentYear}:${maxYear}`;
  }
  
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

    if (
      changes['selectedFlightFromParent'] &&
      changes['selectedFlightFromParent'].currentValue !==
        changes['selectedFlightFromParent'].previousValue
    ) {
      this.selectedFlight = changes['selectedFlightFromParent'].currentValue;
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

  private createFlightForm(): FormGroup {
    return this.fb.group({
      origen: [null, Validators.required],
      destinoVuelta: [null], // Campo para destino de vuelta en ida y vuelta
      tipoViaje: [this.tipoViaje],
      equipajeMano: [this.equipajeMano],
      equipajeBodega: [this.equipajeBodega],
      adults: [1],
      children: [0],
      infants: [0],
      aerolinea: [null],
      escala: [null],
      fechaHoraIda: [null, [this.validateFechaHoraIda, this.validateRequiredFechaHoraIda]],
      fechaHoraVuelta: [null, [this.validateFechaHoraVuelta, this.validateRequiredFechaHoraVuelta]],
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
        
        // Actualizar validaciones requeridas según el tipo de viaje
        const fechaHoraIdaControl = this.flightForm.get('fechaHoraIda');
        const fechaHoraVueltaControl = this.flightForm.get('fechaHoraVuelta');
        
        if (fechaHoraIdaControl) {
          fechaHoraIdaControl.updateValueAndValidity();
        }
        if (fechaHoraVueltaControl) {
          fechaHoraVueltaControl.updateValueAndValidity();
        }
        
        // Limpiar fecha/hora de vuelta si el tipo de viaje es "Solo ida"
        // Hacerlo ANTES de actualizar validaciones para evitar validar campos que no deberían existir
        if (value === 'Ida') {
          this.flightForm.get('fechaHoraVuelta')?.setValue(null, { emitEvent: false });
          this.flightForm.get('destinoVuelta')?.setValue(null, { emitEvent: false });
        }
        
        // Limpiar fecha/hora de ida si el tipo de viaje es "Solo vuelta"
        if (value === 'Vuelta') {
          this.flightForm.get('fechaHoraIda')?.setValue(null, { emitEvent: false });
          this.flightForm.get('destinoVuelta')?.setValue(null, { emitEvent: false });
        }
        
        if (value === 'IdaVuelta' && this.flightForm.get('origen')?.value) {
          this.flightForm.get('destinoVuelta')?.setValue(this.flightForm.get('origen')?.value);
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
    // Primero obtener los del departure
    const departureTourAirports$ = this.departureConsolidadorTourAirportService.getTourAirports(this.departureId!).pipe(
      catchError(error => {
        return of([]);
      })
    );

    // Obtener los aeropuertos del tour por tourId (para combinarlos con los del departure)
    const tourLevelAirports$ = this.tourId 
      ? this.departureConsolidadorTourAirportService.getTourAirportsByTourId(this.tourId).pipe(
          catchError(error => {
            // En caso de error, retornar array vacío para no bloquear la carga
            return of([]);
          })
        )
      : of([]);

    // Combinar ambas fuentes de aeropuertos del tour
    const tourAirports$ = forkJoin({
      departureTourAirports: departureTourAirports$,
      tourLevelAirports: tourLevelAirports$
    }).pipe(
      map(({ departureTourAirports, tourLevelAirports }) => {
        // Combinar ambas listas, dando prioridad a los del departure
        const departureAirportIds = new Set(departureTourAirports.map(da => da.locationAirportId));
        // Solo incluir aeropuertos del tour que no estén en departure
        const uniqueTourAirports = tourLevelAirports.filter(ta => !departureAirportIds.has(ta.locationAirportId));
        return [...departureTourAirports, ...uniqueTourAirports];
      }),
      catchError(error => {
        // Si falla la combinación, solo retornar los del departure
        return departureTourAirports$;
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
        
        // Combinar todos los IDs de aeropuertos (configurados + tour) sin duplicados
        const allAirportIds = [...new Set([...configuredAirportIds, ...tourAirportIds])];
        
        return forkJoin({
            locations: locationIds.length ? this.locationNetService.getLocationsByIds(locationIds) : of([]),
          airports: allAirportIds.length ? this.locationAirportNetService.getAirportsByIds(allAirportIds) : of([]),
          locationAirports: of([])
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
          
          // Configurar límites y valores por defecto para fecha/hora de IDA (llegada)
          if (data.maxArrivalDateAtAirport) {
            this.fechaIdaConstante = data.maxArrivalDateAtAirport || '';
            this.horaIdaConstante = data.maxArrivalTimeAtAirport || '';
            
            // Convertir string a Date para el límite máximo
            const maxDateIda = new Date(data.maxArrivalDateAtAirport);
            if (!isNaN(maxDateIda.getTime())) {
              this.maxFechaIda = maxDateIda;
              this.maxHoraIda = data.maxArrivalTimeAtAirport || null;
              
              // Precargar el valor por defecto en el formulario (combinar fecha y hora)
              const fechaHoraIda = this.combineDateAndTime(maxDateIda, data.maxArrivalTimeAtAirport);
              this.flightForm.patchValue({
                fechaHoraIda: fechaHoraIda
              });
            }
          }
          
          // Configurar límites y valores por defecto para fecha/hora de VUELTA (salida)
          if (data.minDepartureDateFromAirport) {
            this.fechaRegresoConstante = data.minDepartureDateFromAirport || '';
            this.horaRegresoConstante = data.minDepartureTimeFromAirport || '';
            
            // Convertir string a Date para el límite mínimo
            const minDateVuelta = new Date(data.minDepartureDateFromAirport);
            if (!isNaN(minDateVuelta.getTime())) {
              this.minFechaVuelta = minDateVuelta;
              this.minHoraVuelta = data.minDepartureTimeFromAirport || null;
              
              // Establecer la fecha por defecto para que el calendario muestre el mes correcto
              if (this.minHoraVuelta) {
                this.defaultDateFechaVuelta = this.combineDateAndTime(this.minFechaVuelta, this.minHoraVuelta);
              } else {
                this.defaultDateFechaVuelta = new Date(this.minFechaVuelta);
              }
            }
          }
        },
        error: (err) => {
        }
      });
  }

  buscar() {
    this.flightForm.markAllAsTouched();
    
    if (this.flightForm.invalid) {
      this.errorMessage = 'Por favor, completa todos los campos requeridos';
      this.flightOffersRaw = [];
      this.adaptedFlightPacks = [];
      this.searchPerformed = false;
      this.airportCityCacheService.clearCache();
      return;
    }
    
    this.searchPerformed = true;
    this.errorMessage = '';
    this.searchFlights();
  }

  searchFlights() {
    if (!this.departureId || !this.reservationId) {
      return;
    }

    this.isLoading = true;
    this.searchPerformed = true;
    this.errorMessage = '';
    this.clearSearchState();
    this.airportCityCacheService.clearCache();

    const formValue = this.flightForm.value;
    const tipoViaje = formValue.tipoViaje;
    
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
    
    const fechaHoraIda = formValue.fechaHoraIda;
    const fechaHoraVuelta = (tipoViaje === 'Vuelta' || tipoViaje === 'IdaVuelta') ? formValue.fechaHoraVuelta : null;
    
    const fechaIdaFormatted = fechaHoraIda ? this.formatDateForAPI(fechaHoraIda) : null;
    const horaIdaFormatted = fechaHoraIda ? this.formatTimeForAPI(fechaHoraIda) : null;
    const fechaVueltaFormatted = fechaHoraVuelta ? this.formatDateForAPI(fechaHoraVuelta) : null;
    const horaVueltaFormatted = fechaHoraVuelta ? this.formatTimeForAPI(fechaHoraVuelta) : null;
    
    const validationError = this.validateFlightDatesBeforeSearch(tipoViaje, fechaHoraIda, fechaHoraVuelta, fechaIdaFormatted, horaIdaFormatted, fechaVueltaFormatted, horaVueltaFormatted);
    if (validationError) {
      this.isLoading = false;
      this.errorMessage = validationError;
      this.flightOffersRaw = [];
      this.adaptedFlightPacks = [];
      this.searchPerformed = false;
      this.airportCityCacheService.clearCache();
      return;
    }

    const request: FlightSearchRequest = {
      departureId: this.departureId!,
      reservationId: this.reservationId || 0,
      tipoViaje: tipoViaje,
      iataOrigen: originCode,
      iataDestino: destinationCode,
      fechaIda: fechaIdaFormatted,
      horaIda: horaIdaFormatted,
      fechaVuelta: (tipoViaje === 'Vuelta' || tipoViaje === 'IdaVuelta') ? fechaVueltaFormatted : null,
      horaVuelta: (tipoViaje === 'Vuelta' || tipoViaje === 'IdaVuelta') ? horaVueltaFormatted : null
    };
    
    this.flightSearchService.searchFlights(request, false).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response: IFlightSearchResultDTO) => {
        this.isLoading = false;
        this.flightOffersRaw = response.flightPacks || [];
        this.flightOffersRaw = this.removeDuplicateFlightPacks(this.flightOffersRaw);
        
        this.flightOffersRaw.forEach(flightPack => {
          if (flightPack.flights && flightPack.flights.length > 0) {
            const isIda = (flightTypeId: number): boolean => {
              return flightTypeId === FlightTypeId.IDA_NEW || flightTypeId === FlightTypeId.IDA_LEGACY;
            };
            
            flightPack.flights.sort((a, b) => {
              const idA = a.flightTypeId ?? 0;
              const idB = b.flightTypeId ?? 0;
              const aIsIda = isIda(idA);
              const bIsIda = isIda(idB);
              
              if (aIsIda && !bIsIda) return -1;
              if (!aIsIda && bIsIda) return 1;
              
              return idA - idB;
            });
          }
        });
        
        this.hasSearchWarnings = response.hasWarnings || false;
        this.isEmptySearchResult = response.isEmptyResult || false;
        
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
        
        this.adaptedFlightPacks = this.flightOffersRaw.map(flightPack => this.adaptFlightPackForFlightItem(flightPack));
        
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
        
        const errorMessage = this.extractErrorMessage(err);
        
        if (this.isAirportNotAllowedError(errorMessage)) {
          this.errorMessage = this.formatAirportNotAllowedMessage(errorMessage);
        } else {
        this.errorMessage = 'Ocurrió un error al buscar vuelos. Por favor, inténtalo de nuevo.';
          if (errorMessage) {
            this.errorMessage += ` ${errorMessage}`;
          }
        }
      },
    });
  }

  getCityCode(cityName: string): string {
    const city = this.filteredCities.find(
      (c) => c.nombre.toLowerCase() === cityName.toLowerCase()
    );
    // Retorna vacío si no se encuentra la ciudad
    return city ? city.codigo : '';
  }

  filterOffers() {
    const formValue = this.flightForm.value;
    
    if (formValue.escala) {
      this.loadFlightDetailsAndFilter();
      return;
    }
    
    this.sortFlights(this.selectedSortOption);
    
    if (!this.hasPendingCities()) {
      this.displayFlights();
    } else {
      this.preloadAllAirportCities().then(() => {
        this.displayFlights();
      });
    }
  }

  private displayFlights(): void {
    this.flightOffersRaw.forEach(flightPack => {
      if (flightPack.flights && flightPack.flights.length > 0) {
        const isIda = (flightTypeId: number): boolean => {
          return flightTypeId === FlightTypeId.IDA_NEW || flightTypeId === FlightTypeId.IDA_LEGACY;
        };
        
        flightPack.flights.sort((a, b) => {
          const idA = a.flightTypeId ?? 0;
          const idB = b.flightTypeId ?? 0;
          const aIsIda = isIda(idA);
          const bIsIda = isIda(idB);
          
          if (aIsIda && !bIsIda) return -1;
          if (!aIsIda && bIsIda) return 1;
          
          return idA - idB;
        });
      }
    });
    
    this.adaptedFlightPacks = this.flightOffersRaw.map(flightPack => this.adaptFlightPackForFlightItem(flightPack));
    this.transformedFlights = this.transformOffersToFlightFormat(this.flightOffersRaw);
    this.filteredFlightsChange.emit(this.transformedFlights);
  }

  getFlightDetails(consolidatorSearchId: number, amadeusFlightId: string): Observable<IFlightDetailDTO> {
    return this.flightSearchService.getFlightDetails(consolidatorSearchId, amadeusFlightId);
  }

  loadFlightDetailsAndFilter(): void {
    if (!this.flightOffersRaw || this.flightOffersRaw.length === 0) return;

    const formValue = this.flightForm.value;
    if (!formValue.escala) {
      this.filterOffers();
      return;
    }

    this.isLoadingDetails = true;
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
        this.applyScaleFilters(flightDetails);
      },
      error: (err) => {
        this.isLoadingDetails = false;
        this.filterOffers();
      }
    });
  }

  private applyScaleFilters(flightDetails: IFlightDetailDTO[]): void {
    const formValue = this.flightForm.value;
    
    this.flightOffersRaw = this.flightOffersRaw.filter((flightPack) => {
      if (!flightPack.flights || flightPack.flights.length === 0) return false;
      
      const outboundFlight = flightPack.flights.find(f => 
        f.flightTypeId === FlightTypeId.IDA_NEW || f.flightTypeId === FlightTypeId.IDA_LEGACY
      );
      if (!outboundFlight) return false;
      
      return true;
    });
    
    this.flightOffersRaw.forEach(flightPack => {
      if (flightPack.flights && flightPack.flights.length > 0) {
        const isIda = (flightTypeId: number): boolean => {
          return flightTypeId === FlightTypeId.IDA_NEW || flightTypeId === FlightTypeId.IDA_LEGACY;
        };
        
        flightPack.flights.sort((a, b) => {
          const idA = a.flightTypeId ?? 0;
          const idB = b.flightTypeId ?? 0;
          const aIsIda = isIda(idA);
          const bIsIda = isIda(idB);
          
          if (aIsIda && !bIsIda) return -1;
          if (!aIsIda && bIsIda) return 1;
          
          return idA - idB;
        });
      }
    });
    
    this.sortFlights(this.selectedSortOption);
    
    if (!this.hasPendingCities()) {
      this.displayFlights();
    } else {
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
      
      if (!this.hasPendingCities()) {
        this.displayFlights();
      } else {
        this.preloadAllAirportCities().then(() => {
          this.displayFlights();
        });
      }
    }
  }

  private removeDuplicateFlightPacks(flightPacks: IFlightPackDTO[]): IFlightPackDTO[] {
    const seen = new Set<string>();
    const uniquePacks: IFlightPackDTO[] = [];
    
    for (const pack of flightPacks) {
      const price = pack.ageGroupPrices?.[0]?.price || 0;
      const flightIds = pack.flights?.map(f => f.id).sort().join(',') || '';
      const key = `${price}_${flightIds}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        uniquePacks.push(pack);
      }
    }
    
    return uniquePacks;
  }

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
      const outboundFlight = flightPack.flights?.find(f => 
        f.flightTypeId === FlightTypeId.IDA_NEW || f.flightTypeId === FlightTypeId.IDA_LEGACY
      );
      const inboundFlight = flightPack.flights?.find(f => 
        f.flightTypeId === FlightTypeId.VUELTA_NEW || f.flightTypeId === FlightTypeId.VUELTA_LEGACY
      );

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
    if (flightPack && typeof flightPack === 'object') {
      const originalFlight = this.flightOffersRaw.find(f => f.id === flightPack.id);
      if (originalFlight) {
        this.selectFlightFromFlightItem(originalFlight);
      }
    }
  }

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
          // Silent error handling
        },
      });
  }

  selectFlightFromFlightItem(flightPack: IFlightPackDTO): void {

    if (this.selectedFlight === flightPack) {
      this.selectedFlight = null;

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
      this.selectedFlight = flightPack;
      
      const basePrice =
        flightPack.ageGroupPrices?.find(
          (price) => price.ageGroupId === this.travelers[0]?.ageGroupId
        )?.price || 0;
      const totalTravelers = this.travelers.length;
      const totalPrice = totalTravelers > 0 ? basePrice * totalTravelers : 0;

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
    }
  }

  trackByFlightId(index: number, flightPack: IFlightsNetFlightPackDTO): number {
    return flightPack.id;
  }

  adaptFlightPackForFlightItem(flightPack: IFlightPackDTO): IFlightsNetFlightPackDTO {
    const adaptedFlights = (flightPack.flights?.map(flight => ({
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
    })) || []);

    const isIda = (flightTypeId: number): boolean => {
      return flightTypeId === FlightTypeId.IDA_NEW || flightTypeId === FlightTypeId.IDA_LEGACY;
    };
    
    adaptedFlights.sort((a, b) => {
      const idA = a.flightTypeId ?? 0;
      const idB = b.flightTypeId ?? 0;
      const aIsIda = isIda(idA);
      const bIsIda = isIda(idB);
      
      if (aIsIda && !bIsIda) return -1;
      if (!aIsIda && bIsIda) return 1;
      
      return idA - idB;
    });

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
      flights: adaptedFlights
    };

    return adaptedObject;
  }

  isFlightSelected(flightPack: IFlightsNetFlightPackDTO): boolean {
    return this.selectedFlight !== null && this.selectedFlight.id === flightPack.id;
  }

  getSelectionButtonText(flightPack: IFlightsNetFlightPackDTO): string {
    return this.isFlightSelected(flightPack) ? 'Seleccionado' : 'Seleccionar';
  }

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

  /**
   * Formatea una fecha Date a string en formato YYYY-MM-DD para la API
   * @param date Fecha a formatear
   * @returns String en formato YYYY-MM-DD o null si la fecha no es válida
   */
  private formatDateForAPI(date: Date | string | null): string | null {
    if (!date) return null;
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return null;
      
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch {
      return null;
    }
  }

  /**
   * Formatea la hora de un Date a string en formato HH:mm para la API
   * @param date Fecha con hora a formatear
   * @returns String en formato HH:mm o null si la fecha no es válida
   */
  private formatTimeForAPI(date: Date | string | null): string | null {
    if (!date) return null;
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return null;
      
      const hours = String(dateObj.getHours()).padStart(2, '0');
      const minutes = String(dateObj.getMinutes()).padStart(2, '0');
      
      return `${hours}:${minutes}`;
    } catch {
      return null;
    }
  }

  /**
   * Formatea una hora string (HH:MM:SS o HH:MM) a formato HH:MM para mostrar en mensajes
   * @param timeString Hora en formato HH:MM:SS o HH:MM
   * @returns String en formato HH:MM o null si la hora no es válida
   */
  private formatTimeForDisplay(timeString: string | null | undefined): string | null {
    if (!timeString) return null;
    
    try {
      // Si tiene formato HH:MM:SS, tomar solo HH:MM
      if (timeString.length >= 5 && timeString.indexOf(':') !== -1) {
        const parts = timeString.split(':');
        if (parts.length >= 2) {
          const hours = parts[0].padStart(2, '0');
          const minutes = parts[1].padStart(2, '0');
          return `${hours}:${minutes}`;
        }
      }
      return timeString;
    } catch {
      return null;
    }
  }

  /**
   * Combina una fecha Date con una hora en formato string (HH:mm) en un Date completo
   * @param date Fecha base
   * @param timeString Hora en formato HH:mm
   * @returns Date combinado o null si hay error
   */
  private combineDateAndTime(date: Date | null, timeString: string | null): Date | null {
    if (!date || !timeString) return date;
    
    try {
      const [hours, minutes] = timeString.split(':').map(Number);
      if (isNaN(hours) || isNaN(minutes)) return date;
      
      const combinedDate = new Date(date);
      combinedDate.setHours(hours, minutes, 0, 0);
      return combinedDate;
    } catch {
      return date;
    }
  }

  /**
   * Validador personalizado para fecha/hora de ida
   * Valida que la fecha/hora seleccionada no exceda el límite máximo configurado
   */
  private validateFechaHoraIda = (control: AbstractControl): ValidationErrors | null => {
    const fechaHora = control.value;
    if (!fechaHora || !this.maxFechaIda) {
      return null;
    }

    try {
      const selectedDate = new Date(fechaHora);
      const maxDate = new Date(this.maxFechaIda);

      // Si hay hora máxima configurada, incluirla en la comparación
      if (this.maxHoraIda) {
        const [maxHours, maxMinutes] = this.maxHoraIda.split(':').map(Number);
        if (!isNaN(maxHours) && !isNaN(maxMinutes)) {
          maxDate.setHours(maxHours, maxMinutes, 59, 999);
        }
      } else {
        maxDate.setHours(23, 59, 59, 999);
      }

      if (selectedDate > maxDate) {
        return { fechaHoraIdaExceedsMax: true };
      }

      return null;
    } catch {
      return null;
    }
  };

  /**
   * Validador personalizado para fecha/hora de vuelta
   * Valida que la fecha/hora seleccionada no sea anterior al límite mínimo configurado
   */
  private validateFechaHoraVuelta = (control: AbstractControl): ValidationErrors | null => {
    const fechaHora = control.value;
    if (!fechaHora || !this.minFechaVuelta) {
      return null;
    }

    try {
      const selectedDate = new Date(fechaHora);
      const minDate = new Date(this.minFechaVuelta);

      // Si hay hora mínima configurada, incluirla en la comparación
      if (this.minHoraVuelta) {
        const [minHours, minMinutes] = this.minHoraVuelta.split(':').map(Number);
        if (!isNaN(minHours) && !isNaN(minMinutes)) {
          minDate.setHours(minHours, minMinutes, 0, 0);
        }
      } else {
        minDate.setHours(0, 0, 0, 0);
      }

      if (selectedDate < minDate) {
        return { fechaHoraVueltaBeforeMin: true };
      }

      return null;
    } catch {
      return null;
    }
  };

  /**
   * Validador requerido condicional para fecha/hora de ida
   * El campo es requerido si el tipo de viaje es 'Ida' o 'IdaVuelta'
   */
  private validateRequiredFechaHoraIda = (control: AbstractControl): ValidationErrors | null => {
    const tipoViaje = this.flightForm?.get('tipoViaje')?.value;
    const fechaHora = control.value;
    
    if ((tipoViaje === 'Ida' || tipoViaje === 'IdaVuelta') && !fechaHora) {
      return { required: true };
    }
    
    return null;
  };

  /**
   * Validador requerido condicional para fecha/hora de vuelta
   * El campo es requerido si el tipo de viaje es 'Vuelta' o 'IdaVuelta'
   */
  private validateRequiredFechaHoraVuelta = (control: AbstractControl): ValidationErrors | null => {
    const tipoViaje = this.flightForm?.get('tipoViaje')?.value;
    const fechaHora = control.value;
    
    if ((tipoViaje === 'Vuelta' || tipoViaje === 'IdaVuelta') && !fechaHora) {
      return { required: true };
    }
    
    return null;
  };

  /**
   * Extrae el mensaje de error de la respuesta HTTP
   */
  private extractErrorMessage(error: any): string {
    if (!error) return '';
    
    // Intentar obtener el mensaje desde error.error (común en Angular HttpClient)
    if (error.error) {
      // Si es un objeto con mensaje
      if (typeof error.error === 'object') {
        if (error.error.message) return error.error.message;
        if (error.error.error) return error.error.error;
        // Si tiene una propiedad que parezca un mensaje
        const messageKeys = ['Message', 'message', 'Error', 'error', 'detail', 'Detail'];
        for (const key of messageKeys) {
          if (error.error[key]) return error.error[key];
        }
      }
      // Si es un string directamente
      if (typeof error.error === 'string') return error.error;
    }
    
    // Intentar desde error.message
    if (error.message) return error.message;
    
    // Intentar desde error.statusText
    if (error.statusText) return error.statusText;
    
    return '';
  }

  /**
   * Detecta si el error es de aeropuerto no permitido
   */
  private isAirportNotAllowedError(errorMessage: string): boolean {
    if (!errorMessage) return false;
    
    const lowerMessage = errorMessage.toLowerCase();
    return lowerMessage.includes('no están permitidos') || 
           lowerMessage.includes('no estan permitidos') ||
           lowerMessage.includes('no esta permitido') ||
           lowerMessage.includes('no está permitido');
  }

  /**
   * Formatea el mensaje de error de aeropuerto no permitido para mostrarlo al usuario
   */
  private formatAirportNotAllowedMessage(errorMessage: string): string {
    return 'Los aeropuertos que seleccionaste no están permitidos para esta búsqueda. Por favor, selecciona otro aeropuerto.';
  }

  /**
   * Maneja el evento cuando se muestra el datepicker de fecha de vuelta
   * Establece temporalmente el valor a la fecha mínima solo para que el calendario muestre el mes correcto
   */
  onFechaVueltaPickerShow(): void {
    const fechaHoraVueltaControl = this.flightForm.get('fechaHoraVuelta');
    if (fechaHoraVueltaControl && !fechaHoraVueltaControl.value && this.defaultDateFechaVuelta) {
      // Establecer temporalmente la fecha por defecto para que el calendario muestre el mes correcto
      fechaHoraVueltaControl.setValue(this.defaultDateFechaVuelta, { emitEvent: false });
      this.fechaVueltaTemporalEstablecida = true;
    }
  }

  /**
   * Maneja cuando el usuario selecciona una fecha en el datepicker
   * Si había un valor temporal, ya no es temporal
   */
  onFechaVueltaSelect(): void {
    this.fechaVueltaTemporalEstablecida = false;
  }

  /**
   * Maneja el evento cuando se cierra el datepicker de fecha de vuelta
   * Limpia el valor temporal si el usuario no seleccionó nada
   */
  onFechaVueltaPickerHide(): void {
    const fechaHoraVueltaControl = this.flightForm.get('fechaHoraVuelta');
    if (fechaHoraVueltaControl && this.fechaVueltaTemporalEstablecida) {
      // Si el valor sigue siendo el mismo que establecimos temporalmente, limpiarlo
      if (fechaHoraVueltaControl.value && 
          this.defaultDateFechaVuelta &&
          fechaHoraVueltaControl.value.getTime() === this.defaultDateFechaVuelta.getTime()) {
        fechaHoraVueltaControl.setValue(null, { emitEvent: false });
      }
      this.fechaVueltaTemporalEstablecida = false;
    }
  }

  isFechaHoraIdaRequired(): boolean {
    const tipoViaje = this.flightForm?.get('tipoViaje')?.value;
    return tipoViaje === 'Ida' || tipoViaje === 'IdaVuelta';
  }

  isFechaHoraVueltaRequired(): boolean {
    const tipoViaje = this.flightForm?.get('tipoViaje')?.value;
    return tipoViaje === 'Vuelta' || tipoViaje === 'IdaVuelta';
  }

  isOrigenRequired(): boolean {
    return true;
  }

  private validateFlightDatesBeforeSearch(
    tipoViaje: 'Ida' | 'Vuelta' | 'IdaVuelta',
    fechaHoraIda: Date | null,
    fechaHoraVuelta: Date | null,
    fechaIdaFormatted: string | null,
    horaIdaFormatted: string | null,
    fechaVueltaFormatted: string | null,
    horaVueltaFormatted: string | null
  ): string | null {
    const errors: string[] = [];

    if (tipoViaje === 'Ida' || tipoViaje === 'IdaVuelta') {
      if (fechaIdaFormatted && horaIdaFormatted) {
        const hasStringLimit = !!(this.fechaIdaConstante && this.fechaIdaConstante.trim() !== '');
        
        if (hasStringLimit) {
          try {
            const maxFechaStr = this.fechaIdaConstante;
            const maxHoraStr = this.formatTimeForDisplay(this.horaIdaConstante) || '23:59';
            
            if (fechaIdaFormatted > maxFechaStr || 
                (fechaIdaFormatted === maxFechaStr && horaIdaFormatted > maxHoraStr)) {
              errors.push(
                `La fecha/hora de ida (${fechaIdaFormatted} ${horaIdaFormatted}) excede el límite máximo permitido (${maxFechaStr} ${maxHoraStr}).`
              );
            }
          } catch (error) {
            errors.push('Error al validar la fecha de ida.');
          }
        }
      }
    }

    if (tipoViaje === 'Vuelta' || tipoViaje === 'IdaVuelta') {
      if (fechaVueltaFormatted && horaVueltaFormatted) {
        const hasStringLimit = !!(this.fechaRegresoConstante && this.fechaRegresoConstante.trim() !== '');
        
        if (hasStringLimit) {
          try {
            const minFechaStr = this.fechaRegresoConstante;
            const minHoraStr = this.formatTimeForDisplay(this.horaRegresoConstante) || '00:00';
            
            if (fechaVueltaFormatted < minFechaStr || 
                (fechaVueltaFormatted === minFechaStr && horaVueltaFormatted < minHoraStr)) {
              errors.push(
                `La fecha y hora de salida (${fechaVueltaFormatted} ${horaVueltaFormatted}) es anterior al límite mínimo permitido (${minFechaStr} ${minHoraStr}).`
              );
            }
          } catch (error) {
            errors.push('Error al validar la fecha y hora de salida.');
          }
        }
      }
    }

    return errors.length > 0 ? errors.join(' ') : null;
  }
}
