import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import {
  IFlightPackDTO,
  IFlightResponse,
} from '../../services/flightsNet.service';
import { AirportCityCacheService } from '../../../../core/services/airport-city-cache.service';

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
  
  // ✅ NUEVO: Propiedad para controlar si se debe mostrar el componente
  shouldShowComponent: boolean = false;

  constructor(private airportCityCacheService: AirportCityCacheService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['flightPack'] && this.flightPack) {
      // ✅ NUEVO: Verificar si se debe mostrar el componente
      this.shouldShowComponent = this.shouldShowFlightSection();
      
      if (this.shouldShowComponent) {
        this.processFlightData();
        // Precargar ciudades de aeropuertos después de procesar los datos
        this.preloadAirportCities();
      }
    }
  }

  /**
   * ✅ NUEVO: Determina si se debe mostrar la sección de vuelos
   * Retorna false si es "sin vuelos" o si no hay vuelos válidos
   */
  private shouldShowFlightSection(): boolean {
    if (!this.flightPack) {
      return false;
    }

    // Verificar si es "sin vuelos" basándose en el nombre y descripción
    const name = this.flightPack.name?.toLowerCase() || '';
    const description = this.flightPack.description?.toLowerCase() || '';
    
    const isFlightlessOption = 
      name.includes('sin vuelos') ||
      description.includes('sin vuelos') ||
      name.includes('pack sin vuelos') ||
      description.includes('pack sin vuelos');

    if (isFlightlessOption) {
      console.log('🚫 FlightSection: Opción "sin vuelos" detectada, ocultando componente');
      return false;
    }

    // Verificar si hay vuelos válidos
    if (!this.flightPack.flights || this.flightPack.flights.length === 0) {
      console.log('🚫 FlightSection: No hay vuelos disponibles, ocultando componente');
      return false;
    }

    // Verificar si hay al menos un vuelo con información válida
    const hasValidFlights = this.flightPack.flights.some(flight => 
      flight.departureIATACode && 
      flight.arrivalIATACode && 
      flight.departureTime && 
      flight.arrivalTime
    );

    if (!hasValidFlights) {
      console.log('🚫 FlightSection: No hay vuelos con información válida, ocultando componente');
      return false;
    }

    console.log('✅ FlightSection: Vuelos válidos detectados, mostrando componente');
    return true;
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

  /**
   * Obtiene el nombre de la ciudad de salida transformado
   */
  getDepartureCityName(flight: IFlightResponse): string {
    if (!flight || !flight.departureIATACode) return '';
    
    // Intentar obtener el nombre de la ciudad desde el cache
    const cityName = this.airportCityCacheService.getCityNameFromCache(flight.departureIATACode);
    
    // Si hay un nombre de ciudad en el cache, usarlo; si no, usar el departureCity original o el código IATA
    return cityName || flight.departureCity || flight.departureIATACode;
  }

  /**
   * Obtiene el nombre de la ciudad de llegada transformado
   */
  getArrivalCityName(flight: IFlightResponse): string {
    if (!flight || !flight.arrivalIATACode) return '';
    
    // Intentar obtener el nombre de la ciudad desde el cache
    const cityName = this.airportCityCacheService.getCityNameFromCache(flight.arrivalIATACode);
    
    // Si hay un nombre de ciudad en el cache, usarlo; si no, usar el arrivalCity original o el código IATA
    return cityName || flight.arrivalCity || flight.arrivalIATACode;
  }

  /**
   * Precarga las ciudades de los aeropuertos para todos los vuelos del paquete
   */
  private preloadAirportCities(): void {
    if (!this.flightPack || !this.flightPack.flights) return;

    const airportCodes: string[] = [];
    
    this.flightPack.flights.forEach(flight => {
      if (flight.departureIATACode && !airportCodes.includes(flight.departureIATACode)) {
        airportCodes.push(flight.departureIATACode);
      }
      if (flight.arrivalIATACode && !airportCodes.includes(flight.arrivalIATACode)) {
        airportCodes.push(flight.arrivalIATACode);
      }
    });

    if (airportCodes.length > 0) {
      //console.log(`🔄 FlightSection: Precargando ciudades para ${airportCodes.length} aeropuertos`);
      this.airportCityCacheService.preloadAllAirportCities(airportCodes);
    }
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
