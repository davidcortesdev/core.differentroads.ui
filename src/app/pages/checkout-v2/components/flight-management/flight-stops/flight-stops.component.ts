import { Component, Input, OnInit } from '@angular/core';
import {
  FlightsNetService,
  IFlightDetailDTO,
} from '../../../services/flightsNet.service';

@Component({
  selector: 'app-flight-stops',
  standalone: false,
  templateUrl: './flight-stops.component.html',
  styleUrl: './flight-stops.component.scss',
})
export class FlightStopsComponent implements OnInit {
  @Input() flightId!: number;

  flightDetail: IFlightDetailDTO | null = null;
  isLoading = true;

  constructor(private flightsNetService: FlightsNetService) {}

  ngOnInit(): void {
    if (this.flightId) {
      this.getFlightDetail();
    }
  }

  private getFlightDetail(): void {
    this.flightsNetService.getFlightDetail(this.flightId).subscribe({
      next: (detail) => {
        this.flightDetail = detail;
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error loading flight detail:', error);
      },
    });
  }

  formatTime(time: any): string {
    return time ? time.slice(0, 5) : '--:--';
  }

  getFlightStopsText(): string {
    if (this.isLoading) return 'Cargando...';
    if (!this.flightDetail) return 'Error';
    return this.flightDetail.numScales === 1
      ? 'Directo'
      : this.flightDetail.numScales + ' escalas';
  }

  getFlightSegments(): any[] {
    return this.flightDetail && this.flightDetail.segments
      ? this.flightDetail.segments
      : [];
  }
}
