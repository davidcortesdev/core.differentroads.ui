import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Flight } from '../../../../../../core/models/tours/flight.model';
import { PricesService } from '../../../../../../core/services/checkout/prices.service';

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
  airlineName: string;
  totalDuration: string;
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

  constructor(private pricesService: PricesService) {}

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
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hour, minute, second] = timeStr.split(':').map(Number);
    return new Date(year, month - 1, day, hour, minute, second);
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
      return [];
    }

    const timelineItems = [];
    let currentArrival: Date;

    try {
      currentArrival = this.parseLocalDateTime(
        baseDate,
        segments[0].departureTime
      );
    } catch (e) {
      console.warn('Error creating date for timeline:', e);
      currentArrival = new Date();
    }

    for (const [index, seg] of segments.entries()) {
      if (!seg) continue;

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

      // Añadir evento de salida
      timelineItems.push({
        departureCity: seg.departureCity,
        departureIata: seg.departureIata,
        departureDateTime: departure,
        type: 'departure',
        flightNumber: seg.flightNumber,
      });

      // Añadir evento de llegada
      timelineItems.push({
        arrivalCity: seg.arrivalCity,
        arrivalIata: seg.arrivalIata,
        arrivalDateTime: arrival,
        type: 'arrival',
        flightNumber: seg.flightNumber,
      });

      currentArrival = arrival;
    }

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
    const airlineName = departureSegment.airline?.name || '';

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
      airlineName,
      totalDuration,
    };
  }

  // Nuevo método helper para validar fechas
  isValidDate(date: any): boolean {
    return date instanceof Date && !isNaN(date.getTime());
  }

  // ...existing code if any...
}
