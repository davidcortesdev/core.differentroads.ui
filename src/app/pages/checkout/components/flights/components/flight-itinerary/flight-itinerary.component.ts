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
    const [hours, minutes, seconds] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, seconds);
    return date;
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
      return new Date(Date.UTC(1970, 0, 1));
    }
    const finalDate = baseDate ? new Date(baseDate + 'T00:00:00Z') : new Date();
    finalDate.setUTCHours(0, 0, 0, 0);
    let currentDate = new Date(finalDate);

    for (const segment of segments) {
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
      } else {
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

    const firstSegment = segments[0];
    const departure = this.formatTime(firstSegment.departureTime);
    if (flightDate) {
      const baseDate = new Date(flightDate);
      departure.setUTCFullYear(
        baseDate.getUTCFullYear(),
        baseDate.getUTCMonth(),
        baseDate.getUTCDate()
      );
    }
    const arrival = this.getSegmentsArrivalDate(flightDate, segments);
    const duration = (arrival.getTime() - departure.getTime()) / (1000 * 60);
    const hours = Math.floor(duration / 60);
    const minutes = Math.floor(duration % 60);
    return `${hours}h ${minutes}m`;
  }

  /**
   * Nuevo método para generar el timeline con fecha, hora y ciudades.
   * Recorre los segmentos y calcula para cada uno la fecha/hora de salida y llegada.
   */
  getTimelineData(baseDate: string, segments: any[]): any[] {
    const timelineItems = [];
    // Se parte de la fecha base del vuelo (en UTC)
    let effectiveDepartureDate = new Date(baseDate + 'T00:00:00Z');
    effectiveDepartureDate.setUTCHours(0, 0, 0, 0);
    for (const segment of segments) {
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
      } else {
        arrivalTime.setUTCDate(arrivalTime.getUTCDate() + segment.numNights);
      }
      timelineItems.push({
        departureCity: segment.departureCity,
        departureIata: segment.departureIata,
        departureDateTime: departureTime,
        arrivalCity: segment.arrivalCity,
        arrivalIata: segment.arrivalIata,
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
    const inboundPrice = this.pricesService.getPriceById(
      this.flight?.inbound?.activityID?.toString(),
      'Adultos'
    );
    const outboundPrice = this.pricesService.getPriceById(
      this.flight?.outbound?.activityID?.toString(),
      'Adultos'
    );
    return inboundPrice + outboundPrice;
  }

  private computeJourney(type: 'outbound' | 'inbound'): Journey | null {
    const journeyData = this.flight ? this.flight[type] : null;
    if (
      !journeyData ||
      !journeyData.segments ||
      journeyData.segments.length === 0
    ) {
      return null;
    }
    const segments = journeyData.segments;
    const departureSegment = segments[0];
    const arrivalSegment = segments[segments.length - 1];

    // Datos de salida
    const departure = {
      iata: departureSegment.departureIata,
      time: this.formatTime(departureSegment.departureTime),
      date: new Date(journeyData.date),
    };

    // Datos de llegada
    const arrivalDate = this.getSegmentsArrivalDate(journeyData.date, segments);
    const arrival = {
      iata: arrivalSegment.arrivalIata,
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
    const airlineName = departureSegment.airline.name;
    const totalDuration = this.getTotalDuration(type === 'outbound');

    return {
      type,
      departure,
      arrival,
      segments,
      // Se pasa la fecha base del viaje para calcular correctamente las fechas del timeline
      timelineData: this.getTimelineData(journeyData.date, segments),
      stopsText,
      airlineName,
      totalDuration,
    };
  }
}
