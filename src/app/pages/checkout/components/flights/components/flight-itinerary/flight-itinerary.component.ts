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

  // Formatea la hora para el pipe `date`
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

  // Calcula la duración del vuelo para un segmento
  calculateFlightDuration(segment: any): string {
    const departure = this.formatTime(segment.departureTime);
    const arrival = this.formatTime(segment.arrivalTime);
    if (arrival < departure) {
      arrival.setDate(arrival.getDate() + 1); // Manejo de llegada al día siguiente
    }
    const duration = (arrival.getTime() - departure.getTime()) / (1000 * 60); // en minutos
    const hours = Math.floor(duration / 60);
    const minutes = Math.floor(duration % 60);
    return `${hours}h ${minutes}m`;
  }

  getSegmentsArrivalDate(baseDate: string | undefined, segments: any[]): Date {
    if (!segments || segments.length === 0) {
      return new Date();
    }

    let finalDate: Date;
    try {
      if (baseDate) {
        finalDate = new Date(baseDate + 'T00:00:00Z');
        // Check if date is valid
        if (!this.isValidDate(finalDate)) {
          console.warn('Invalid base date:', baseDate);
          finalDate = new Date();
        }
      } else {
        finalDate = new Date();
      }
    } catch (e) {
      console.warn('Error parsing base date:', e);
      finalDate = new Date();
    }

    finalDate.setUTCHours(0, 0, 0, 0);
    let currentDate = new Date(finalDate);

    for (const segment of segments) {
      if (!segment) continue;

      const departureTime = this.formatTime(segment.departureTime);
      const arrivalTime = this.formatTime(segment.arrivalTime);

      departureTime.setUTCFullYear(
        currentDate.getUTCFullYear(),
        currentDate.getUTCMonth(),
        currentDate.getUTCDate()
      );

      arrivalTime.setUTCFullYear(
        currentDate.getUTCFullYear(),
        currentDate.getUTCMonth(),
        currentDate.getUTCDate()
      );

      if (arrivalTime.getTime() < departureTime.getTime()) {
        arrivalTime.setUTCDate(arrivalTime.getUTCDate() + 1);
      } else if (segment.numNights && segment.numNights > 0) {
        arrivalTime.setUTCDate(arrivalTime.getUTCDate() + segment.numNights);
      }

      currentDate = new Date(arrivalTime);
    }

    return currentDate;
  }

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
   * Nuevo método para generar el timeline con fecha, hora y ciudades.
   * Recorre los segmentos y calcula para cada uno la fecha/hora de salida y llegada.
   */
  getTimelineData(baseDate: string, segments: any[]): any[] {
    if (!baseDate || !segments || segments.length === 0) {
      return [];
    }

    const timelineItems = [];

    // Create a valid date even if baseDate is problematic
    let effectiveDepartureDate: Date;
    try {
      effectiveDepartureDate = new Date(baseDate + 'T00:00:00Z');
      // Check if date is valid
      if (!this.isValidDate(effectiveDepartureDate)) {
        console.warn('Invalid base date for timeline:', baseDate);
        // Use current date as fallback
        effectiveDepartureDate = new Date();
      }
    } catch (e) {
      console.warn('Error creating date for timeline:', e);
      // Use current date as fallback
      effectiveDepartureDate = new Date();
    }

    effectiveDepartureDate.setUTCHours(0, 0, 0, 0);

    for (const segment of segments) {
      if (!segment) continue;

      // Calcular la hora de salida
      let departureTime = this.formatTime(segment.departureTime);
      departureTime.setUTCFullYear(
        effectiveDepartureDate.getUTCFullYear(),
        effectiveDepartureDate.getUTCMonth(),
        effectiveDepartureDate.getUTCDate()
      );

      // Calcular la hora de llegada
      let arrivalTime = this.formatTime(segment.arrivalTime);
      arrivalTime.setUTCFullYear(
        effectiveDepartureDate.getUTCFullYear(),
        effectiveDepartureDate.getUTCMonth(),
        effectiveDepartureDate.getUTCDate()
      );

      if (arrivalTime.getTime() < departureTime.getTime()) {
        arrivalTime.setUTCDate(arrivalTime.getUTCDate() + 1);
      } else if (segment.numNights && segment.numNights > 0) {
        arrivalTime.setUTCDate(arrivalTime.getUTCDate() + segment.numNights);
      }

      timelineItems.push({
        departureCity: segment.departureCity || '',
        departureIata: segment.departureIata || '',
        departureDateTime: departureTime,
        arrivalCity: segment.arrivalCity || '',
        arrivalIata: segment.arrivalIata || '',
        arrivalDateTime: arrivalTime,
        icon: 'pi pi-plane',
        color: '#007ad9',
      });

      // Para el siguiente segmento, la fecha de salida será la llegada actual
      effectiveDepartureDate = new Date(arrivalTime);
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

    // Early return if journey doesn't exist or has no segments
    if (
      !journeyData ||
      !journeyData.segments ||
      journeyData.segments.length === 0
    ) {
      return null;
    }

    // For inbound journey, make additional checks to ensure valid data
    if (type === 'inbound') {
      // If date is empty or segments is empty, skip this journey
      if (!journeyData.date || journeyData.segments.length === 0) {
        return null;
      }

      // Additional check to see if it's a "dummy" inbound (like our "No return flight")
      if (journeyData.name === 'No return flight') {
        return null;
      }
    }

    const segments = journeyData.segments;
    if (!segments || segments.length === 0) return null;

    const departureSegment = segments[0];
    const arrivalSegment = segments[segments.length - 1];

    if (!departureSegment || !arrivalSegment) return null;

    // Ensure we have a valid date string before creating Date objects
    let journeyDate: Date;
    try {
      journeyDate = new Date(journeyData.date);
      // Check if date is valid
      if (!this.isValidDate(journeyDate)) {
        console.warn(`Invalid date for ${type} journey:`, journeyData.date);
        journeyDate = new Date(); // Use current date as fallback
      }
    } catch (e) {
      console.warn(`Error creating date for ${type} journey:`, e);
      journeyDate = new Date(); // Use current date as fallback
    }

    // Datos de salida
    let departureTime: Date;
    try {
      departureTime = this.formatTime(departureSegment.departureTime);
      if (!this.isValidDate(departureTime)) {
        console.warn(
          `Invalid departure time for ${type} journey:`,
          departureSegment.departureTime
        );
        departureTime = new Date(); // Use current time as fallback
      }
    } catch (e) {
      console.warn(`Error creating departure time for ${type} journey:`, e);
      departureTime = new Date(); // Use current time as fallback
    }

    const departure = {
      iata: departureSegment.departureIata || '',
      time: departureTime,
      date: journeyDate,
    };

    // Datos de llegada - handle potential errors
    let arrivalDate: Date;
    try {
      arrivalDate = this.getSegmentsArrivalDate(journeyData.date, segments);
      // Check if date is valid
      if (!this.isValidDate(arrivalDate)) {
        console.warn(`Invalid arrival date for ${type} journey`);
        arrivalDate = new Date(); // Use current date as fallback
      }
    } catch (e) {
      console.warn(`Error calculating arrival date for ${type} journey:`, e);
      arrivalDate = new Date(); // Use current date as fallback
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

    // Safely calculate duration
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

    // Safely generate timeline data
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

  // New helper method to validate dates
  isValidDate(date: any): boolean {
    return date instanceof Date && !isNaN(date.getTime());
  }
}
