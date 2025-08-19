import { Component, Input, OnInit } from '@angular/core';
import {
  FlightsNetService,
  IFlightDetailDTO as IFlightsNetFlightDetailDTO,
} from '../../../services/flightsNet.service';
import {
  FlightSearchService,
  IFlightDetailDTO as IFlightSearchFlightDetailDTO,
} from '../../../../../core/services/flight-search.service';

@Component({
  selector: 'app-flight-stops',
  standalone: false,
  templateUrl: './flight-stops.component.html',
  styleUrl: './flight-stops.component.scss',
})
export class FlightStopsComponent implements OnInit {
  @Input() flightId!: number;
  @Input() packId!: number; // Nuevo parámetro para el ID del paquete
  /**
   * Controla qué servicio usar para obtener los detalles del vuelo:
   * - false (default): Usa FlightsNetService (comportamiento actual)
   * - true: Usa FlightSearchService (nuevo servicio con endpoint /api/FlightSearch/{packId}/details/{flightId})
   */
  @Input() useNewService: boolean = false;

  flightDetail: IFlightsNetFlightDetailDTO | IFlightSearchFlightDetailDTO | null = null;
  isLoading = true;

  constructor(
    private flightsNetService: FlightsNetService,
    private flightSearchService: FlightSearchService
  ) {}

  ngOnInit(): void {
    if (this.flightId) {
      this.getFlightDetail();
    }
  }

  private getFlightDetail(): void {
    if (this.useNewService) {
      // Usar el nuevo FlightSearchService
      this.getFlightDetailFromNewService();
    } else {
      // Usar el servicio actual (FlightsNetService)
      this.getFlightDetailFromCurrentService();
    }
  }

  private getFlightDetailFromNewService(): void {
    this.flightSearchService.getFlightDetails(this.packId, this.flightId).subscribe({
      next: (detail) => {
        this.flightDetail = detail;
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error loading flight detail from new service:', error);
      },
    });
  }

  private getFlightDetailFromCurrentService(): void {
    this.flightsNetService.getFlightDetail(this.flightId).subscribe({
      next: (detail) => {
        this.flightDetail = detail;
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error loading flight detail from current service:', error);
      },
    });
  }

  formatTime(time: any): string {
    return time ? time.slice(0, 5) : '--:--';
  }

  getFlightStopsText(): string {
    if (this.isLoading) return 'Cargando...';
    if (!this.flightDetail) return 'Error';
    
    // Manejar ambos tipos de respuesta
    if (this.useNewService) {
      const newDetail = this.flightDetail as IFlightSearchFlightDetailDTO;
      return newDetail.numScales === 0
        ? 'Directo'
        : newDetail.numScales === 1
        ? '1 escala'
        : newDetail.numScales + ' escalas';
    } else {
      const currentDetail = this.flightDetail as IFlightsNetFlightDetailDTO;
      return currentDetail.numScales === 1
        ? 'Directo'
        : currentDetail.numScales + ' escalas';
    }
  }

  getFlightSegments(): any[] {
    if (!this.flightDetail) return [];
    
    if (this.useNewService) {
      const newDetail = this.flightDetail as IFlightSearchFlightDetailDTO;
      return newDetail.segments || [];
    } else {
      const currentDetail = this.flightDetail as IFlightsNetFlightDetailDTO;
      return currentDetail.segments || [];
    }
  }

  // Método para obtener aerolíneas (solo para el servicio actual)
  getAirlinesText(): string {
    if (!this.flightDetail) return '';
    
    if (this.useNewService) {
      const newDetail = this.flightDetail as IFlightSearchFlightDetailDTO;
      return newDetail.airlines?.join(', ') || '';
    } else {
      const currentDetail = this.flightDetail as IFlightsNetFlightDetailDTO;
      return currentDetail.airlines?.join(', ') || '';
    }
  }
}
