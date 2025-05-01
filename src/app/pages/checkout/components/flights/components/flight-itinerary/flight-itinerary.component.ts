import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Flight } from '../../../../../../core/models/tours/flight.model';
import { PricesService } from '../../../../../../core/services/checkout/prices.service';
import { AirlinesService, Airline } from '../../../../../../core/services/airlines/airlines.service';
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
    if (!baseDate || !segments || segments.length === 0) {
      console.warn('Invalid base date or segments:', {
        baseDate,
        segmentsLength: segments?.length,
      });
      return [];
    }

    console.log('Building timeline with baseDate:', baseDate);
    console.log('Segments:', JSON.stringify(segments, null, 2));

    const timelineItems = [];
    let currentArrival: Date;

    try {
      // Ensure the base date is valid
      if (!baseDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        console.warn('Base date is not in YYYY-MM-DD format:', baseDate);
        baseDate = new Date().toISOString().split('T')[0]; // Use today as fallback
      }

      // Create the initial date from the first segment's departure time
      if (!segments[0].departureTime) {
        console.warn('First segment has no departureTime:', segments[0]);
        segments[0].departureTime = '00:00'; // Use default time
      }

      currentArrival = this.parseLocalDateTime(
        baseDate,
        segments[0].departureTime
      );
      console.log('Initial currentArrival:', currentArrival);
    } catch (e) {
      console.warn('Error creating date for timeline:', e);
      currentArrival = new Date();
    }

    for (const [index, seg] of segments.entries()) {
      if (!seg) {
        console.warn(`Segment ${index} is undefined`);
        continue;
      }

      if (!seg.departureTime) {
        console.warn(`Segment ${index} has no departureTime:`, seg);
        seg.departureTime = '00:00'; // Use default time
      }

      if (!seg.arrivalTime) {
        console.warn(`Segment ${index} has no arrivalTime:`, seg);
        seg.arrivalTime = '00:00'; // Use default time
      }

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

      console.log(`Segment ${index} times:`, {
        departureTime: seg.departureTime,
        arrivalTime: seg.arrivalTime,
        parsedDeparture: departure.toISOString(),
        parsedArrival: arrival.toISOString(),
      });

      // Añadir evento de salida
      timelineItems.push({
        departureCity: seg.departureCity || 'Unknown',
        departureIata: seg.departureIata || '---',
        departureDateTime: departure,
        type: 'departure',
        flightNumber: seg.flightNumber || 'Unknown',
      });

      // Añadir evento de llegada
      timelineItems.push({
        arrivalCity: seg.arrivalCity || 'Unknown',
        arrivalIata: seg.arrivalIata || '---',
        arrivalDateTime: arrival,
        type: 'arrival',
        flightNumber: seg.flightNumber || 'Unknown',
      });

      currentArrival = arrival;
    }

    console.log('Timeline data generated:', timelineItems);
    return timelineItems;
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

  private computeJourney(type: 'outbound' | 'inbound'): Journey | null {
    if (!this.flight) return null;

    const journeyData = this.flight[type];

    if (
      !journeyData ||
      !journeyData.segments ||
      journeyData.segments.length === 0
    ) {
      return null;
    }

    if (type === 'inbound') {
      if (!journeyData.date || journeyData.segments.length === 0) {
        return null;
      }
      if (journeyData.name === 'No return flight') {
        return null;
      }
    }

    const segments = journeyData.segments;
    if (!segments || segments.length === 0) return null;

    const departureSegment = segments[0];
    const arrivalSegment = segments[segments.length - 1];

    if (!departureSegment || !arrivalSegment) return null;

    let journeyDate: Date;
    try {
      journeyDate = new Date(journeyData.date);
      if (!this.isValidDate(journeyDate)) {
        console.warn(`Invalid date for ${type} journey:`, journeyData.date);
        journeyDate = new Date();
      }
    } catch (e) {
      console.warn(`Error creating date for ${type} journey:`, e);
      journeyDate = new Date();
    }

    let departureTime: Date;
    try {
      departureTime = this.formatTime(departureSegment.departureTime);
      if (!this.isValidDate(departureTime)) {
        console.warn(
          `Invalid departure time for ${type} journey:`,
          departureSegment.departureTime
        );
        departureTime = new Date();
      }
    } catch (e) {
      console.warn(`Error creating departure time for ${type} journey:`, e);
      departureTime = new Date();
    }

    const departure = {
      iata: departureSegment.departureIata || '',
      time: departureTime,
      date: journeyDate,
    };

    let arrivalDate: Date;
    try {
      arrivalDate = this.getSegmentsArrivalDate(journeyData.date, segments);
      if (!this.isValidDate(arrivalDate)) {
        console.warn(`Invalid arrival date for ${type} journey`);
        arrivalDate = new Date();
      }
    } catch (e) {
      console.warn(`Error calculating arrival date for ${type} journey:`, e);
      arrivalDate = new Date();
    }

    const arrival = {
      iata: arrivalSegment.arrivalIata || '',
      time: arrivalDate,
      date: arrivalDate,
    };

    const stops = segments.length - 1;
    const stopsText =
      stops === 0
        ? 'vuelo directo'
        : stops === 1
        ? '1 escala'
        : stops + ' escalas';

    let totalDuration: string;
    try {
      totalDuration = this.getTotalDuration(type === 'outbound');
      if (!totalDuration) {
        totalDuration = '';
      }
    } catch (e) {
      console.warn(`Error calculating duration for ${type} journey:`, e);
      totalDuration = '';
    }

    let timelineData: any[];
    try {
      timelineData = journeyData.date
        ? this.getTimelineData(journeyData.date, segments)
        : [];
    } catch (e) {
      console.warn(`Error generating timeline for ${type} journey:`, e);
      timelineData = [];
    }

    return {
      type,
      departure,
      arrival,
      segments,
      timelineData,
      stopsText,
      totalDuration,
    };
  }

  // Nuevo método helper para validar fechas
  isValidDate(date: any): boolean {
    return date instanceof Date && !isNaN(date.getTime());
  }
  
  // Caché de aerolíneas a nivel de componente
  private airlineCache: { [prefix: string]: string } = {};
  
  /**
   * Obtiene los nombres de las aerolíneas a partir de los números de vuelo de los segmentos
   * @param segments Segmentos del viaje que contienen los números de vuelo
   * @returns String con los nombres de las aerolíneas
   */
  getAirlineNamesByFlightNumbers(segments: FlightSegment[]): string {
    if (!segments || segments.length === 0) {
      return '';
    }
    
    // Extraer prefijos IATA únicos de los números de vuelo
    const prefixesIATA = segments
      .filter(segment => segment && segment.flightNumber)
      .map(segment => {
        // Extraer las dos primeras letras del número de vuelo
        const flightNumber = segment.flightNumber || '';
        const prefixIATA = flightNumber.substring(0, 2);
        return prefixIATA;
      })
      .filter(prefix => prefix.length === 2); // Asegurarse de que el prefijo tiene 2 caracteres
    
    // Eliminar duplicados
    const uniquePrefixesIATA = [...new Set(prefixesIATA)];
    
    // Si no hay prefijos válidos, intentar usar los nombres de aerolíneas de los segmentos
    if (uniquePrefixesIATA.length === 0) {
      const airlineNames = segments
        .filter(segment => segment && segment.airline && segment.airline.name)
        .map(segment => segment.airline?.name || '');
      
      const uniqueAirlineNames = [...new Set(airlineNames)];
      return uniqueAirlineNames.join(', ');
    }
    
    // Verificar si tenemos todos los prefijos en caché
    const cachedNames = uniquePrefixesIATA
      .filter(prefix => this.airlineCache[prefix])
      .map(prefix => this.airlineCache[prefix]);
    
    // Si tenemos todos los prefijos en caché, devolver los nombres
    if (cachedNames.length === uniquePrefixesIATA.length) {
      return cachedNames.join(', ');
    }
    
    // Si no tenemos todos los prefijos en caché, cargar los datos en segundo plano
    // y devolver un valor temporal
    uniquePrefixesIATA.forEach(prefix => {
      if (!this.airlineCache[prefix]) {
        this.airlinesService.getAirlines({ codeIATA: prefix }).subscribe(
          airlines => {
            if (airlines && airlines.length > 0) {
              this.airlineCache[prefix] = airlines[0].name || prefix;
            } else {
              this.airlineCache[prefix] = prefix;
            }
          },
          () => {
            this.airlineCache[prefix] = prefix;
          }
        );
      }
    });
    
    // Devolver los prefijos como valor temporal
    return uniquePrefixesIATA.join(', ');
  }
}
