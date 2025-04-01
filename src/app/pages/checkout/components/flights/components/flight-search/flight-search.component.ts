import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { AmadeusService } from '../../../../../../core/services/amadeus.service';
import {
  FlightOffersParams,
  ITempFlightOffer,
} from '../../../../../../core/types/flight.types';
import {
  Flight,
  FlightSegment,
} from '../../../../../../core/models/tours/flight.model';

interface Ciudad {
  nombre: string;
  codigo: string;
}

@Component({
  selector: 'app-flight-search',
  standalone: false,
  templateUrl: './flight-search.component.html',
  styleUrls: ['./flight-search.component.scss'],
})
export class FlightSearchComponent implements OnInit {
  @Output() filteredFlightsChange = new EventEmitter<any[]>();
  @Input() flights: Flight[] = [];
  @Input() tourDestination: Ciudad = { nombre: '', codigo: '' };

  flightForm: FormGroup;

  tipoViaje: string = 'soloDia';
  equipajeMano: boolean = false;
  equipajeBodega: boolean = false;

  // Tour constants for flight legs and dates - will be updated with Input
  tourOrigenConstante: Ciudad = { nombre: '', codigo: '' };
  tourDestinoConstante: Ciudad = { nombre: 'Madrid', codigo: 'MAD' };

  // Fixed dates
  fechaIdaConstante: Date = new Date('2025-04-03');
  fechaRegresoConstante: Date = new Date('2025-04-10');

  // Format dates for display
  fechaIdaFormateada: string = this.formatDisplayDate(this.fechaIdaConstante);
  fechaRegresoFormateada: string = this.formatDisplayDate(
    this.fechaRegresoConstante
  );

  ciudades: Ciudad[] = [
    { nombre: 'Madrid', codigo: 'MAD' },
    { nombre: 'Nueva York', codigo: 'NYC' },
    { nombre: 'Lisboa', codigo: 'LIS' },
    { nombre: 'Casablanca', codigo: 'CMN' },
    { nombre: 'Sevilla', codigo: 'SVQ' },
    { nombre: 'Noruega - Oslo Gardemoen', codigo: 'OSL' },
    { nombre: 'Sevilla - San Pablo', codigo: 'SVQ' },
  ];

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

  // Propiedad para trackear el vuelo seleccionado
  selectedFlightId: string | null = null;

  // Array para almacenar vuelos transformados
  transformedFlights: Flight[] = [];

  constructor(private fb: FormBuilder, private amadeusService: AmadeusService) {
    // Seleccionar ciudad por defecto (Madrid)
    const defaultCity =
      this.ciudades.find((city) => city.nombre === 'Madrid') ||
      this.ciudades[0];

    this.flightForm = this.fb.group({
      origen: [defaultCity], // Usamos el objeto Ciudad completo
      tipoViaje: [this.tipoViaje],
      equipajeMano: [this.equipajeMano],
      equipajeBodega: [this.equipajeBodega],
      adults: [1],
      aerolinea: [null],
      escala: [null],
    });
  }

  ngOnInit() {
    // Update the tour origin from input or use default
    if (this.tourDestination && this.tourDestination.codigo) {
      this.tourOrigenConstante = this.tourDestination;
    }

    // Se elimina la búsqueda automática al iniciar

    // Actualizar el tipo de viaje al cambiar en el formulario
    this.flightForm.get('tipoViaje')?.valueChanges.subscribe((value) => {
      this.tipoViaje = value;
    });

    // Actualizar los checkboxes al cambiar en el formulario
    this.flightForm.get('equipajeMano')?.valueChanges.subscribe((value) => {
      this.equipajeMano = value;
    });

    this.flightForm.get('equipajeBodega')?.valueChanges.subscribe((value) => {
      this.equipajeBodega = value;
    });
  }

  buscar() {
    console.log(
      'Búsqueda iniciada con los siguientes parámetros:',
      this.flightForm.value
    );
    this.searchPerformed = true;
    this.getFlightOffers();
  }

