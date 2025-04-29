import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { Flight } from '../../../core/models/tours/flight.model';

@Component({
  selector: 'app-booking-flights',
  templateUrl: './booking-flights.component.html',
  styleUrls: ['./booking-flights.component.scss'],
  standalone: false,
})
export class BookingFlightsComponent implements OnInit, OnChanges {
  @Input() flight!: Flight; // Recibe el vuelo seleccionado

  constructor() {}

  ngOnInit(): void {
    this.validateFlightData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['flight']) {
      this.validateFlightData();
    }
  }

  /**
   * Verifica si hay información válida de vuelos
   * @returns true si hay al menos un segmento válido en ida o vuelta
   */
  hasValidFlightData(): boolean {
    // Verificar si hay datos de vuelo
    if (!this.flight) return false;

    // Verificar si hay segmentos de ida válidos
    const hasOutbound = this.hasValidSegments(this.flight.outbound?.segments);

    // Verificar si hay segmentos de vuelta válidos
    const hasInbound = this.hasValidSegments(this.flight.inbound?.segments);

    // Devolver true si hay al menos un segmento válido en ida o vuelta
    return hasOutbound || hasInbound;
  }

  /**
   * Verifica si los segmentos proporcionados son válidos
   * @param segments Array de segmentos a verificar
   * @returns true si hay al menos un segmento válido
   */
  private hasValidSegments(segments: any[] | undefined): boolean {
    // Si no hay segmentos, devolver false
    if (!segments || !segments.length) return false;

    // Verificar cada segmento para determinar si al menos uno tiene información válida
    return segments.some((segment) => {
      // Verificar si el número de vuelo no es "SV" (Sin Vuelos)
      const hasValidFlightNumber =
        segment.flightNumber && segment.flightNumber !== 'SV';

      // Verificar si hay ciudades de origen y destino válidas
      const hasValidCities =
        segment.departureCity &&
        segment.departureCity !== 'SV' &&
        segment.arrivalCity &&
        segment.arrivalCity !== 'SV';

      // Verificar que la aerolínea no contenga la palabra "sin"
      const hasValidAirline =
        segment.airline?.name &&
        !segment.airline.name.toLowerCase().includes('sin ') &&
        !segment.airline.name.toLowerCase().includes('sinvue');

      // Un segmento es válido si tiene número de vuelo, ciudades válidas y aerolínea válida
      return hasValidFlightNumber && hasValidCities && hasValidAirline;
    });
  }

  private validateFlightData(): void {
    if (!this.flight) {
      console.error('Flight data is undefined or null');
      return;
    }

    // Validar que los segmentos tengan la información necesaria
    if (this.flight.outbound?.segments?.length) {
      const firstSegment = this.flight.outbound.segments[0];
    }

    if (this.flight.inbound?.segments?.length) {
      const firstSegment = this.flight.inbound.segments[0];
    }
  }
}
