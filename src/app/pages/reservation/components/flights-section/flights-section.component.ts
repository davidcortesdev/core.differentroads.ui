import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import {
  Flight,
  FlightSegment,
} from '../../../../core/models/tours/flight.model';
import { forkJoin, Observable, of } from 'rxjs';
import { AirlinesService } from '../../../../core/services/airlines/airlines.service';
import { map, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-flights-section',
  standalone: false,
  templateUrl: './flights-section.component.html',
  styleUrls: ['./flights-section.component.scss'],
})
export class FlightsSectionComponent {
  @Input() flights: Flight[] = [];

  constructor(private airlinesService: AirlinesService) {}

  // New adapter for template format - provides flight data in the format expected by the template
  get formattedFlights() {
    if (!this.flights?.length) {
      return null;
    }

    // Use the first flight in the array
    const flight = this.flights[0];

    return {
      outbound: flight.outbound ? this.formatFlightInfo(flight.outbound) : null,
      inbound: flight.inbound ? this.formatFlightInfo(flight.inbound) : null,
    };
  }

  // Helper method to format flight info from segments
  private formatFlightInfo(flightData: {
    date: string;
    segments: FlightSegment[];
    name: string;
  }) {
    // Check if flight name contains "sinvue" or "sin vue"
    if (flightData.name && flightData.name.toLowerCase().match(/sin\s*vue/)) {
      return null;
    }

    if (!flightData?.segments?.length) return null;

    const segments = flightData.segments;
    const firstSegment = segments[0];
    const lastSegment = segments[segments.length - 1];

    // Define if it has stops
    const hasStops = segments.length > 1;
    const stops = segments.length - 1;

    // Calculate stopover city if applicable
    let stopCity = hasStops ? segments[0].arrivalCity : '';

    // Check if arrival is next day
    const departure = this.formatTime(firstSegment.departureTime);
    const arrival = this.formatTime(lastSegment.arrivalTime);
    const isNextDay = arrival < departure;

    // Format segments with next day indicator
    const formattedSegments = segments.map((segment) => {
      const segDeparture = this.formatTime(segment.departureTime);
      const segArrival = this.formatTime(segment.arrivalTime);
      const segIsNextDay = segArrival < segDeparture;

      return {
        airline: segment.airline,
        flightNumber: segment.flightNumber,
        departureTime: segment.departureTime,
        arrivalTime: segment.arrivalTime,
        departureCity: segment.departureCity,
        arrivalCity: segment.arrivalCity,
        departureIata: segment.departureIata,
        arrivalIata: segment.arrivalIata,
        isNextDay: segIsNextDay,
      };
    });

    return {
      departureTime: firstSegment.departureTime,
      arrivalTime: lastSegment.arrivalTime,
      date: flightData.date,
      departureAirport: `${firstSegment.departureCity} (${firstSegment.departureIata})`,
      arrivalAirport: `${lastSegment.arrivalCity} (${lastSegment.arrivalIata})`,
      duration: this.calculateFlightDuration(
        firstSegment.departureTime,
        lastSegment.arrivalTime
      ),
      hasStops,
      stops,
      stopCity,
      isNextDay,
      segments: formattedSegments,
    };
  }

  // Method to format time string to Date object
  private formatTime(timeString: string): Date {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0);
    return date;
  }

  // Method to calculate flight duration
  private calculateFlightDuration(
    departureTime: string,
    arrivalTime: string
  ): string {
    const departure = this.formatTime(departureTime);
    const arrival = this.formatTime(arrivalTime);
    if (arrival < departure) {
      arrival.setDate(arrival.getDate() + 1);
    }
    const duration = (arrival.getTime() - departure.getTime()) / (1000 * 60);
    const hours = Math.floor(duration / 60);
    const minutes = Math.floor(duration % 60);
    return `${hours}h ${minutes}m`;
  }

  // Caché de aerolíneas a nivel de componente
  private airlineCache: { [prefix: string]: string } = {};
  // Control de solicitudes en curso
  private pendingRequests: { [prefix: string]: Observable<string> } = {};

  /**
   * Obtiene los nombres de las aerolíneas a partir de los números de vuelo
   * @param flightNumbers Array de números de vuelo
   * @returns String con los nombres de las aerolíneas
   */
  getAirlineNamesByFlightNumbers(flightNumbers: string[]): string {
    if (!flightNumbers || flightNumbers.length === 0) {
      return '';
    }

    // Extraer prefijos IATA únicos de los números de vuelo
    const prefixesIATA = flightNumbers
      .filter((flightNumber) => flightNumber)
      .map((flightNumber) => {
        // Extraer las dos primeras letras del número de vuelo
        const prefixIATA = flightNumber.substring(0, 2);
        return prefixIATA;
      })
      .filter((prefix) => prefix.length === 2); // Asegurarse de que el prefijo tiene 2 caracteres

    // Eliminar duplicados
    const uniquePrefixesIATA = [...new Set(prefixesIATA)];

    // Si no hay prefijos válidos, devolver cadena vacía
    if (uniquePrefixesIATA.length === 0) {
      return '';
    }

    // Verificar si tenemos todos los prefijos en caché
    const cachedNames = uniquePrefixesIATA
      .filter((prefix) => this.airlineCache[prefix])
      .map((prefix) => this.airlineCache[prefix]);

    // Si tenemos todos los prefijos en caché, devolver los nombres
    if (cachedNames.length === uniquePrefixesIATA.length) {
      return cachedNames.join(', ');
    }

    // Prefijos que necesitamos cargar
    const prefixesToLoad = uniquePrefixesIATA.filter(
      (prefix) => !this.airlineCache[prefix]
    );

    // Crear observables para cada prefijo que necesitamos cargar
    const requests: Observable<string>[] = prefixesToLoad.map((prefix) => {
      // Si ya hay una solicitud en curso para este prefijo, reutilizarla
      if (this.pendingRequests[prefix]) {
        return this.pendingRequests[prefix];
      }

      // Crear una nueva solicitud
      const request = this.airlinesService
        .getAirlines({ codeIATA: prefix })
        .pipe(
          map((airlines) => {
            const airlineName =
              airlines && airlines.length > 0
                ? airlines[0].name || prefix
                : prefix;
            this.airlineCache[prefix] = airlineName;
            return airlineName;
          }),
          catchError(() => {
            this.airlineCache[prefix] = prefix;
            return of(prefix);
          })
        );

      // Guardar la solicitud en el mapa de solicitudes pendientes
      this.pendingRequests[prefix] = request;

      return request;
    });

    // Si hay solicitudes para cargar, hacerlas en paralelo
    if (requests.length > 0) {
      forkJoin(requests).subscribe(() => {
        // Limpiar las solicitudes pendientes
        prefixesToLoad.forEach((prefix) => {
          delete this.pendingRequests[prefix];
        });
      });
    }

    // Devolver los nombres que tenemos en caché y los prefijos para los que no tenemos nombres
    return uniquePrefixesIATA
      .map((prefix) => this.airlineCache[prefix] || prefix)
      .join(', ');
  }
}
