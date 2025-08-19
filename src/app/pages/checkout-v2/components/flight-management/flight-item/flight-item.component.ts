import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  IFlightPackDTO,
  IFlightDetailDTO,
} from '../../../services/flightsNet.service';
import { FlightSearchService, IFlightDetailDTO as IFlightSearchFlightDetailDTO } from '../../../../../core/services/flight-search.service';

@Component({
  selector: 'app-flight-item',
  standalone: false,
  templateUrl: './flight-item.component.html',
  styleUrl: './flight-item.component.scss',
})
export class FlightItemComponent implements OnInit, OnDestroy {
  @Input() flightPack: IFlightPackDTO | null = null;
  @Input() selectedFlight: IFlightPackDTO | null = null;
  @Input() flightDetails: Map<number, IFlightDetailDTO> = new Map();
  /**
   * Controla qué servicio usar en el componente flight-stops:
   * - false (default): Usa FlightsNetService (comportamiento actual)
   * - true: Usa FlightSearchService (nuevo servicio)
   */
  @Input() useNewService: boolean = false;
  @Output() flightSelected = new EventEmitter<IFlightPackDTO>();

  FLIGHT_TYPE_SALIDA = 4;
  
  // Propiedades privadas para manejo interno
  private internalFlightDetails: Map<number, IFlightDetailDTO | IFlightSearchFlightDetailDTO> = new Map();
  private readonly destroy$ = new Subject<void>();

  constructor(private flightSearchService: FlightSearchService) {}

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

      // Si useNewService es true, cargar detalles internamente
      if (this.useNewService) {
        this.loadFlightDetailsInternally();
      }
    } else {
      console.log('No hay vuelos disponibles');
    }

    console.log('========================');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carga los detalles de vuelos internamente cuando useNewService es true
   */
  private loadFlightDetailsInternally(): void {
    if (!this.flightPack || !this.flightPack.flights) return;

    console.log(`🔄 FlightItem: Cargando detalles internamente para paquete ${this.flightPack.id}`);

    this.flightPack.flights.forEach(flight => {
      this.flightSearchService.getFlightDetails(this.flightPack!.id, flight.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (detail) => {
            // Mapear los datos del nuevo servicio al formato esperado por FlightsNetService
            const mappedDetail: IFlightDetailDTO = {
              numScales: detail.numScales,
              duration: detail.duration,
              airlines: detail.airlines || [],
              segments: detail.segments?.map(segment => ({
                id: segment.id,
                tkId: segment.tkId || '',
                flightId: segment.flightId,
                tkServiceId: segment.tkServiceId || '',
                tkJourneyId: segment.tkJourneyId || '',
                segmentRank: segment.segmentRank,
                departureCity: segment.departureCity || '',
                departureTime: segment.departureTime || '',
                departureIata: segment.departureIata || '',
                arrivalCity: segment.arrivalCity || '',
                arrivalTime: segment.arrivalTime || '',
                arrivalIata: segment.arrivalIata || '',
                flightNumber: segment.flightNumber || '',
                goSegment: segment.goSegment,
                returnSegment: segment.returnSegment,
                duringSegment: segment.duringSegment,
                type: segment.type || '',
                numNights: segment.numNights,
                differential: segment.differential,
                tkProviderId: segment.tkProviderId,
                departureDate: segment.departureDate || '',
                arrivalDate: segment.arrivalDate || ''
              })) || []
            };
            
            this.internalFlightDetails.set(flight.id, mappedDetail);
            console.log(`✅ FlightItem: Detalles cargados para vuelo ${flight.id}:`, mappedDetail);
          },
          error: (error) => {
            console.warn(`⚠️ FlightItem: Error al cargar detalles para vuelo ${flight.id}:`, error);
          }
        });
    });
  }

  /**
   * Obtiene los detalles de vuelo, priorizando los internos si useNewService es true
   */
  getFlightDetails(flightId: number): IFlightDetailDTO | IFlightSearchFlightDetailDTO | undefined {
    if (this.useNewService) {
      return this.internalFlightDetails.get(flightId);
    } else {
      return this.flightDetails.get(flightId);
    }
  }

  getAirlinesText(flightId: number): string {
    const detail = this.getFlightDetails(flightId);
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
