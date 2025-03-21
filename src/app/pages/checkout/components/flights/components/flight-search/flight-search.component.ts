import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { AmadeusService } from '../../../../../../core/services/amadeus.service';
import {
  FlightOffersParams,
  ITempFlightOffer,
} from '../../../../../../core/types/flight.types';
import { Flight } from '../../../../../../core/models/tours/flight.model';

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

  flightForm: FormGroup;

  tipoViaje: string = 'soloDia';
  equipajeMano: boolean = false;
  equipajeBodega: boolean = false;

  // Tour constants for flight legs and dates
  tourOrigenConstante: Ciudad = {
    nombre: 'Noruega - Oslo Gardemoen',
    codigo: 'OSL',
  };
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

  // Add property to track the selected flight
  selectedFlightId: string | null = null;

  // Add array to store transformed flights
  transformedFlights: Flight[] = [];

  constructor(private fb: FormBuilder, private amadeusService: AmadeusService) {
    // Find default city (Madrid) in the ciudades array
    const defaultCity =
      this.ciudades.find((city) => city.nombre === 'Madrid') ||
      this.ciudades[0];

    this.flightForm = this.fb.group({
      origen: [defaultCity], // Now using the full Ciudad object instead of just a string
      // We remove date fields from the form since they're fixed
      tipoViaje: [this.tipoViaje],
      equipajeMano: [this.equipajeMano],
      equipajeBodega: [this.equipajeBodega],
      adults: [1],
      aerolinea: [null],
      escala: [null],
    });
  }

  ngOnInit() {
    // Remove the automatic search on initialization

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
    this.searchPerformed = true; // Set flag to true when search is performed
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
      max: 5, // Número máximo de resultados
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
        // Mostrar mensaje de error al usuario
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
    return city ? city.codigo : 'MAD'; // Default to Madrid if not found
  }

  formatDate(date: Date): string {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // Helper method to format dates for display
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
        // Verificar si incluye equipaje de mano
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
        // Verificar si incluye equipaje facturado
        const hasCheckedBag = offerData.travelerPricings.some((pricing: any) =>
          pricing.fareDetailsBySegment.some(
            (segment: any) =>
              segment.includedCheckedBags &&
              segment.includedCheckedBags.quantity > 0
          )
        );
        matchesCheckedBaggage = hasCheckedBag;
      }

      // Filtro por aerolínea (si se seleccionó una específica)
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

    // Transform offers to Flight format for flight-itinerary component
    this.transformedFlights = this.transformOffersToFlightFormat(
      this.filteredOffers
    );

    // Also emit the transformed flights for the parent component
    this.filteredFlightsChange.emit(this.transformedFlights);

    console.log('Transformed flights:', this.transformedFlights);
  }

  transformOffersToFlightFormat(offers: ITempFlightOffer[]): Flight[] {
    return offers.map((offer) => {
      const offerData = offer.offerData;

      // Get outbound data
      const outbound = offerData.itineraries[0];

      // Convert traveler pricing to proper PriceData format
      const priceDataArray = offerData.travelerPricings.map((tp: any) => ({
        id: offerData.id + '-' + tp.travelerId,
        value: parseFloat(tp.price.total),
        value_with_campaign: parseFloat(tp.price.total), // Same as value since no campaign
        campaign: null,
        age_group_name: tp.travelerType === 'ADULT' ? 'Adultos' : 'Niños',
        category_name: 'Vuelo',
        period_product: 'FLIGHT',
        _id: offerData.id + '-' + tp.travelerId, // Using a combination as ID
      }));

      // Create YYYY-MM-DD formatted date string for the departure
      // Always use our fixed date which we know is valid
      const departureDateStr = this.formatDate(this.fechaIdaConstante);

      // Create Flight object
      const flight: Flight = {
        id: offerData.id,
        externalID: offerData.id,
        name: `${offerData.validatingAirlineCodes[0]} - ${
          outbound?.segments[0]?.departure?.iataCode
        } to ${
          outbound?.segments[outbound.segments.length - 1]?.arrival?.iataCode
        }`,
        outbound: {
          activityID: 0,
          availability: 1,
          date: departureDateStr, // Use our known valid date string
          name: `Flight to ${
            outbound?.segments[outbound.segments.length - 1]?.arrival?.iataCode
          }`,
          segments:
            outbound?.segments.map((segment: any, index: number) => {
              // Safely extract time portions
              let departureTime = '00:00';
              let arrivalTime = '00:00';

              if (segment.departure && segment.departure.at) {
                const parts = segment.departure.at.split('T');
                if (parts.length > 1) {
                  departureTime = parts[1].substring(0, 5);
                }
              }

              if (segment.arrival && segment.arrival.at) {
                const parts = segment.arrival.at.split('T');
                if (parts.length > 1) {
                  arrivalTime = parts[1].substring(0, 5);
                }
              }

              return {
                departureCity: segment.departure.iataCode,
                arrivalCity: segment.arrival.iataCode,
                flightNumber: segment.number,
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
                },
              };
            }) || [],
          serviceCombinationID: 0,
          prices: priceDataArray,
        },
        inbound: {
          activityID: 0,
          availability: 0,
          date: departureDateStr, // Use same date for inbound too
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

  transformOffersForParent(offers: ITempFlightOffer[]): any[] {
    return offers.map((offer) => {
      const offerData = offer.offerData;

      // Para simplificar, tomamos el primer itinerario y segmento
      const outbound = offerData.itineraries[0];
      const inbound =
        offerData.itineraries.length > 1 ? offerData.itineraries[1] : null;

      // Adaptamos la estructura para que sea compatible con el componente padre
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
            value: parseFloat(tp.price.total) / 2, // Dividir el precio total entre ida y vuelta
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
                value: parseFloat(tp.price.total) / 2, // Dividir el precio total entre ida y vuelta
              })),
            }
          : {
              // Si es solo ida, crear datos vacíos para inbound
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

  // Formatear la duración (convertir de formato PT2H30M a 2h 30m)
  formatDuration(duration: string): string {
    if (!duration) return '';

    const hours = duration.match(/(\d+)H/);
    const minutes = duration.match(/(\d+)M/);

    let formatted = '';
    if (hours) formatted += `${hours[1]}h `;
    if (minutes) formatted += `${minutes[1]}m`;

    return formatted.trim();
  }

  // Obtener el nombre de la aerolínea a partir del código
  getAirlineName(code: string): string {
    const airline = this.aerolineas.find((a) => a.codigo === code);
    return airline ? airline.nombre : code;
  }

  // Verificar si un vuelo incluye equipaje de mano
  hasHandBaggage(offer: ITempFlightOffer): boolean {
    return offer.offerData.travelerPricings.some((tp: any) =>
      tp.fareDetailsBySegment.some(
        (seg: any) =>
          seg.includedCabinBags && seg.includedCabinBags.quantity > 0
      )
    );
  }

  // Verificar si un vuelo incluye equipaje facturado
  hasCheckedBaggage(offer: ITempFlightOffer): boolean {
    return offer.offerData.travelerPricings.some((tp: any) =>
      tp.fareDetailsBySegment.some(
        (seg: any) =>
          seg.includedCheckedBags && seg.includedCheckedBags.quantity > 0
      )
    );
  }

  // Método para seleccionar un vuelo
  selectFlight(flight: Flight): void {
    this.selectedFlightId = flight.externalID; // Update the selected flight ID
    this.filteredFlightsChange.emit([flight]); // Emit the selected flight
  }

  // Add method to check if a flight is selected
  isFlightSelected(flight: Flight): boolean {
    return flight.externalID === this.selectedFlightId;
  }
}
