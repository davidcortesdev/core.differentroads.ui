import { Component, EventEmitter, Input, OnInit, Output, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { forkJoin, of, Subject, Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ITempFlightOffer } from '../../../../../core/models/amadeus/flight.types';
import { FlightSegment, Flight } from '../../../../../core/models/tours/flight.model';
import { AmadeusService } from '../../../../../core/services/amadeus.service';
import { TextsService } from '../../../../../core/services/checkout/texts.service';
import { TravelersService } from '../../../../../core/services/checkout/travelers.service';
import { DepartureConsolidadorSearchLocationService, ConsolidadorSearchLocationWithSourceResponse } from '../../../../../core/services/departure/departure-consolidador-search-location.service';
import { DepartureService, DepartureAirportTimesResponse } from '../../../../../core/services/departure/departure.service';
import { LocationAirportNetService } from '../../../../../core/services/locations/locationAirportNet.service';
import { LocationNetService } from '../../../../../core/services/locations/locationNet.service';
import { FlightSearchService, FlightSearchRequest, IFlightPackDTO, IFlightDetailDTO, IFlightSearchResultDTO, IFlightSearchWarning, IFlightSearchMeta } from '../../../../../core/services/flight-search.service';
import { IFlightPackDTO as IFlightsNetFlightPackDTO } from '../../../services/flightsNet.service';
import { ReservationTravelerService, IReservationTravelerResponse } from '../../../../../core/services/reservation/reservation-traveler.service';
import { ReservationTravelerActivityPackService, IReservationTravelerActivityPackResponse } from '../../../../../core/services/reservation/reservation-traveler-activity-pack.service';
import { FlightSelectionState } from '../../../types/flight-selection-state';
import { AirportCityCacheService } from '../../../../../core/services/airport-city-cache.service';

interface Ciudad {
  nombre: string;
  codigo: string;
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
  @Input() flights: Flight[] = [];
  @Input() departureId: number | null = null;
  @Input() reservationId: number | null = null;
  @Input() selectedFlightFromParent: IFlightPackDTO | null = null; // Nuevo input para sincronización con el padre

  // Propiedades públicas
  flightForm: FormGroup;
  tipoViaje: 'Ida' | 'Vuelta' | 'IdaVuelta' = 'IdaVuelta';
  equipajeMano = false;
  equipajeBodega = false;
  tourOrigenConstante: Ciudad = { nombre: '', codigo: '' };
  tourDestinoConstante: Ciudad = { nombre: 'Madrid', codigo: 'MAD' };
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
  flightOffers: ITempFlightOffer[] = [];
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
    private readonly amadeusService: AmadeusService,
    private readonly travelersService: TravelersService,
    private readonly textsService: TextsService,
    private readonly departureConsolidadorSearchLocationService: DepartureConsolidadorSearchLocationService,
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
    console.log('ngOnChanges - specific-search:', changes);
    if (changes['departureId'] && changes['departureId'].currentValue && 
        changes['departureId'].currentValue !== changes['departureId'].previousValue) {
      console.log('🔄 Recargando datos de specific-search');
      this.loadCombinedCities();
      this.loadAirportTimes();
    }

    // Nuevo: Actualizar selectedFlight cuando cambie desde el padre
    if (
      changes['selectedFlightFromParent'] &&
      changes['selectedFlightFromParent'].currentValue !==
        changes['selectedFlightFromParent'].previousValue
    ) {
      console.log('🔄 selectedFlightFromParent cambió');
      console.log(
        '📊 Valor anterior:',
        changes['selectedFlightFromParent'].previousValue
      );
      console.log(
        '📊 Valor actual:',
        changes['selectedFlightFromParent'].currentValue
      );
      console.log('🔄 Actualizando selectedFlight interno...');

      this.selectedFlight = changes['selectedFlightFromParent'].currentValue;

      // Solo guardar asignaciones si NO es una selección interna
      if (
        !this.isInternalSelection &&
        this.selectedFlight &&
        this.reservationId
      ) {
        console.log(
          '💾 Guardando asignaciones para vuelo seleccionado desde padre...'
        );
        console.log('🎯 Vuelo seleccionado:', this.selectedFlight);
        console.log('🆔 reservationId:', this.reservationId);
        console.log('📍 Origen: default-flights (padre)');

        this.saveFlightAssignments()
          .then((success) => {
            if (success) {
              console.log('✅ Asignaciones guardadas exitosamente desde padre');
            } else {
              console.error('❌ Error al guardar asignaciones desde padre');
            }
          })
          .catch((error) => {
            console.error(
              '💥 Error al guardar asignaciones desde padre:',
              error
            );
          });
      } else {
        if (this.isInternalSelection) {
          console.log(
            '⚠️ No se guardan asignaciones - es una selección interna'
          );
        } else {
          console.log(
            '⚠️ No se puede guardar - selectedFlight o reservationId faltan'
          );
          console.log('📊 selectedFlight:', this.selectedFlight);
          console.log('🆔 reservationId:', this.reservationId);
        }
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
    this.departureConsolidadorSearchLocationService.getCombinedLocations(this.departureId!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: ConsolidadorSearchLocationWithSourceResponse[]) => {
          const locationIds = data.filter(item => typeof item.locationId === 'number').map(item => item.locationId as number);
          const airportIds = data.filter(item => typeof item.locationAirportId === 'number').map(item => item.locationAirportId as number);
          forkJoin({
            locations: locationIds.length ? this.locationNetService.getLocationsByIds(locationIds) : of([]),
            airports: airportIds.length ? this.locationAirportNetService.getAirportsByIds(airportIds) : of([])
          }).pipe(takeUntil(this.destroy$)).subscribe(({ locations, airports }) => {
            const locationMap = new Map(locations.map((l: any) => [l.id, l]));
            const airportMap = new Map(airports.map((a: any) => [a.id, a]));
            this.combinedCities = data.map(item => {
              if (item.locationId && locationMap.has(item.locationId)) {
                const loc = locationMap.get(item.locationId);
                return {
                  nombre: loc && loc.name ? loc.name : '',
                  codigo: loc && loc.iataCode ? String(loc.iataCode) : (loc && loc.code ? String(loc.code) : ''),
                  source: item.source,
                  id: item.id
                };
              } else if (item.locationAirportId && airportMap.has(item.locationAirportId)) {
                const airport = airportMap.get(item.locationAirportId);
                return {
                  nombre: airport && airport.name ? airport.name : '',
                  codigo: airport && airport.iata ? String(airport.iata) : '',
                  source: item.source,
                  id: item.id
                };
              } else {
                return {
                  nombre: '',
                  codigo: '',
                  source: item.source,
                  id: item.id
                };
              }
            });
          });
        },
        error: () => {
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
          console.error('Error obteniendo datos de aeropuerto:', err);
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
      console.error('Faltan departureId o reservationId');
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
    const originCode = formValue.origen?.codigo || null;
    const destinationCode = formValue.origen?.codigo || null;

    const request: FlightSearchRequest = {
      departureId: this.departureId!,
      reservationId: this.reservationId || 0,
      tipoViaje: tipoViaje,
      iataOrigen: originCode,
      iataDestino: destinationCode
    };
    
    // Pasar autoSearch=false para evitar llamadas automáticas que causen bucles
    this.flightSearchService.searchFlights(request, false).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response: IFlightSearchResultDTO) => {
        this.isLoading = false;
        
        // Extraer los flightPacks de la nueva respuesta
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
            console.warn('Error al parsear warnings JSON:', error);
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
            console.warn('Error al parsear meta JSON:', error);
            this.searchMeta = null;
          }
        } else {
          this.searchMeta = null;
        }
        
        // Log de información de la búsqueda
        if (this.hasSearchWarnings && this.searchWarnings.length > 0) {
          console.warn('⚠️ La búsqueda tiene warnings:', this.searchWarnings);
          this.searchWarnings.forEach(warning => {
            console.warn(`  - ${warning.title}: ${warning.detail} (Status: ${warning.status}, Code: ${warning.code})`);
          });
        }
        if (this.isEmptySearchResult) {
          console.log('ℹ️ La búsqueda no retornó resultados');
        }
        if (this.searchMeta) {
          console.log('📊 Meta información de búsqueda:', this.searchMeta);
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
        console.error('Error al buscar vuelos:', err);
      },
    });
  }

  getCityCode(cityName: string): string {
    const city = this.filteredCities.find(
      (c) => c.nombre.toLowerCase() === cityName.toLowerCase()
    );
    return city ? city.codigo : 'MAD';
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
      console.log('⏳ Esperando a que se carguen las ciudades antes de mostrar vuelos...');
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
    
    console.log('✅ Vuelos mostrados con nombres de ciudades cargados');
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
        console.error('Error al cargar detalles de vuelos:', err);
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
      console.log('⏳ Esperando a que se carguen las ciudades antes de mostrar vuelos filtrados...');
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
        console.log('⏳ Esperando a que se carguen las ciudades antes de mostrar vuelos ordenados...');
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
        source: 'amadeus',
      };

      return flight;
    });
  }

  getCityName(cityName: string): string {
    const city = this.filteredCities.find(
      (c) => c.nombre.toLowerCase() === cityName.toLowerCase()
    );
    return city ? city.codigo : 'MAD';
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

  hasHandBaggage(offer: ITempFlightOffer): boolean {
    return offer.offerData.travelerPricings.some((tp: any) =>
      tp.fareDetailsBySegment.some(
        (seg: any) =>
          seg.includedCabinBags && seg.includedCabinBags.quantity > 0
      )
    );
  }

  hasCheckedBaggage(offer: ITempFlightOffer): boolean {
    return offer.offerData.travelerPricings.some((tp: any) =>
      tp.fareDetailsBySegment.some(
        (seg: any) =>
          seg.includedCheckedBags && seg.includedCheckedBags.quantity > 0
      )
    );
  }

  selectFlight(flightPack: any): void {
    // Convertir de vuelta al formato del FlightSearchService si es necesario
    if (flightPack && typeof flightPack === 'object') {
      // Buscar el vuelo original en flightOffersRaw
      const originalFlight = this.flightOffersRaw.find(f => f.id === flightPack.id);
      if (originalFlight) {
        this.selectFlightFromFlightItem(originalFlight);
      } else {
        console.warn('⚠️ No se encontró el vuelo original para seleccionar');
      }
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
          console.log('✅ Viajeros cargados:', travelers);
        },
        error: (error) => {
          console.error('❌ Error al cargar viajeros:', error);
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
    console.log('ℹ️ Verificación de selección de vuelo delegada al componente padre');
  }

  // Método para seleccionar/deseleccionar vuelos (similar a default-flights)
  selectFlightFromFlightItem(flightPack: IFlightPackDTO): void {
    console.log('🎯 selectFlightFromFlightItem llamado');
    console.log('📦 flightPack:', flightPack);
    console.log('🔄 selectedFlight actual:', this.selectedFlight);
    console.log('🕐 Timestamp:', new Date().toISOString());
    console.log('📍 Origen: specific-search (interno)');

    if (this.selectedFlight === flightPack) {
      console.log('🔄 Deseleccionando vuelo actual');
      this.selectedFlight = null;
      
      // Deseleccionar usando el FlightSearchService
      if (this.reservationId) {
        this.flightSearchService.unselectAllFlights(this.reservationId).subscribe({
          next: () => {
            console.log('✅ Vuelo deseleccionado exitosamente en el servicio');
          },
          error: (error) => {
            console.error('❌ Error al deseleccionar vuelo en el servicio:', error);
          }
        });
      }
      
      this.flightSelectionChange.emit({ 
        selectedFlight: null, 
        totalPrice: 0, 
        source: 'specific', 
        packId: null 
      });
    } else {
      console.log('✅ Seleccionando nuevo vuelo');
      this.selectedFlight = flightPack;
      const basePrice =
        flightPack.ageGroupPrices?.find(
          (price) => price.ageGroupId === this.travelers[0]?.ageGroupId
        )?.price || 0;
      const totalTravelers = this.travelers.length;
      const totalPrice = totalTravelers > 0 ? basePrice * totalTravelers : 0;

      console.log('💰 Precio base:', basePrice);
      console.log('👥 Total de viajeros:', totalTravelers);
      console.log('💰 Precio total:', totalPrice);

      // Marcar como selección interna antes de emitir el cambio
      this.isInternalSelection = true;

      // Seleccionar usando el FlightSearchService
      if (this.reservationId) {
        this.flightSearchService.selectFlight(this.reservationId, flightPack.id).subscribe({
          next: () => {
            console.log('✅ Vuelo seleccionado exitosamente en el servicio');
          },
          error: (error) => {
            console.error('❌ Error al seleccionar vuelo en el servicio:', error);
          }
        });
      }

      this.flightSelectionChange.emit({
        selectedFlight: flightPack,
        totalPrice: basePrice,
        source: 'specific',
        packId: flightPack.id
      });

      console.log('💾 Guardando asignaciones de vuelo...');
      this.saveFlightAssignments()
        .then((success: boolean) => {
          if (success) {
            console.log(
              '✅ Asignaciones guardadas exitosamente desde selectFlightFromFlightItem'
            );
          } else {
            console.error(
              '❌ Error al guardar asignaciones desde selectFlightFromFlightItem'
            );
          }
        })
        .catch((error: any) => {
          console.error(
            '💥 Error al guardar asignaciones desde selectFlightFromFlightItem:',
            error
          );
        });
    }
  }

  // Método para guardar asignaciones de vuelos (similar a default-flights)
  async saveFlightAssignments(): Promise<boolean> {
    console.log('🔍 saveFlightAssignments llamado');
    console.log('📊 selectedFlight:', this.selectedFlight);
    console.log('🆔 reservationId:', this.reservationId);
    console.log('🕐 Timestamp:', new Date().toISOString());

    if (!this.selectedFlight || !this.reservationId) {
      console.log(
        '❌ No se puede guardar - selectedFlight o reservationId faltan'
      );
      return true;
    }

    try {
      console.log('👥 Obteniendo viajeros...');
      const travelers = await new Promise<IReservationTravelerResponse[]>(
        (resolve, reject) => {
          this.reservationTravelerService
            .getAll({ reservationId: this.reservationId! })
            .subscribe({
              next: (travelers) => {
                console.log('✅ Viajeros obtenidos:', travelers);
                console.log('👥 Cantidad de viajeros:', travelers.length);
                resolve(travelers);
              },
              error: (error) => {
                console.error('❌ Error al obtener viajeros:', error);
                reject(error);
              },
            });
        }
      );

      if (travelers.length === 0) {
        console.log('⚠️ No hay viajeros para asignar');
        return true;
      }

      const activityPackId = this.selectedFlight.id;
      console.log('🎯 ID del paquete de actividad a asignar:', activityPackId);

      console.log(
        '📝 Procesando asignaciones para',
        travelers.length,
        'viajeros...'
      );

      // Crear nuevas asignaciones para todos los viajeros
      const assignmentPromises = travelers.map((traveler) => {
        return new Promise<boolean>((resolve, reject) => {
          console.log(
            `➕ Creando nueva asignación para viajero ${traveler.id}`
          );

          const assignmentData = {
            id: 0,
            reservationTravelerId: traveler.id,
            activityPackId: activityPackId,
            createdAt: new Date().toISOString(),
          };
          console.log(`➕ Datos para nueva asignación:`, assignmentData);

          this.reservationTravelerActivityPackService
            .create(assignmentData)
            .subscribe({
              next: (
                createdAssignment: IReservationTravelerActivityPackResponse
              ) => {
                console.log(
                  `✅ Nueva asignación creada para viajero ${traveler.id}:`,
                  createdAssignment
                );
                console.log(
                  `✅ ID de nueva asignación:`,
                  createdAssignment.id
                );

                resolve(true);
              },
              error: (error: any) => {
                console.error(
                  `❌ Error al crear asignación para viajero ${traveler.id}:`,
                  error
                );
                reject(error);
              },
            });
        });
      });

      console.log('⏳ Esperando que se completen todas las asignaciones...');
      await Promise.all(assignmentPromises);
      console.log('✅ Todas las asignaciones creadas exitosamente');

      return true;
    } catch (error) {
      console.error('💥 Error en saveFlightAssignments:', error);
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
