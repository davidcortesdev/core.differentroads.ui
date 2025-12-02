import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  IFlightPackDTO,
  IFlightDetailDTO,
} from '../../../services/flightsNet.service';
import { FlightSearchService, IFlightDetailDTO as IFlightSearchFlightDetailDTO } from '../../../../../core/services/flight/flight-search.service';
import { FlightsNetService } from '../../../services/flightsNet.service';

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
  @Input() availablePlaces?: number;
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

  constructor(
    private flightSearchService: FlightSearchService,
    private flightsNetService: FlightsNetService
  ) {}

  ngOnInit(): void {
    console.log('=== VUELOS RECIBIDOS ===');

    if (this.flightPack && this.flightPack.flights) {
      // ✅ NUEVO: Ordenar flights por flightTypeId ascendente
      this.flightPack.flights.sort((a, b) => a.flightTypeId - b.flightTypeId);
      
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
        //console.log('🔄 FlightItem: Iniciando carga de detalles y aerolíneas con nuevo servicio');
        this.loadFlightDetailsInternally();
      } else {
        //console.log('ℹ️ FlightItem: Usando servicio actual, no se cargan detalles internamente');
      }
    } else {
      console.log('No hay vuelos disponibles');
    }

    console.log('========================');
  }

  ngOnDestroy(): void {
    this.internalFlightDetails.clear();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Verifica si este vuelo está seleccionado, considerando que selectedFlight
   * puede venir de diferentes fuentes (default-flights o specific-search)
   */
  isFlightSelected(): boolean {
    if (!this.selectedFlight || !this.flightPack) {
      return false;
    }

    const isSelected = this.selectedFlight.id === this.flightPack.id;
    
    // Logging para debugging
    if (isSelected) {
      //console.log(`✅ FlightItem: Vuelo ${this.flightPack.id} está seleccionado`);
      //console.log(`📊 selectedFlight ID: ${this.selectedFlight.id}, flightPack ID: ${this.flightPack.id}`);
    }

    return isSelected;
  }

  /**
   * Obtiene el texto del botón de selección
   */
  getSelectionButtonText(): string {
    return this.isFlightSelected() ? 'Seleccionado' : 'Seleccionar';
  }

  /**
   * Obtiene la clase CSS del botón de selección
   */
  getSelectionButtonClass(): string {
    return this.isFlightSelected() ? 'selected-flight-button' : '';
  }

  /**
   * Verifica si el vuelo tiene disponibilidad
   */
  hasAvailability(): boolean {
    // Si availablePlaces es undefined, asumir que hay disponibilidad (aún no se ha cargado)
    if (this.availablePlaces === undefined) {
      return true;
    }
    // Si availablePlaces es 0, no hay disponibilidad
    return this.availablePlaces > 0;
  }

  /**
   * Verifica si el botón debe estar deshabilitado
   */
  isButtonDisabled(): boolean {
    // Solo deshabilitar si no hay disponibilidad Y el vuelo NO está seleccionado
    // Si el vuelo está seleccionado, siempre debe poder deseleccionarse
    return !this.hasAvailability() && !this.isFlightSelected();
  }

  /**
   * Obtiene información del estado de selección para debugging
   */
  getSelectionDebugInfo(): string {
    if (!this.selectedFlight) {
      return 'No hay vuelo seleccionado';
    }
    
    if (!this.flightPack) {
      return 'No hay paquete de vuelo';
    }
    
    return `Selected: ${this.selectedFlight.id} (${this.selectedFlight.name || 'Sin nombre'}), Current: ${this.flightPack.id} (${this.flightPack.name || 'Sin nombre'})`;
  }

  /**
   * Carga los detalles de vuelos internamente cuando useNewService es true
   */
  private loadFlightDetailsInternally(): void {
    if (!this.flightPack || !this.flightPack.flights) return;

    //console.log(`🔄 FlightItem: Cargando detalles internamente para paquete ${this.flightPack.id}`);

    this.flightPack.flights.forEach(flight => {
      this.flightSearchService.getFlightDetails(this.flightPack!.id, flight.id.toString())
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (detail) => {
            // Mapear los datos del nuevo servicio al formato esperado por FlightsNetService
            const mappedSegments = detail.segments?.map(segment => ({
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
            })) || [];
            
            // Ordenar segmentos por segmentRank
            const sortedSegments = mappedSegments.sort((a, b) => a.segmentRank - b.segmentRank);
            
            const mappedDetail: IFlightDetailDTO = {
              numScales: detail.numScales,
              duration: detail.duration,
              airlines: detail.airlines || [],
              segments: sortedSegments
            };
            
            this.internalFlightDetails.set(flight.id, mappedDetail);
            //console.log(`✅ FlightItem: Detalles cargados para vuelo ${flight.id}:`, mappedDetail);

            // Precargar nombres de aerolíneas en el servicio (la cache se maneja automáticamente)
            if (detail.airlines && detail.airlines.length > 0) {
              this.preloadAirlineNames(detail.airlines);
            }
          },
          error: (error) => {
            console.warn(`⚠️ FlightItem: Error al cargar detalles para vuelo ${flight.id}:`, error);
          }
        });
    });
  }

  /**
   * Precarga los nombres de las aerolíneas en el servicio (la cache se maneja automáticamente)
   */
  private preloadAirlineNames(airlineCodes: string[]): void {
    // Usar el método optimizado del servicio para precargar múltiples aerolíneas
    this.flightsNetService.preloadAirlines(airlineCodes)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (airlineNames) => {
          //console.log(`✅ FlightItem: ${airlineNames.length} aerolíneas precargadas exitosamente`);
        },
        error: (error) => {
          console.warn(`⚠️ FlightItem: Error al precargar aerolíneas:`, error);
        }
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

  /**
   * Obtiene el nombre de una aerolínea por su código IATA
   * @param airlineCode Código IATA de la aerolínea
   * @returns Nombre de la aerolínea o el código si no se encuentra
   */
  getAirlineName(airlineCode: string): string {
    if (this.useNewService) {
      return this.flightsNetService.getAirlineNameFromCache(airlineCode);
    } else {
      // Para el servicio actual, devolver el código tal como está
      return airlineCode;
    }
  }

  getAirlinesText(flightId: number): string {
    if (this.useNewService) {
      // Para el nuevo servicio, usar los nombres de aerolíneas desde la cache del servicio
      const detail = this.getFlightDetails(flightId);
      if (!detail || !detail.airlines) return '';
      
      return detail.airlines.map(code => {
        return this.flightsNetService.getAirlineNameFromCache(code);
      }).join(', ');
    } else {
      // Para el servicio actual, usar el comportamiento original
      const detail = this.getFlightDetails(flightId);
      if (!detail || !detail.airlines) return '';
      return detail.airlines.join(', ');
    }
  }

  formatTime(time: any): string {
    return time ? time.slice(0, 5) : '--:--';
  }

  /**
   * Obtiene el precio del vuelo formateado o "N/A" si es null o undefined
   */
  getFlightPrice(): string {
    const price = this.flightPack?.ageGroupPrices?.[0]?.price;
    
    // Si el precio es null o undefined, mostrar N/A
    if (price == null) {
      return 'N/A';
    }
    
    // Formatear el precio usando el mismo formato que el pipe currencyFormat
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      useGrouping: true,
    }).format(price);
  }

  selectFlight(flightPack: IFlightPackDTO): void {
    // Prevenir selección si no hay disponibilidad
    if (!this.hasAvailability()) {
      return;
    }
    this.flightSelected.emit(flightPack);
  }
}
