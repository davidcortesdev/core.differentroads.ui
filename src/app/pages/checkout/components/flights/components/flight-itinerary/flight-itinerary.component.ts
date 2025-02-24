import { Component } from '@angular/core';

@Component({
  selector: 'app-flight-itinerary',
  standalone: false,
  templateUrl: './flight-itinerary.component.html',
  styleUrl: './flight-itinerary.component.scss',
})
export class FlightItineraryComponent {
  selectedFlight: any;
  flights = [
    {
      id: '679a935819be5720c3889875',
      externalID: '73372',
      inbound: {
        activityID: 73381,
        availability: 13,
        date: '2025-05-02',
        name: 'Vuelo a Barcelona',
        prices: [],
        segments: [
          {
            departureCity: 'Venecia',
            arrivalCity: 'Barcelona',
            flightNumber: 'VY6405',
            departureIata: 'VCE',
            departureTime: '22:10:00',
            arrivalTime: '00:10:00',
            arrivalIata: 'BCN',
            numNights: 0,
            differential: 0,
            order: 1,
            airline: {
              name: 'Vueling',
              email: 'grupos@vueling.com',
              logo: 'https://w7.pngwing.com/pngs/981/769/png-transparent-turkish-airlines-antalya-istanbul-ataturk-airport-boeing-777-logo-others-sphere-turkish-symbol-thumbnail.png',
            },
          },
        ],
        serviceCombinationID: 243274,
      },
      name: 'Vuelo desde Barcelona',
      outbound: {
        activityID: 73372,
        availability: 13,
        date: '2025-04-29',
        name: 'Vuelo desde Barcelona',
        prices: [
          {
            age_group_name: 'Niños',
            campaign: null,
            category_name: 'Standard category',
            id: '2392306',
            period_product: '75925.73372',
            value: 175,
            value_with_campaign: 175,
          },
          {
            age_group_name: 'Adultos',
            campaign: null,
            category_name: 'Standard category',
            id: '2392300',
            period_product: '75925.73372',
            value: 175,
            value_with_campaign: 175,
          },
        ],
        segments: [
          {
            departureCity: 'Barcelona',
            arrivalCity: 'Venecia',
            flightNumber: 'VY6400',
            departureIata: 'BCN',
            departureTime: '07:00:00',
            arrivalTime: '08:55:00',
            arrivalIata: 'VCE',
            numNights: 0,
            differential: 0,
            order: 1,
            airline: {
              name: 'Vueling',
              email: 'grupos@vueling.com',
              logo: 'https://w7.pngwing.com/pngs/981/769/png-transparent-turkish-airlines-antalya-istanbul-ataturk-airport-boeing-777-logo-others-sphere-turkish-symbol-thumbnail.png',
            },
          },
        ],
        serviceCombinationID: 243273,
      },
    },
    {
      id: '679a935819be5720c3889876',
      externalID: '73365',
      inbound: {
        activityID: 73378,
        availability: 29,
        date: '2025-05-02',
        name: 'Vuelo a Madrid',
        prices: [],
        segments: [
          {
            departureCity: 'Venecia',
            arrivalCity: 'Madrid',
            flightNumber: 'IB682',
            departureIata: 'VCE',
            departureTime: '19:45:00',
            arrivalTime: '22:25:00',
            arrivalIata: 'MAD',
            numNights: 0,
            differential: 0,
            order: 1,
            airline: {
              name: 'Iberia',
              email: 'gespana@iberia.es,jcpenuela@iberia.es',
              logo: 'https://w7.pngwing.com/pngs/981/769/png-transparent-turkish-airlines-antalya-istanbul-ataturk-airport-boeing-777-logo-others-sphere-turkish-symbol-thumbnail.png',
            },
          },
        ],
        serviceCombinationID: 243280,
      },
      name: 'Vuelo desde Madrid',
      outbound: {
        activityID: 73365,
        availability: 29,
        date: '2025-04-29',
        name: 'Vuelo desde Madrid',
        prices: [
          {
            age_group_name: 'Niños',
            campaign: null,
            category_name: 'Standard category',
            id: '2392280',
            period_product: '75925.73365',
            value: 225,
            value_with_campaign: 225,
          },
          {
            age_group_name: 'Adultos',
            campaign: null,
            category_name: 'Standard category',
            id: '2392274',
            period_product: '75925.73365',
            value: 225,
            value_with_campaign: 225,
          },
        ],
        segments: [
          {
            departureCity: 'Madrid',
            arrivalCity: 'Venecia',
            flightNumber: 'IB677',
            departureIata: 'MAD',
            departureTime: '08:50:00',
            arrivalTime: '11:15:00',
            arrivalIata: 'VCE',
            numNights: 0,
            differential: 0,
            order: 1,
            airline: {
              name: 'Iberia',
              email: 'gespana@iberia.es,jcpenuela@iberia.es',
              logo: 'https://w7.pngwing.com/pngs/981/769/png-transparent-turkish-airlines-antalya-istanbul-ataturk-airport-boeing-777-logo-others-sphere-turkish-symbol-thumbnail.png',
            },
          },
        ],
        serviceCombinationID: 243279,
      },
    },
    {
      id: '679a935819be5720c3889877',
      externalID: '73367',
      inbound: {
        activityID: 73380,
        availability: 15,
        date: '2025-05-02',
        name: 'Sin vuelos',
        prices: [],
        segments: [
          {
            departureCity: 'Venecia',
            arrivalCity: 'SINVUELOS',
            flightNumber: 'UNK',
            departureIata: 'VCE',
            departureTime: '00:00:00',
            arrivalTime: '00:00:00',
            arrivalIata: 'SVNA',
            numNights: 0,
            differential: 0,
            order: 1,
            airline: {
              name: 'Unknown provider',
              email: 'unknown@unknown.com',
              logo: 'https://w7.pngwing.com/pngs/981/769/png-transparent-turkish-airlines-antalya-istanbul-ataturk-airport-boeing-777-logo-others-sphere-turkish-symbol-thumbnail.png',
            },
          },
        ],
        serviceCombinationID: 243410,
      },
      name: 'Sin vuelos',
      outbound: {
        activityID: 73367,
        availability: 15,
        date: '2025-04-29',
        name: 'Sin vuelos',
        prices: [
          {
            age_group_name: 'Niños',
            campaign: null,
            category_name: 'Standard category',
            id: '2392293',
            period_product: '75925.73367',
            value: 0,
            value_with_campaign: 0,
          },
          {
            age_group_name: 'Adultos',
            campaign: null,
            category_name: 'Standard category',
            id: '2392287',
            period_product: '75925.73367',
            value: 0,
            value_with_campaign: 0,
          },
        ],
        segments: [
          {
            departureCity: 'SINVUELOS',
            arrivalCity: 'Venecia',
            flightNumber: 'UNK',
            departureIata: 'SVNA',
            departureTime: '00:00:00',
            arrivalTime: '00:00:00',
            arrivalIata: 'VCE',
            numNights: 0,
            differential: 0,
            order: 1,
            airline: {
              name: 'Unknown provider',
              email: 'unknown@unknown.com',
              logo: 'https://w7.pngwing.com/pngs/981/769/png-transparent-turkish-airlines-antalya-istanbul-ataturk-airport-boeing-777-logo-others-sphere-turkish-symbol-thumbnail.png',
            },
          },
        ],
        serviceCombinationID: 243409,
      },
    },
  ];

