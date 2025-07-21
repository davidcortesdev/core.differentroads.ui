import { Component, EventEmitter, Input, OnInit, Output, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ITempFlightOffer, FlightOffersParams } from '../../../../../core/models/amadeus/flight.types';
import { FlightSegment } from '../../../../../core/models/tours/flight.model';
import { Flight } from '../../../../../core/models/tours/flight.model';
import { AirportService } from '../../../../../core/services/airport.service';
import { AmadeusService } from '../../../../../core/services/amadeus.service';
import { TextsService } from '../../../../../core/services/checkout/texts.service';
import { TravelersService } from '../../../../../core/services/checkout/travelers.service';
import { PeriodsService } from '../../../../../core/services/periods.service';
import { ToursService } from '../../../../../core/services/tours.service';
import { DepartureConsolidadorSearchLocationService, ConsolidadorSearchLocationWithSourceResponse } from '../../../../../core/services/departure/departure-consolidador-search-location.service';
import { DepartureService, DepartureAirportTimesResponse } from '../../../../../core/services/departure/departure.service';
import { LocationAirportNetService } from '../../../../../core/services/locations/locationAirportNet.service';
import { LocationNetService } from '../../../../../core/services/locations/locationNet.service';
import { forkJoin, of } from 'rxjs';


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
export class SpecificSearchComponent implements OnInit, OnDestroy {
  @Output() filteredFlightsChange = new EventEmitter<any[]>();
  @Input() flights: Flight[] = [];
  @Input() tourDestination: Ciudad = { nombre: '', codigo: '' };
  @Input() dayOne: string | null = null;
  @Input() returnDate: string | null = null;
  @Input() periodID: string | null = null;
  @Input() departureId: number | null = null;

  airportsFilters: string[] = [];
  private searchTimeout: any;
  flightForm: FormGroup;
  tipoViaje: string = 'idaVuelta';
  equipajeMano: boolean = false;
  equipajeBodega: boolean = false;
  tourOrigenConstante: Ciudad = { nombre: '', codigo: '' };
  tourDestinoConstante: Ciudad = { nombre: 'Madrid', codigo: 'MAD' };
  fechaIdaConstante: string = '';
  fechaRegresoConstante: string = '';
  horaIdaConstante: string = '';
  horaRegresoConstante: string = '';
  filteredCities: Ciudad[] = [];
  combinedCities: { nombre: string; codigo: string; source: string; id: number }[] = [];
  aerolineas: Ciudad[] = [
    { nombre: 'Todas', codigo: 'ALL' },
    { nombre: 'Royal Air Maroc', codigo: 'AT' },
    { nombre: 'TAP Air Portugal', codigo: 'TP' },
  ];
  escalaOptions = [
    { label: 'Directos', value: 'directos' },
    { label: '1 Escala', value: 'unaEscala' },
    { label: '2+ Escalas', value: 'multiples' },
  ];
  aerolineaOptions = this.aerolineas.map((a) => ({
    label: a.nombre,
    value: a.codigo,
  }));
  flightOffers: ITempFlightOffer[] = [];
  filteredOffers: ITempFlightOffer[] = [];
  isLoading: boolean = false;
  searchPerformed: boolean = false;
  selectedFlightId: string | null = null;
  transformedFlights: Flight[] = [];
  tourName: string = 'Destino';
  sortOptions = [
    { label: 'Precio (menor a mayor)', value: 'price-asc' },
    { label: 'Precio (mayor a menor)', value: 'price-desc' },
    { label: 'Duración (más corto)', value: 'duration' },
  ];
  selectedSortOption: string = 'price-asc';

