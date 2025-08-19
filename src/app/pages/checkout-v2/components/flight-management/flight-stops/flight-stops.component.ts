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
    if (this.useNewService) {
      // Para el nuevo servicio: permitir flightId = 0 y packId = 0
      // ya que 0 es un ID válido en la base de datos
      if (this.flightId !== null && this.flightId !== undefined && 
          this.packId !== null && this.packId !== undefined) {
        console.log(`🔄 FlightStops: Iniciando con nuevo servicio - flightId=${this.flightId}, packId=${this.packId}`);
        this.getFlightDetail();
      } else {
        console.warn(`⚠️ FlightStops: Valores inválidos para nuevo servicio - flightId=${this.flightId}, packId=${this.packId}`);
      }
    } else {
      // Para el servicio actual: mantener la comprobación original
      if (this.flightId) {
        console.log(`🔄 FlightStops: Iniciando con servicio actual - flightId=${this.flightId}`);
        this.getFlightDetail();
      } else {
        console.warn(`⚠️ FlightStops: flightId inválido para servicio actual - flightId=${this.flightId}`);
      }
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
    console.log(`🔄 FlightStops: Obteniendo detalles del nuevo servicio - packId=${this.packId}, flightId=${this.flightId}`);
    this.flightSearchService.getFlightDetails(this.packId, this.flightId).subscribe({
      next: (detail) => {
        console.log(`✅ FlightStops: Detalles obtenidos del nuevo servicio:`, detail);
        this.flightDetail = detail;
        this.isLoading = false;
      },
      error: (error) => {
        console.error(`❌ FlightStops: Error al obtener detalles del nuevo servicio:`, error);
        this.isLoading = false;
      },
    });
  }

  private getFlightDetailFromCurrentService(): void {
    console.log(`🔄 FlightStops: Obteniendo detalles del servicio actual - flightId=${this.flightId}`);
    this.flightsNetService.getFlightDetail(this.flightId).subscribe({
      next: (detail) => {
        console.log(`✅ FlightStops: Detalles obtenidos del servicio actual:`, detail);
        this.flightDetail = detail;
        this.isLoading = false;
      },
      error: (error) => {
        console.error(`❌ FlightStops: Error al obtener detalles del servicio actual:`, error);
        this.isLoading = false;
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