  getFlightOffers() {
    this.isLoading = true;

    // Obtener el código de origen
    const formValue = this.flightForm.value;
    const originCode =
      typeof formValue.origen === 'string'
        ? this.getCityCode(formValue.origen)
        : formValue.origen.codigo;

    // Usar el código de destino fijo del tour
    const destinationCode = this.tourOrigenConstante.codigo;

    // Usar las fechas constantes
    const departureDate = this.formatDate(this.fechaIdaConstante);

    // Parámetros para la búsqueda
    const searchParams: FlightOffersParams = {
      originLocationCode: originCode,
      destinationLocationCode: destinationCode,
      departureDate: departureDate,
      adults: formValue.adults || 1,
      max: 5,
    };

    // Si es ida y vuelta, añadir la fecha de regreso
    if (formValue.tipoViaje === 'idaVuelta') {
      searchParams.returnDate = this.formatDate(this.fechaRegresoConstante);
    }

    // Si se seleccionó una aerolínea específica
    if (formValue.aerolinea && formValue.aerolinea.codigo !== 'ALL') {
      searchParams.includedAirlineCodes = formValue.aerolinea.codigo;
    }

    console.log('Buscando vuelos con parámetros:', searchParams);

    this.amadeusService.getFlightOffers(searchParams).subscribe({
      next: (offers) => {
        this.isLoading = false;
        this.flightOffers = offers;
        this.filterOffers();
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error al obtener ofertas de vuelo:', err);
        this.flightOffers = [];
        this.filteredOffers = [];
        this.filteredFlightsChange.emit([]);
      },
    });
  }

  getCityCode(cityName: string): string {
    const city = this.ciudades.find(
      (c) => c.nombre.toLowerCase() === cityName.toLowerCase()
    );
    return city ? city.codigo : 'MAD';
  }