  constructor(
    private fb: FormBuilder,
    private amadeusService: AmadeusService,
    private airportService: AirportService,
    private travelersService: TravelersService,
    private textsService: TextsService,
    private periodsService: PeriodsService,
    private toursService: ToursService,
    private departureConsolidadorSearchLocationService: DepartureConsolidadorSearchLocationService,
    private departureService: DepartureService, // <--- inyectar
    private locationAirportNetService: LocationAirportNetService, // <--- inyectar
    private locationNetService: LocationNetService // <--- inyectar
  ) {
    this.flightForm = this.fb.group({
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

  ngOnInit() {
    if (this.tourDestination && this.tourDestination.codigo) {
      this.tourOrigenConstante = this.tourDestination;
    }
    const tourTexts = this.textsService.getTextsForCategory('tour');
    if (tourTexts && tourTexts['name']) {
      this.tourName = tourTexts['name'];
    }
    this.flightForm.get('tipoViaje')?.valueChanges.subscribe((value) => {
      this.tipoViaje = value;
    });
    this.flightForm.get('equipajeMano')?.valueChanges.subscribe((value) => {
      this.equipajeMano = value;
    });
    this.flightForm.get('equipajeBodega')?.valueChanges.subscribe((value) => {
      this.equipajeBodega = value;
    });
    this.travelersService.travelersNumbers$.subscribe((travelersNumbers: any) => {
      this.flightForm.patchValue({
        adults: travelersNumbers.adults,
        children: travelersNumbers.childs,
        infants: travelersNumbers.babies,
      });
    });
    if (this.periodID) {
      this.periodsService
        .getPeriodDetail(this.periodID, ['consolidator', 'tourID'])
        .subscribe({
          next: (period: any) => {
            if (period.tourID) {
              this.toursService
                .getTourDetailByExternalID(period.tourID, ['consolidator'])
                .subscribe({
                  next: (tour: any) => {
                    const periodFilters = period.consolidator?.airportsFilters || [];
                    const tourFilters = tour.consolidator?.airportsFilters || [];
                    const includeTourConfig = period.consolidator?.includeTourConfig || false;
                    if (periodFilters.length > 0) {
                      this.airportsFilters = includeTourConfig
                        ? [...periodFilters, ...tourFilters]
                        : periodFilters;
                    } else {
                      this.airportsFilters = tourFilters;
                    }
                    if (tour.name) {
                      this.tourName = tour.name;
                    }
                  },
                  error: (err: any) => {
                    console.error('Error fetching tour details', err);
                  },
                });
            }
          },
          error: (err: any) => {
            console.error('Error fetching period details', err);
          },
        });
    }
    if (this.departureId) {
      this.departureConsolidadorSearchLocationService.getCombinedLocations(this.departureId)
        .subscribe({
          next: (data: ConsolidadorSearchLocationWithSourceResponse[]) => {
            // Obtener los IDs de location y locationAirport, filtrando sólo números válidos
            const locationIds = data.filter(item => typeof item.locationId === 'number').map(item => item.locationId as number);
            const airportIds = data.filter(item => typeof item.locationAirportId === 'number').map(item => item.locationAirportId as number);

            forkJoin({
              locations: locationIds.length ? this.locationNetService.getLocationsByIds(locationIds) : of([]),
              airports: airportIds.length ? this.locationAirportNetService.getAirportsByIds(airportIds) : of([])
            }).subscribe(({ locations, airports }) => {
              const locationMap = new Map(locations.map(l => [l.id, l]));
              const airportMap = new Map(airports.map(a => [a.id, a]));
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
      this.departureService.getAirportTimes(this.departureId).subscribe({
        next: (data: DepartureAirportTimesResponse) => {
          // Origen (llegada al inicio del tour)
          if (data.arrivalAirportIATA) {
            let cityName = data.ArrivalCity;
            if (!cityName || cityName.trim() === '') {
              const filter = { iata: data.arrivalAirportIATA };
              this.locationAirportNetService.getAirports(filter).subscribe(airports => {
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
              this.locationAirportNetService.getAirports(filter).subscribe(airports => {
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
          // Manejo de error: podrías mostrar un mensaje o dejar los valores por defecto
          console.error('Error obteniendo datos de aeropuerto:', err);
        }
      });
    }
  }

  ngOnDestroy() {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }

  onCitySelect(event: any) {
    // Solo registrar la selección, el framework se encarga del resto
  }

  buscar() {
    this.searchPerformed = true;
    this.getFlightOffers();
  }

  getFlightOffers() {
    this.isLoading = true;
    const formValue = this.flightForm.value;
    const originCode =
      typeof formValue.origen === 'string'
        ? this.getCityCode(formValue.origen)
        : formValue.origen.codigo;
    const destinationCode = this.tourOrigenConstante.codigo;
    const departureDate = this.fechaIdaConstante;
    const searchParams: FlightOffersParams = {
      originLocationCode: originCode,
      destinationLocationCode: destinationCode,
      departureDate: departureDate,
      adults: formValue.adults || 1,
      children: formValue.children || 0,
      infants: formValue.infants || 0,
      max: 10,
    };
    if (formValue.tipoViaje === 'idaVuelta') {
      searchParams.returnDate = this.fechaRegresoConstante;
    }
    if (formValue.aerolinea && formValue.aerolinea.codigo !== 'ALL') {
      searchParams.includedAirlineCodes = formValue.aerolinea.codigo;
    }
    this.amadeusService.getFlightOffers(searchParams).subscribe({
      next: (offers: any) => {
        this.isLoading = false;
        this.flightOffers = offers;
        this.filterOffers();
      },
      error: (err: any) => {
        this.isLoading = false;
        this.flightOffers = [];
        this.filteredOffers = [];
        this.filteredFlightsChange.emit([]);
      },
    });
  }

  getCityCode(cityName: string): string {
    const city = this.filteredCities.find(
      (c) => c.nombre.toLowerCase() === cityName.toLowerCase()
    );
    return city ? city.codigo : 'MAD';
  }

  formatDate(date: Date): string {
    const d = new Date(date);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  formatDisplayDate(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${day}/${month}/${year}`;
  }

  filterOffers() {
    const formValue = this.flightForm.value;
    this.filteredOffers = this.flightOffers.filter((offer) => {
      const offerData = offer.offerData;
      let matchesHandBaggage = true;
      let matchesCheckedBaggage = true;
      if (formValue.equipajeMano) {
        const hasCabinBag = offerData.travelerPricings.some((pricing: any) =>
          pricing.fareDetailsBySegment.some(
            (segment: any) =>
              segment.includedCabinBags &&
              segment.includedCabinBags.quantity > 0
          )
        );
        matchesHandBaggage = hasCabinBag;
      }
      if (formValue.equipajeBodega) {
        const hasCheckedBag = offerData.travelerPricings.some((pricing: any) =>
          pricing.fareDetailsBySegment.some(
            (segment: any) =>
              segment.includedCheckedBags &&
              segment.includedCheckedBags.quantity > 0
          )
        );
        matchesCheckedBaggage = hasCheckedBag;
      }
      let matchesStops = true;
      if (formValue.escala) {
        const outboundStops = offerData.itineraries[0].segments.length - 1;
        switch (formValue.escala) {
          case 'directos':
            matchesStops = outboundStops === 0;
            break;
          case 'unaEscala':
            matchesStops = outboundStops === 1;
            break;
          case 'multiples':
            matchesStops = outboundStops >= 2;
            break;
        }
      }
      return matchesHandBaggage && matchesCheckedBaggage && matchesStops;
    });
    this.sortFlights(this.selectedSortOption);
    this.transformedFlights = this.transformOffersToFlightFormat(this.filteredOffers);
    this.filteredFlightsChange.emit(this.transformedFlights);
  }

  sortFlights(sortOption: string) {
    switch (sortOption) {
      case 'price-asc':
        this.filteredOffers.sort(
          (a, b) =>
            parseFloat(a.offerData.price.total) -
            parseFloat(b.offerData.price.total)
        );
        break;
      case 'price-desc':
        this.filteredOffers.sort(
          (a, b) =>
            parseFloat(b.offerData.price.total) -
            parseFloat(a.offerData.price.total)
        );
        break;
      case 'duration':
        this.filteredOffers.sort((a, b) => {
          const getDurationMinutes = (offer: ITempFlightOffer) => {
            const duration = offer.offerData.itineraries[0].duration || '';
            const hours = parseInt(duration.match(/(\d+)H/)?.[1] || '0');
            const minutes = parseInt(duration.match(/(\d+)M/)?.[1] || '0');
            return hours * 60 + minutes;
          };
          return getDurationMinutes(a) - getDurationMinutes(b);
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

  transformOffersToFlightFormat(offers: ITempFlightOffer[]): Flight[] {
    return offers.map((offer) => {
      const offerData = offer.offerData;
      const outbound = offerData.itineraries[0];
      const inboundItinerary = offerData.itineraries.length > 1 ? offerData.itineraries[1] : null;
      const priceDataArray = this.amadeusService.transformFlightPriceData([offerData]);
      const departureDateStr = this.fechaIdaConstante;
      const returnDateStr = inboundItinerary ? this.fechaRegresoConstante : '';
      const outboundSegments: FlightSegment[] = outbound.segments.map((segment: any, index: number) => {
        let departureTime = '00:00';
        let arrivalTime = '00:00';
        if (segment.departure && segment.departure.at) {
          try {
            const date = new Date(segment.departure.at);
            if (date instanceof Date && !isNaN(date.getTime())) {
              departureTime = date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0');
            } else {
              const parts = segment.departure.at.split('T');
              if (parts.length > 1) {
                departureTime = parts[1].substring(0, 5);
              }
            }
          } catch (e) {
            const parts = segment.departure.at.split('T');
            if (parts.length > 1) {
              departureTime = parts[1].substring(0, 5);
            }
          }
        }
        if (segment.arrival && segment.arrival.at) {
          try {
            const date = new Date(segment.arrival.at);
            if (date instanceof Date && !isNaN(date.getTime())) {
              arrivalTime = date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0');
            } else {
              const parts = segment.arrival.at.split('T');
              if (parts.length > 1) {
                arrivalTime = parts[1].substring(0, 5);
              }
            }
          } catch (e) {
            const parts = segment.arrival.at.split('T');
            if (parts.length > 1) {
              arrivalTime = parts[1].substring(0, 5);
            }
          }
        }
        return {
          departureCity: this.getCityName(segment.departure.iataCode) || segment.departure.iataCode,
          arrivalCity: this.getCityName(segment.arrival.iataCode) || segment.arrival.iataCode,
          flightNumber: segment.carrierCode + segment.number,
          departureIata: segment.departure.iataCode,
          departureTime: departureTime,
          arrivalTime: arrivalTime,
          arrivalIata: segment.arrival.iataCode,
          numNights: 0,
          differential: 0,
          order: index,
          airline: {
            name: this.getAirlineName(segment.carrierCode),
            email: '',
            logo: '',
            code: segment.carrierCode,
          },
        };
      });
      let inboundSegments: FlightSegment[] = [];
      if (inboundItinerary) {
        inboundSegments = inboundItinerary.segments.map((segment: any, index: number) => {
          let departureTime = '00:00';
          let arrivalTime = '00:00';
          if (segment.departure && segment.departure.at) {
            try {
              const date = new Date(segment.departure.at);
              if (date instanceof Date && !isNaN(date.getTime())) {
                departureTime = date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0');
              } else {
                const parts = segment.departure.at.split('T');
                if (parts.length > 1) {
                  departureTime = parts[1].substring(0, 5);
                }
              }
            } catch (e) {
              const parts = segment.departure.at.split('T');
              if (parts.length > 1) {
                departureTime = parts[1].substring(0, 5);
              }
            }
          }
          if (segment.arrival && segment.arrival.at) {
            try {
              const date = new Date(segment.arrival.at);
              if (date instanceof Date && !isNaN(date.getTime())) {
                arrivalTime = date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0');
              } else {
                const parts = segment.arrival.at.split('T');
                if (parts.length > 1) {
                  arrivalTime = parts[1].substring(0, 5);
                }
              }
            } catch (e) {
              const parts = segment.arrival.at.split('T');
              if (parts.length > 1) {
                arrivalTime = parts[1].substring(0, 5);
              }
            }
          }
          return {
            departureCity: this.getCityName(segment.departure.iataCode) || segment.departure.iataCode,
            arrivalCity: this.getCityName(segment.arrival.iataCode) || segment.arrival.iataCode,
            flightNumber: segment.carrierCode + segment.number,
            departureIata: segment.departure.iataCode,
            departureTime: departureTime,
            arrivalTime: arrivalTime,
            arrivalIata: segment.arrival.iataCode,
            numNights: 0,
            differential: 0,
            order: index,
            airline: {
              name: this.getAirlineName(segment.carrierCode),
              email: '',
              logo: '',
              code: segment.carrierCode,
            },
          };
        });
      }
      const flight: Flight = {
        id: offer._id,
        externalID: offerData.id,
        name: inboundItinerary
          ? `Vuelo ${outbound.segments[0]?.departure?.iataCode} - ${outbound.segments[outbound.segments.length - 1]?.arrival?.iataCode}`
          : `Vuelo ${outbound.segments[0]?.departure?.iataCode} - ${outbound.segments[outbound.segments.length - 1]?.arrival?.iataCode}`,
        outbound: {
          activityID: 0,
          availability: 1,
          date: departureDateStr,
          name: `Vuelo a ${outbound.segments[outbound.segments.length - 1]?.arrival?.iataCode}`,
          segments: outboundSegments,
          serviceCombinationID: 0,
          prices: priceDataArray,
        },
        inbound: inboundItinerary
          ? {
              activityID: 0,
              availability: 1,
              date: returnDateStr,
              name: `Vuelo de regreso desde ${inboundItinerary.segments[0]?.departure?.iataCode} a ${inboundItinerary.segments[inboundItinerary.segments.length - 1]?.arrival?.iataCode}`,
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
        price: priceDataArray.find((price: any) => price.age_group_name === 'Adultos')?.value_with_campaign || 0,
        priceData: priceDataArray,
        source: 'amadeus',
      };
      return flight;
    });
  }

  getCityName(iataCode: string): string | null {
    const city = this.filteredCities.find((c) => c.codigo === iataCode);
    if (city) {
      return city.nombre.split(' - ')[0];
    }
    return null;
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

  selectFlight(flight: Flight): void {
    this.selectedFlightId = flight.externalID;
    const flightWithSource = {
      ...flight,
      source: 'amadeus',
      id: flight.id || flight.externalID,
      externalID: flight.externalID,
      name: flight.name || `$ ${flight.outbound.segments[0]?.flightNumber}`,
    };
    this.filteredFlightsChange.emit([flightWithSource]);
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
