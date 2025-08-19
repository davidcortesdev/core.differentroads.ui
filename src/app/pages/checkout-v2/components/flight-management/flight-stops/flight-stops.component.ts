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
  @Input() autoSearch: boolean = true; // Control para búsqueda automática

  flightDetail: IFlightDetailDTO | null = null;
  isLoading = true;

  constructor(private flightsNetService: FlightsNetService) {}

  ngOnInit(): void {
    if (this.flightId && this.autoSearch) {
      this.getFlightDetail();
    } else if (this.flightId && !this.autoSearch) {
      // Si no se debe hacer búsqueda automática, solo mostrar estado de carga
      this.isLoading = false;
    }
  }

  // Método para hacer la búsqueda manualmente
  loadFlightDetail(): void {
    if (this.flightId && !this.isLoading) {
      this.isLoading = true;
      this.getFlightDetail();
    }
  }

  // Método para habilitar búsqueda automática y cargar datos
  enableAutoSearch(): void {
    this.autoSearch = true;
    if (this.flightId && !this.flightDetail) {
      this.loadFlightDetail();
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
    if (!this.flightDetail) {
      if (!this.autoSearch) {
        return 'Sin información'; // Cuando no se hace búsqueda automática
      }
      return 'Error';
    }
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