  formatDate(date: Date): string {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // Método auxiliar para formatear fechas para mostrar
  formatDisplayDate(date: Date): string {
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  filterOffers() {
    const formValue = this.flightForm.value;

    this.filteredOffers = this.flightOffers.filter((offer) => {
      const offerData = offer.offerData;

      // Filtro por equipaje
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

      // Filtro por aerolínea
      let matchesAirline = true;
      if (formValue.aerolinea && formValue.aerolinea.codigo !== 'ALL') {
        const airlineCode = formValue.aerolinea.codigo;
        matchesAirline = offerData.validatingAirlineCodes.includes(airlineCode);
      }

      // Filtro por número de escalas
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

      return (
        matchesHandBaggage &&
        matchesCheckedBaggage &&
        matchesAirline &&
        matchesStops
      );
    });

    // Transformamos las ofertas a formato Flight para el componente de itinerario
    this.transformedFlights = this.transformOffersToFlightFormat(
      this.filteredOffers
    );

    // Emitir los vuelos transformados al componente padre
    this.filteredFlightsChange.emit(this.transformedFlights);

    console.log('Transformed flights:', this.transformedFlights);
  }

  transformOffersToFlightFormat(offers: ITempFlightOffer[]): Flight[] {
    return offers.map((offer) => {
      const offerData = offer.offerData;
      const outbound = offerData.itineraries[0];
      // Detectamos si existe un itinerario de regreso
      const inboundItinerary =
        offerData.itineraries.length > 1 ? offerData.itineraries[1] : null;

      // Transformamos los precios
      const priceDataArray = offerData.travelerPricings.map((tp: any) => ({
        id: offerData.id + '-' + tp.travelerId,
        value: parseFloat(tp.price.total),
        value_with_campaign: parseFloat(tp.price.total),
        campaign: null,
        age_group_name: tp.travelerType === 'ADULT' ? 'Adultos' : 'Niños',
        category_name: 'Vuelo',
        period_product: 'FLIGHT',
        _id: offerData.id + '-' + tp.travelerId,
      }));

      // Creamos las fechas formateadas para los vuelos
      const departureDateStr = this.formatDate(this.fechaIdaConstante);
      const returnDateStr = inboundItinerary
        ? this.formatDate(this.fechaRegresoConstante)
        : '';

      // Transformar segmentos del vuelo de ida
      const outboundSegments: FlightSegment[] = outbound.segments.map(
        (segment: any, index: number) => {
          // Ensure we have valid time formats (HH:MM)
          let departureTime = '00:00';
          let arrivalTime = '00:00';

          if (segment.departure && segment.departure.at) {
            try {
              const date = new Date(segment.departure.at);
              if (date instanceof Date && !isNaN(date.getTime())) {
                departureTime =
                  date.getHours().toString().padStart(2, '0') +
                  ':' +
                  date.getMinutes().toString().padStart(2, '0');
              } else {
                const parts = segment.departure.at.split('T');
                if (parts.length > 1) {
                  departureTime = parts[1].substring(0, 5);
                }
              }
            } catch (e) {
              console.warn(
                'Error parsing departure time:',
                segment.departure.at
              );
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
                arrivalTime =
                  date.getHours().toString().padStart(2, '0') +
                  ':' +
                  date.getMinutes().toString().padStart(2, '0');
              } else {
                const parts = segment.arrival.at.split('T');
                if (parts.length > 1) {
                  arrivalTime = parts[1].substring(0, 5);
                }
              }
            } catch (e) {
              console.warn('Error parsing arrival time:', segment.arrival.at);
              const parts = segment.arrival.at.split('T');
              if (parts.length > 1) {
                arrivalTime = parts[1].substring(0, 5);
              }
            }
          }

          // Log the times for debugging
          console.log(`Segment ${index} parsed times:`, {
            original: {
              departure: segment.departure?.at,
              arrival: segment.arrival?.at,
            },
            parsed: {
              departureTime,
              arrivalTime,
            },
          });

          return {
            departureCity:
              this.getCityName(segment.departure.iataCode) ||
              segment.departure.iataCode,
            arrivalCity:
              this.getCityName(segment.arrival.iataCode) ||
              segment.arrival.iataCode,
            flightNumber: segment.carrierCode + segment.number,
            departureIata: segment.departure.iataCode,
            departureTime: departureTime, // HH:MM format
            arrivalTime: arrivalTime, // HH:MM format
            arrivalIata: segment.arrival.iataCode,
            numNights: 0, // Por defecto sin noches
            differential: 0,
            order: index,
            airline: {
              name: this.getAirlineName(segment.carrierCode),
              email: '',
              logo: '',
            },
          };
        }
      );

      // Similar fixes for inbound segments
      let inboundSegments: FlightSegment[] = [];
      if (inboundItinerary) {
        inboundSegments = inboundItinerary.segments.map(
          (segment: any, index: number) => {
            // Ensure we have valid time formats (HH:MM)
            let departureTime = '00:00';
            let arrivalTime = '00:00';

            if (segment.departure && segment.departure.at) {
              try {
                const date = new Date(segment.departure.at);
                if (date instanceof Date && !isNaN(date.getTime())) {
                  departureTime =
                    date.getHours().toString().padStart(2, '0') +
                    ':' +
                    date.getMinutes().toString().padStart(2, '0');
                } else {
                  const parts = segment.departure.at.split('T');
                  if (parts.length > 1) {
                    departureTime = parts[1].substring(0, 5);
                  }
                }
              } catch (e) {
                console.warn(
                  'Error parsing departure time:',
                  segment.departure.at
                );
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
                  arrivalTime =
                    date.getHours().toString().padStart(2, '0') +
                    ':' +
                    date.getMinutes().toString().padStart(2, '0');
                } else {
                  const parts = segment.arrival.at.split('T');
                  if (parts.length > 1) {
                    arrivalTime = parts[1].substring(0, 5);
                  }
                }
              } catch (e) {
                console.warn('Error parsing arrival time:', segment.arrival.at);
                const parts = segment.arrival.at.split('T');
                if (parts.length > 1) {
                  arrivalTime = parts[1].substring(0, 5);
                }
              }
            }

            return {
              departureCity:
                this.getCityName(segment.departure.iataCode) ||
                segment.departure.iataCode,
              arrivalCity:
                this.getCityName(segment.arrival.iataCode) ||
                segment.arrival.iataCode,
              flightNumber: segment.carrierCode + segment.number,
              departureIata: segment.departure.iataCode,
              departureTime: departureTime, // HH:MM format
              arrivalTime: arrivalTime, // HH:MM format
              arrivalIata: segment.arrival.iataCode,
              numNights: 0,
              differential: 0,
              order: index,
              airline: {
                name: this.getAirlineName(segment.carrierCode),
                email: '',
                logo: '',
              },
            };
          }
        );
      }

      // Construir el objeto Flight
      const flight: Flight = {
        id: offerData.id,
        externalID: offerData.id,
        name: inboundItinerary
          ? `${this.getAirlineName(offerData.validatingAirlineCodes[0])} - ${
              outbound.segments[0]?.departure?.iataCode
            } a ${
              outbound.segments[outbound.segments.length - 1]?.arrival?.iataCode
            }`
          : `${this.getAirlineName(offerData.validatingAirlineCodes[0])} - ${
              outbound.segments[0]?.departure?.iataCode
            } a ${
              outbound.segments[outbound.segments.length - 1]?.arrival?.iataCode
            }`,
        outbound: {
          activityID: 0,
          availability: 1,
          date: departureDateStr,
          name: `Vuelo a ${
            outbound.segments[outbound.segments.length - 1]?.arrival?.iataCode
          }`,
          segments: outboundSegments,
          serviceCombinationID: 0,
          prices: priceDataArray,
        },
        inbound: inboundItinerary
          ? {
              activityID: 0,
              availability: 1,
              date: returnDateStr,
              name: `Vuelo de regreso desde ${
                inboundItinerary.segments[0]?.departure?.iataCode
              } a ${
                inboundItinerary.segments[inboundItinerary.segments.length - 1]
                  ?.arrival?.iataCode
              }`,
              segments: inboundSegments,
              serviceCombinationID: 0,
              prices: priceDataArray,
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
        price: parseFloat(offerData.price.total),
        priceData: priceDataArray,
      };

      return flight;
    });
  }

  // Add a helper method to get city name from IATA code
  getCityName(iataCode: string): string | null {
    const city = this.ciudades.find((c) => c.codigo === iataCode);
    if (city) {
      return city.nombre.split(' - ')[0]; // Return just the city name part
    }
    return null;
  }

  transformOffersForParent(offers: ITempFlightOffer[]): any[] {
    return offers.map((offer) => {
      const offerData = offer.offerData;
      const outbound = offerData.itineraries[0];
      const inbound =
        offerData.itineraries.length > 1 ? offerData.itineraries[1] : null;

      return {
        externalID: offerData.id,
        name: `${offerData.validatingAirlineCodes[0]} - ${
          outbound?.segments[0]?.departure?.iataCode
        } to ${
          outbound?.segments[outbound.segments.length - 1]?.arrival?.iataCode
        }`,
        outbound: {
          origin: {
            name: outbound?.segments[0]?.departure?.iataCode,
            code: outbound?.segments[0]?.departure?.iataCode,
          },
          destination: {
            name: outbound?.segments[outbound.segments.length - 1]?.arrival
              ?.iataCode,
            code: outbound?.segments[outbound.segments.length - 1]?.arrival
              ?.iataCode,
          },
          departureDate: outbound?.segments[0]?.departure?.at,
          arrivalDate:
            outbound?.segments[outbound.segments.length - 1]?.arrival?.at,
          airline: outbound?.segments[0]?.carrierCode,
          flightNumber: outbound?.segments[0]?.number,
          duration: outbound?.duration,
          stops: outbound?.segments.length - 1,
          prices: offerData.travelerPricings.map((tp: any) => ({
            age_group_name: tp.travelerType === 'ADULT' ? 'Adultos' : 'Niños',
            value: parseFloat(tp.price.total) / 2,
          })),
        },
        inbound: inbound
          ? {
              origin: {
                name: inbound.segments[0]?.departure?.iataCode,
                code: inbound.segments[0]?.departure?.iataCode,
              },
              destination: {
                name: inbound.segments[inbound.segments.length - 1]?.arrival
                  ?.iataCode,
                code: inbound.segments[inbound.segments.length - 1]?.arrival
                  ?.iataCode,
              },
              departureDate: inbound.segments[0]?.departure?.at,
              arrivalDate:
                inbound.segments[inbound.segments.length - 1]?.arrival?.at,
              airline: inbound.segments[0]?.carrierCode,
              flightNumber: inbound.segments[0]?.number,
              duration: inbound.duration,
              stops: inbound.segments.length - 1,
              prices: offerData.travelerPricings.map((tp: any) => ({
                age_group_name:
                  tp.travelerType === 'ADULT' ? 'Adultos' : 'Niños',
                value: parseFloat(tp.price.total) / 2,
              })),
            }
          : {
              origin: { name: '', code: '' },
              destination: { name: '', code: '' },
              departureDate: '',
              arrivalDate: '',
              airline: '',
              flightNumber: '',
              duration: '',
              stops: 0,
              prices: [],
            },
        price: parseFloat(offerData.price.total),
        hasHandBaggage: offerData.travelerPricings.some((tp: any) =>
          tp.fareDetailsBySegment.some(
            (seg: any) =>
              seg.includedCabinBags && seg.includedCabinBags.quantity > 0
          )
        ),
        hasCheckedBaggage: offerData.travelerPricings.some((tp: any) =>
          tp.fareDetailsBySegment.some(
            (seg: any) =>
              seg.includedCheckedBags && seg.includedCheckedBags.quantity > 0
          )
        ),
      };
    });
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
    const airline = this.aerolineas.find((a) => a.codigo === code);
    return airline ? airline.nombre : code;
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
    this.filteredFlightsChange.emit([flight]);
  }

  isFlightSelected(flight: Flight): boolean {
    return flight.externalID === this.selectedFlightId;
  }
}
