import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import {
  IFlightPackDTO,
  IFlightResponse,
} from '../../services/flightsNet.service';

@Component({
  selector: 'app-flight-section-v2',
  templateUrl: './flight-section.component.html',
  styleUrls: ['./flight-section.component.scss'],
  standalone: false,
})
export class FlightSectionV2Component implements OnChanges {
  @Input() flightPack: IFlightPackDTO | null = null;

  departureFlight: IFlightResponse | null = null;
  returnFlight: IFlightResponse | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['flightPack'] && this.flightPack) {
      this.processFlightData();
    }
  }

  private processFlightData(): void {
    if (!this.flightPack || !this.flightPack.flights) {
      return;
    }

    // Separar vuelos de ida y vuelta
    this.departureFlight =
      this.flightPack.flights.find((f) => f.flightTypeId === 4) || null;
    this.returnFlight =
      this.flightPack.flights.find((f) => f.flightTypeId !== 4) || null;
  }

  formatTime(time: string | undefined): string {
    if (!time) return '--:--';
    // Asegurar que el tiempo esté en formato HH:MM
    const timeParts = time.split(':');
    if (timeParts.length >= 2) {
      return `${timeParts[0].padStart(2, '0')}:${timeParts[1].padStart(
        2,
        '0'
      )}`;
    }
    return time.slice(0, 5);
  }

  formatDate(date: string | undefined): string {
    if (!date) return '';

    try {
      // Parsear la fecha directamente sin agregar tiempo para evitar problemas de zona horaria
      const [year, month, day] = date.split('-').map(Number);
      
      // Crear fecha usando los componentes individuales
      const dateObj = new Date(year, month - 1, day); // month - 1 porque los meses van de 0-11

      // Verificar que la fecha es válida
      if (isNaN(dateObj.getTime())) {
        return '';
      }

      // Formatear usando toLocaleDateString con opciones específicas
      return dateObj
        .toLocaleDateString('es-ES', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
        .replace(/^\w/, (c) => c.toUpperCase());
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  }

  getFlightDescription(flight: IFlightResponse): string {
    if (!flight) return '';
    return `${flight.departureCity} (${flight.departureIATACode}) - ${flight.arrivalCity} (${flight.arrivalIATACode})`;
  }

  getFlightDuration(flight: IFlightResponse): string {
    if (!flight || !flight.departureTime || !flight.arrivalTime) return '';

    try {
      const departure = new Date(`2000-01-01T${flight.departureTime}:00`);
      const arrival = new Date(`2000-01-01T${flight.arrivalTime}:00`);

      // Si la llegada es antes que la salida, asumir que es al día siguiente
      if (arrival < departure) {
        arrival.setDate(arrival.getDate() + 1);
      }

      const diffMs = arrival.getTime() - departure.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      if (diffHours > 0) {
        return `${diffHours}h ${diffMinutes}m`;
      } else {
        return `${diffMinutes}m`;
      }
    } catch (error) {
      return '';
    }
  }
}