  // Filtra los vuelos que no son "Sin vuelos"
  filteredFlights = this.flights.filter(
    (flight) => flight.name && !flight.name.includes('Sin vuelos')
  );

  // Formatea la hora para el pipe `date`
  formatTime(timeString: string): Date {
    if (!timeString) return new Date();
    const [hours, minutes, seconds] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, seconds);
    return date;
  }

  // Calcula la duración del vuelo para un segmento
  calculateFlightDuration(segment: any): string {
    const departure = this.formatTime(segment.departureTime);
    const arrival = this.formatTime(segment.arrivalTime);
    const duration = (arrival.getTime() - departure.getTime()) / (1000 * 60); // Duración en minutos
    const hours = Math.floor(duration / 60);
    const minutes = Math.floor(duration % 60);
    return `${hours}h ${minutes}m`;
  }

  // Calcula el precio total para adultos
  calculateTotalPrice(flight: any): number {
    const outboundPrice =
      flight.outbound.prices.find((p: any) => p.age_group_name === 'Adultos')
        ?.value || 0;
    const inboundPrice =
      flight.inbound.prices.find((p: any) => p.age_group_name === 'Adultos')
        ?.value || 0;
    return outboundPrice + inboundPrice;
  }

  // Selecciona un vuelo
  selectFlight(flight: any): void {
    this.selectedFlight = flight;
  }

  // Verifica si un vuelo está seleccionado
  isFlightSelected(flight: any): boolean {
    return this.selectedFlight?.id === flight.id;
  }
}
