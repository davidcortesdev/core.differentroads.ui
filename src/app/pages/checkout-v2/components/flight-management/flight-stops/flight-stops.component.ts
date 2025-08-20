import { Component, Input, OnInit } from '@angular/core';
import {
  FlightsNetService,
  IFlightDetailDTO as IFlightsNetFlightDetailDTO,
} from '../../../services/flightsNet.service';
import {
  FlightSearchService,
  IFlightDetailDTO as IFlightSearchFlightDetailDTO,
} from '../../../../../core/services/flight-search.service';
import { AirportCityCacheService } from '../../../../../core/services/airport-city-cache.service';

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
  citiesLoaded = false; // Nueva propiedad para controlar si las ciudades están cargadas

  constructor(
    private flightsNetService: FlightsNetService,
    private flightSearchService: FlightSearchService,
    private airportCityCacheService: AirportCityCacheService
  ) {}

  async ngOnInit(): Promise<void> {
    if (this.useNewService) {
      // Para el nuevo servicio: permitir flightId = 0 y packId = 0
      // ya que 0 es un ID válido en la base de datos
      if (this.flightId !== null && this.flightId !== undefined && 
          this.packId !== null && this.packId !== undefined) {
        console.log(`🔄 FlightStops: Iniciando con nuevo servicio - flightId=${this.flightId}, packId=${this.packId}`);
        await this.getFlightDetail();
      } else {
        console.warn(`⚠️ FlightStops: Valores inválidos para nuevo servicio - flightId=${this.flightId}, packId=${this.packId}`);
      }
    } else {
      // Para el servicio actual: mantener la comprobación original
      if (this.flightId) {
        console.log(`🔄 FlightStops: Iniciando con servicio actual - flightId=${this.flightId}`);
        await this.getFlightDetail();
      } else {
        console.warn(`⚠️ FlightStops: flightId inválido para servicio actual - flightId=${this.flightId}`);
      }
    }
  }

  private async getFlightDetail(): Promise<void> {
    if (this.useNewService) {
      // Usar el nuevo FlightSearchService
      await this.getFlightDetailFromNewService();
    } else {
      // Usar el servicio actual (FlightsNetService)
      await this.getFlightDetailFromCurrentService();
    }
  }

  private async getFlightDetailFromNewService(): Promise<void> {
    console.log(`🔄 FlightStops: Obteniendo detalles del nuevo servicio - packId=${this.packId}, flightId=${this.flightId}`);
    this.flightSearchService.getFlightDetails(this.packId, this.flightId.toString()).subscribe({
      next: async (detail) => {
        console.log(`✅ FlightStops: Detalles obtenidos del nuevo servicio:`, detail);
        this.flightDetail = detail;
        
        // Precargar ciudades de los segmentos del vuelo y esperar a que se completen
        await this.preloadCitiesFromSegments();
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error(`❌ FlightStops: Error al obtener detalles del nuevo servicio:`, error);
        this.isLoading = false;
      },
    });
  }

  private async getFlightDetailFromCurrentService(): Promise<void> {
    console.log(`🔄 FlightStops: Obteniendo detalles del servicio actual - flightId=${this.flightId}`);
    this.flightsNetService.getFlightDetail(this.flightId).subscribe({
      next: async (detail) => {
        console.log(`✅ FlightStops: Detalles obtenidos del servicio actual:`, detail);
        this.flightDetail = detail;
        
        // Precargar ciudades de los segmentos del vuelo y esperar a que se completen
        await this.preloadCitiesFromSegments();
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error(`❌ FlightStops: Error al obtener detalles del servicio actual:`, error);
        this.isLoading = false;
      },
    });
  }

  /**
   * Precarga las ciudades de los segmentos del vuelo para asegurar que estén disponibles
   */
  private async preloadCitiesFromSegments(): Promise<void> {
    if (!this.flightDetail) return;

    const segments = this.getFlightSegments();
    if (!segments || segments.length === 0) {
      this.citiesLoaded = true;
      return;
    }

    // Extraer códigos IATA únicos de los segmentos
    const airportCodes: string[] = [];
    segments.forEach(segment => {
      if (segment.departureIata && !airportCodes.includes(segment.departureIata)) {
        airportCodes.push(segment.departureIata);
      }
      if (segment.arrivalIata && !airportCodes.includes(segment.arrivalIata)) {
        airportCodes.push(segment.arrivalIata);
      }
    });

    if (airportCodes.length > 0) {
      console.log(`🔄 FlightStops: Precargando ciudades para ${airportCodes.length} aeropuertos`);
      try {
        await this.airportCityCacheService.preloadAllAirportCities(airportCodes);
        console.log('✅ FlightStops: Ciudades precargadas exitosamente');
      } catch (error) {
        console.warn('⚠️ FlightStops: Error al precargar ciudades:', error);
      }
    }
    
    this.citiesLoaded = true;
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

  /**
   * Obtiene los segmentos del vuelo con nombres de ciudades transformados
   */
  getFlightSegments(): any[] {
    if (!this.flightDetail) return [];
    
    let segments: any[] = [];
    
    if (this.useNewService) {
      const newDetail = this.flightDetail as IFlightSearchFlightDetailDTO;
      segments = newDetail.segments || [];
    } else {
      const currentDetail = this.flightDetail as IFlightsNetFlightDetailDTO;
      segments = currentDetail.segments || [];
    }
    
    // Transformar segmentos para incluir nombres de ciudades
    return this.transformSegmentsWithCityNames(segments);
  }

  /**
   * Transforma los segmentos para incluir nombres de ciudades desde el cache
   */
  private transformSegmentsWithCityNames(segments: any[]): any[] {
    if (!segments || segments.length === 0) return [];
    
    console.log('🔄 FlightStops: Transformando segmentos con nombres de ciudades');
    
    const transformedSegments = segments.map(segment => {
      const departureCity = this.airportCityCacheService.getCityNameFromCache(segment.departureIata) || segment.departureIata;
      const arrivalCity = this.airportCityCacheService.getCityNameFromCache(segment.arrivalIata) || segment.arrivalIata;
      
      console.log(`📍 Segmento: ${segment.departureIata} (${departureCity}) → ${segment.arrivalIata} (${arrivalCity})`);
      
      return {
        ...segment,
        departureCity,
        arrivalCity
      };
    });
    
    console.log('✅ FlightStops: Segmentos transformados:', transformedSegments);
    return transformedSegments;
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
