import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import {
  IFlightPackDTO,
  IFlightDetailDTO,
} from '../../../services/flightsNet.service';

@Component({
  selector: 'app-flight-item',
  standalone: false,
  templateUrl: './flight-item.component.html',
  styleUrl: './flight-item.component.scss',
})
export class FlightItemComponent implements OnInit {
  @Input() flightPack: IFlightPackDTO | null = null;
  @Input() selectedFlight: IFlightPackDTO | null = null;
  @Input() flightDetails: Map<number, IFlightDetailDTO> = new Map();
  @Output() flightSelected = new EventEmitter<IFlightPackDTO>();

  FLIGHT_TYPE_SALIDA = 4;

  ngOnInit(): void {
    console.log('=== VUELOS RECIBIDOS ===');

    if (this.flightPack && this.flightPack.flights) {
      console.log('Paquete de vuelos:', {
        id: this.flightPack.id,
        code: this.flightPack.code,
        name: this.flightPack.name,
        description: this.flightPack.description,
      });

      console.log('Número de vuelos:', this.flightPack.flights.length);

      this.flightPack.flights.forEach((flight, index) => {
        console.log(`Vuelo ${index + 1}:`, {
          id: flight.id,
          tipo:
            flight.flightTypeId === this.FLIGHT_TYPE_SALIDA ? 'IDA' : 'VUELTA',
          origen: `${flight.departureCity} (${flight.departureIATACode})`,
          destino: `${flight.arrivalCity} (${flight.arrivalIATACode})`,
          fechaSalida: flight.departureDate,
          horaSalida: flight.departureTime,
          fechaLlegada: flight.arrivalDate,
          horaLlegada: flight.arrivalTime,
        });
      });
    } else {
      console.log('No hay vuelos disponibles');
    }

    console.log('========================');
  }

  getAirlinesText(flightId: number): string {
    const detail = this.flightDetails.get(flightId);
    if (!detail || !detail.airlines) return '';
    return detail.airlines.join(', ');
  }

  formatTime(time: any): string {
    return time ? time.slice(0, 5) : '--:--';
  }

  selectFlight(flightPack: IFlightPackDTO): void {
    this.flightSelected.emit(flightPack);
  }
}
