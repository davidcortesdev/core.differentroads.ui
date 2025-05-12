import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Flight } from '../../../../../../core/models/tours/flight.model';
import { PricesService } from '../../../../../../core/services/checkout/prices.service';
import { AirlinesService, Airline, AirlineFilter } from '../../../../../../core/services/airlines/airlines.service';
import { forkJoin, Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

interface Journey {
  type: 'outbound' | 'inbound';
  departure: {
    iata: string;
    time: Date;
    date: Date;
  };
  arrival: {
    iata: string;
    time: Date;
    date: Date;
  };
  segments: any[];
  timelineData: any[];
  stopsText: string;
  totalDuration: string;
}

/**
 * Interfaz que define la estructura de un segmento de vuelo
 */
interface FlightSegment {
  departureCity?: string;
  departureIata?: string;
  departureTime?: string;
  arrivalCity?: string;
  arrivalIata?: string;
  arrivalTime?: string;
  flightNumber?: string;
  numNights?: number;
  airline?: {
    name: string;
    code?: string;
  };
}


@Component({
  selector: 'app-flight-itinerary',
  standalone: false,
  templateUrl: './flight-itinerary.component.html',
  styleUrls: ['./flight-itinerary.component.scss'],
})
export class FlightItineraryComponent implements OnChanges {

  @Input() flight!: Flight;
  @Input() selectFlight!: (flight: any) => void;
  @Input() isFlightSelected!: (flight: any) => boolean;

  journeys: Journey[] = [];

  constructor(
    private pricesService: PricesService,
    private airlinesService: AirlinesService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['flight'] && this.flight) {
      this.journeys = [];
      const outboundJourney = this.computeJourney('outbound');
      if (outboundJourney) {
        this.journeys.push(outboundJourney);
      }
      const inboundJourney = this.computeJourney('inbound');
      if (inboundJourney) {
        this.journeys.push(inboundJourney);
      }
    }
  }

  // Método de HEAD para formatear la hora para el pipe `date`
  formatTime(timeString: string): Date {
    if (!timeString) return new Date();

    try {
      // Handle different time formats (HH:MM or HH:MM:SS)
      const timeParts = timeString.split(':').map(Number);
      if (timeParts.length < 2 || timeParts.some(isNaN)) {
        console.warn('Invalid time format:', timeString);
        return new Date();
      }

      const [hours, minutes, seconds = 0] = timeParts;
      const date = new Date();
      date.setHours(hours, minutes, seconds, 0); // Add milliseconds = 0 for consistency

      // Validate the date is valid
      if (!this.isValidDate(date)) {
        console.warn('Created invalid date from time:', timeString);
        return new Date();
      }

      return date;
    } catch (e) {
      console.warn('Error formatting time:', timeString, e);
      return new Date();
    }
  }

  // Agregamos este helper (tomado de origin/main) ya que se invoca en otros métodos.
  private parseLocalDateTime(dateStr: string, timeStr: string): Date {
    try {
      if (!dateStr || !timeStr) {
        console.warn('Invalid date or time strings:', { dateStr, timeStr });
        return new Date();
      }

      const [year, month, day] = dateStr.split('-').map(Number);
      const [hour, minute, second = 0] = timeStr.split(':').map(Number);

      // Validate values
      if (
        isNaN(year) ||
        isNaN(month) ||
        isNaN(day) ||
        isNaN(hour) ||
        isNaN(minute)
      ) {
        console.warn('Invalid date or time values:', {
          year,
          month,
          day,
          hour,
          minute,
        });
        return new Date();
      }

      // Create a new date
      const date = new Date(year, month - 1, day, hour, minute, second);

      // Validate the created date
      if (!this.isValidDate(date)) {
        console.warn('Created invalid date:', date);
        return new Date();
      }

      return date;
    } catch (e) {
      console.error('Error parsing date/time:', e);
      return new Date();
    }
  }

  /**
   * Retorna la fecha en formato "YYYY-MM-DD" a partir de un objeto Date.
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
  }

  /**
   * Para el primer segmento, combina la fecha base y la hora de salida.
   */
  private computeDepartureDate(baseDate: string, segment: any): Date {
    return this.parseLocalDateTime(baseDate, segment.departureTime);
  }

  /**
   * Recorre los segmentos y calcula la fecha/hora de llegada final.
   * Implementación de HEAD
   */
  getSegmentsArrivalDate(baseDate: string, segments: any[]): Date {
    let currentArrival = this.parseLocalDateTime(
      baseDate,
      segments[0].departureTime
    );

    for (const [index, seg] of segments.entries()) {
      let departure: Date;
      if (index === 0) {
        departure = this.parseLocalDateTime(baseDate, seg.departureTime);
      } else {
        const baseForDeparture = this.formatDate(currentArrival);
        departure = this.parseLocalDateTime(
          baseForDeparture,
          seg.departureTime
        );
        if (departure < currentArrival) {
          departure.setDate(departure.getDate() + 1);
        }
      }

      let arrival = this.parseLocalDateTime(
        this.formatDate(departure),
        seg.arrivalTime
      );
      if (arrival < departure) {
        arrival.setDate(arrival.getDate() + 1);
      } else if (seg.numNights > 0) {
        arrival.setDate(arrival.getDate() + seg.numNights);
      }
      currentArrival = arrival;
    }
    return currentArrival;
  }

  /**
   * Calcula el tiempo total del viaje en formato "Xh Ym" usando la fecha/hora
   * de salida del primer segmento y la fecha/hora de llegada final.
   */
  getTotalDuration(isOutbound: boolean): string {
    const journey = isOutbound ? this.flight?.outbound : this.flight?.inbound;
    const segments = journey?.segments;
    const flightDate = journey?.date;

    if (!segments?.length) {
      return '';
    }

    try {
      const firstSegment = segments[0];
      if (!firstSegment || !firstSegment.departureTime) {
        return '';
      }

      const departure = this.formatTime(firstSegment.departureTime);
      if (flightDate) {
        try {
          const baseDate = new Date(flightDate);
          if (this.isValidDate(baseDate)) {
            departure.setUTCFullYear(
              baseDate.getUTCFullYear(),
              baseDate.getUTCMonth(),
              baseDate.getUTCDate()
            );
          }
        } catch (e) {
          console.warn('Error setting departure date:', e);
        }
      }

      const arrival = this.getSegmentsArrivalDate(flightDate, segments);
      if (this.isValidDate(arrival) && this.isValidDate(departure)) {
        const duration =
          (arrival.getTime() - departure.getTime()) / (1000 * 60);
        if (duration >= 0) {
          const hours = Math.floor(duration / 60);
          const minutes = Math.floor(duration % 60);
          return `${hours}h ${minutes}m`;
        }
      }
      return '';
    } catch (e) {
      console.warn('Error calculating total duration:', e);
      return '';
    }
  }

  /**
   * Genera los datos del timeline de cada segmento combinando fecha y hora,
   * usando la misma lógica de getSegmentsArrivalDate.
   */
  getTimelineData(baseDate: string, segments: any[]): any[] {
    if (!baseDate || !segments?.length) return [];

    // Validar formato de fecha una sola vez
    if (!baseDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      console.warn('Base date is not in YYYY-MM-DD format:', baseDate);
      baseDate = new Date().toISOString().split('T')[0];
    }

    const timelineItems = [];
    let currentArrival: Date;

    try {
      // Inicializar con el primer segmento
      const firstSegmentDepartureTime = segments[0].departureTime || '00:00';
      currentArrival = this.parseLocalDateTime(baseDate, firstSegmentDepartureTime);
      
      // Procesar cada segmento
      for (const [index, seg] of segments.entries()) {
        if (!seg) continue;
        
        const departureTime = seg.departureTime || '00:00';
        const arrivalTime = seg.arrivalTime || '00:00';
        
        // Calcular fechas de salida y llegada
        let departure: Date;
        if (index === 0) {
          departure = this.parseLocalDateTime(baseDate, departureTime);
        } else {
          const baseForDeparture = this.formatDate(currentArrival);
          departure = this.parseLocalDateTime(baseForDeparture, departureTime);
          if (departure < currentArrival) {
            departure.setDate(departure.getDate() + 1);
          }
        }
      
        let arrival = this.parseLocalDateTime(this.formatDate(departure), arrivalTime);
        if (arrival < departure) {
          arrival.setDate(arrival.getDate() + 1);
        } else if (seg.numNights > 0) {
          arrival.setDate(arrival.getDate() + seg.numNights);
        }
      
        // Añadir eventos al timeline
        timelineItems.push({
          departureCity: seg.departureCity || 'Unknown',
          departureIata: seg.departureIata || '---',
          departureDateTime: departure,
          type: 'departure',
          flightNumber: seg.flightNumber || 'Unknown',
        });
      
        timelineItems.push({
          arrivalCity: seg.arrivalCity || 'Unknown',
          arrivalIata: seg.arrivalIata || '---',
          arrivalDateTime: arrival,
          type: 'arrival',
          flightNumber: seg.flightNumber || 'Unknown',
        });
      
        currentArrival = arrival;
      }
      
      return timelineItems;
    } catch (e) {
      console.warn('Error generating timeline:', e);
      return [];
    }
  }

  getPrice(): number {
    try {
      const inboundPrice =
        this.pricesService.getPriceById(
          this.flight?.inbound?.activityID?.toString(),
          'Adultos'
        ) || 0;
      const outboundPrice =
        this.pricesService.getPriceById(
          this.flight?.outbound?.activityID?.toString(),
          'Adultos'
        ) || 0;
      return inboundPrice + outboundPrice;
    } catch (e) {
      console.warn('Error calculating price:', e);
      return this.flight?.price || 0;
    }
  }

  // Método optimizado para reducir la complejidad y mejorar el rendimiento
  private computeJourney(type: 'outbound' | 'inbound'): Journey | null {
    if (!this.flight) return null;
  
    const journeyData = this.flight[type];
  
    // Validación temprana para evitar procesamiento innecesario
    if (!journeyData?.segments?.length) return null;
    if (type === 'inbound' && (!journeyData.date || journeyData.name === 'No return flight')) return null;
  
    const segments = journeyData.segments;
    const departureSegment = segments[0];
    const arrivalSegment = segments[segments.length - 1];
  
    if (!departureSegment || !arrivalSegment) return null;
  
    // Usar try/catch solo para la lógica compleja, no para cada operación
    try {
      const journeyDate = new Date(journeyData.date);
      if (!this.isValidDate(journeyDate)) throw new Error(`Invalid date for ${type} journey`);
      
      const departureTime = this.formatTime(departureSegment.departureTime);
      if (!this.isValidDate(departureTime)) throw new Error(`Invalid departure time for ${type} journey`);
      
      const departure = {
        iata: departureSegment.departureIata || '',
        time: departureTime,
        date: journeyDate,
      };
  
      const arrivalDate = this.getSegmentsArrivalDate(journeyData.date, segments);
      if (!this.isValidDate(arrivalDate)) throw new Error(`Invalid arrival date for ${type} journey`);
      
      const arrival = {
        iata: arrivalSegment.arrivalIata || '',
        time: arrivalDate,
        date: arrivalDate,
      };
  
      const stops = segments.length - 1;
      const stopsText = stops === 0 ? 'vuelo directo' : stops === 1 ? '1 escala' : `${stops} escalas`;
      
      const totalDuration = this.getTotalDuration(type === 'outbound') || '';
      const timelineData = journeyData.date ? this.getTimelineData(journeyData.date, segments) : [];
  
      return {
        type,
        departure,
        arrival,
        segments,
        timelineData,
        stopsText,
        totalDuration,
      };
    } catch (e) {
      console.warn(`Error computing ${type} journey:`, e);
      return null;
    }
  }

  // Nuevo método helper para validar fechas
  isValidDate(date: any): boolean {
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * Obtiene la URL del logo de la aerolínea a partir del código IATA
   * @param flightNumber Número de vuelo del que se extraerá el código IATA
   * @returns URL del logo de la aerolínea
   */
  getAirlineLogoUrl(flightNumber: string): string {
    if (!flightNumber || flightNumber.length < 2) {
      return '';
    }
    
    // Extraer el código IATA (generalmente las primeras 2 letras del número de vuelo)
    const iataCode = flightNumber.substring(0, 2);
    
    // Construir la URL del logo usando el servicio de Kiwi.com
    return `https://images.kiwi.com/airlines/32x32/${iataCode}.png`;
  }
  
  /**
   * Obtiene todos los logos de aerolíneas para un conjunto de segmentos
   * @param segments Segmentos del viaje
   * @returns Array con las URLs de los logos de aerolíneas
   */
  getAirlineLogos(segments: FlightSegment[]): string[] {
    if (!segments || segments.length === 0) {
      return [];
    }
    
    // Extraer prefijos IATA únicos de los números de vuelo
    const uniquePrefixesIATA = [...new Set(
      segments
        .filter(segment => segment && segment.flightNumber)
        .map(segment => {
          const flightNumber = segment.flightNumber || '';
          return flightNumber.substring(0, 2);
        })
        .filter(prefix => prefix.length === 2)
    )];
    
    // Crear URLs para los logos
    return uniquePrefixesIATA.map(iataCode => 
      `https://images.kiwi.com/airlines/32x32/${iataCode}.png`
    );
  }

  // Caché para almacenar resultados de consultas previas de aerolíneas
  private airlineNamesCache: Record<string, string> = {};

  getAirlineNamesByFlightNumbers(segments: any[]): Observable<string> {
    // Validar y extraer números de vuelo
    const flightNumbers = segments
      .filter(segment => segment && typeof segment.flightNumber === 'string' && segment.flightNumber.trim() !== '')
      .map(segment => segment.flightNumber);
  
    if (!flightNumbers.length) return of('');
  
    // Extraer códigos IATA únicos
    const uniqueAirlineCodes = [...new Set(
      flightNumbers.map(flightNumber => flightNumber.substring(0, 2))
    )].filter(code => code.length === 2);
  
    if (!uniqueAirlineCodes.length) return of('');
  
    // Crear clave para caché
    const cacheKey = uniqueAirlineCodes.sort().join(',');
    
    // Verificar si ya tenemos el resultado en caché
    if (this.airlineNamesCache[cacheKey]) {
      return of(this.airlineNamesCache[cacheKey]);
    }
  
    // Obtener nombres de aerolíneas
    const airlineRequests = uniqueAirlineCodes.map(code => {
      const filter: AirlineFilter = { codeIATA: code };
      return this.airlinesService.getAirlines(filter).pipe(
        map(airline => airline[0]?.name || code),
        catchError(() => of(code))
      );
    });
  
    // Combinar resultados y guardar en caché
    return forkJoin(airlineRequests).pipe(
      map(airlineNames => {
        const result = airlineNames.join(', ');
        this.airlineNamesCache[cacheKey] = result; // Guardar en caché
        return result;
      }),
      catchError(error => {
        console.error('Error al obtener nombres de aerolíneas:', error);
        return of(uniqueAirlineCodes.join(', '));
      })
    );
  }
  
  // Función trackBy para mejorar rendimiento de ngFor
  trackByJourneyType(index: number, journey: Journey): string {
    return journey.type;
  }
}