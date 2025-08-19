import { Component, EventEmitter, Input, OnInit, Output, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { forkJoin, of, Subject } from 'rxjs';
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
import { FlightSearchService, FlightSearchRequest, IFlightPackDTO } from '../../../../../core/services/flight-search.service';

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
  @Input() flights: Flight[] = [];
  @Input() departureId: number | null = null;
  @Input() reservationId: number | null = null;

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
  filteredOffers: IFlightPackDTO[] = [];
  isLoading = false;
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
  errorMessage = '';

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
    private readonly flightSearchService: FlightSearchService
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
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('ngOnChanges - specific-search:', changes);
    if (changes['departureId'] && changes['departureId'].currentValue && 
        changes['departureId'].currentValue !== changes['departureId'].previousValue) {
      console.log('🔄 Recargando datos de specific-search');
      this.loadCombinedCities();
      this.loadAirportTimes();
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
    
    this.flightSearchService.searchFlights(request).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response: IFlightPackDTO[]) => {
        this.isLoading = false;
        this.flightOffersRaw = response;
        this.filterOffers();
      },
      error: (err: any) => {
        this.isLoading = false;
        this.flightOffersRaw = [];
        this.filteredOffers = [];
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
    
    // Filtrar por escalas si se especifica
    if (formValue.escala) {
      this.flightOffersRaw = this.flightOffersRaw.filter((flightPack) => {
        if (!flightPack.flights || flightPack.flights.length === 0) return false;
        
        // Contar escalas basándose en el primer vuelo (ida)
        const outboundFlight = flightPack.flights.find(f => f.flightTypeId === 4); // IDA
        if (!outboundFlight) return false;
        
        // Por ahora asumimos que no hay escalas detalladas, pero podríamos implementar lógica más compleja
        // basada en los datos de stopovers si están disponibles
        const hasStops = outboundFlight.stopovers && outboundFlight.stopovers.length > 0;
        
        switch (formValue.escala) {
          case 'directos':
            return !hasStops;
          case 'unaEscala':
            return hasStops && outboundFlight.stopovers!.length === 1;
          case 'multiples':
            return hasStops && outboundFlight.stopovers!.length >= 2;
          default:
            return true;
        }
      });
    }
    
    this.sortFlights(this.selectedSortOption);
    this.transformedFlights = this.transformOffersToFlightFormat(this.flightOffersRaw);
    this.filteredFlightsChange.emit(this.transformedFlights);
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
    if (this.filteredOffers.length > 0) {
      this.sortFlights(this.selectedSortOption);
      this.transformedFlights = this.transformOffersToFlightFormat(this.filteredOffers);
      this.filteredFlightsChange.emit(this.transformedFlights);
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

  getCityName(iataCode: string): string | null {
    const city = this.filteredCities.find((c) => c.codigo === iataCode);
    return city ? city.nombre.split(' - ')[0] : null;
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
      this.selectedFlight = flightPack;
      console.log('Vuelo seleccionado:', flightPack);
    }
  }

  trackByFlightId(index: number, flightPack: IFlightPackDTO): number {
    return flightPack.id;
  }

  // Adaptador para convertir IFlightPackDTO del FlightSearchService al formato esperado por app-flight-item
  adaptFlightPackForFlightItem(flightPack: IFlightPackDTO): any {
    return {
      id: flightPack.id,
      code: flightPack.code || '',
      name: flightPack.name || '',
      description: flightPack.description || '',
      tkId: flightPack.tkId || '',
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
        departureCity: flight.departureCity || '',
        arrivalCity: flight.arrivalCity || ''
      })) || []
    };
  }

  isFlightSelected(flight: Flight): boolean {
    return flight.externalID === this.selectedFlightId;
  }

  searchCities(event: any): void {
    const query = event.query.toLowerCase();
    this.filteredCities = this.combinedCities.filter(city =>
      city.nombre.toLowerCase().includes(query) ||
      city.codigo.toLowerCase().includes(query)
    );
  }
}
