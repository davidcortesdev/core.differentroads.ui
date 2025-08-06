import {
  Component,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { IFlightPackDTO, IFlightDetailDTO } from '../../../services/flightsNet.service';

@Component({
  selector: 'app-flight-item',
  standalone: false,
  templateUrl: './flight-item.component.html',
  styleUrl: './flight-item.component.scss',
})
export class FlightItemComponent {
  @Input() flightPack: IFlightPackDTO | null = null;
  @Input() selectedFlight: IFlightPackDTO | null = null;
  @Input() flightDetails: Map<number, IFlightDetailDTO> = new Map();
  @Output() flightSelected = new EventEmitter<IFlightPackDTO>();

  FLIGHT_TYPE_SALIDA = 4;

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