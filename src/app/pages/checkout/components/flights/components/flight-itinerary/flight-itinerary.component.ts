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

  /**
   * Crea un objeto Date a partir de una fecha y hora (en horario local).
   * Se espera dateStr en formato "YYYY-MM-DD" y timeStr en "HH:mm:ss".
   */
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
   *
   * La lógica es:
   *  - Para el primer segmento se usa la fecha base.
   *  - Se calcula la salida y llegada usando la fecha correspondiente.
   *  - Si la hora de llegada es menor que la de salida, se suma 1 día (cruce de medianoche).
   *  - Si la llegada es mayor o igual y hay numNights, se suman esos días adicionales.
   */
  getSegmentsArrivalDate(baseDate: string, segments: any[]): Date {
    // Procesamos el primer segmento
    let departure = this.parseLocalDateTime(
      baseDate,
      segments[0].departureTime
    );
    let arrival = this.parseLocalDateTime(baseDate, segments[0].arrivalTime);
    if (arrival < departure) {
      arrival.setDate(arrival.getDate() + 1);
    } else if (segments[0].numNights > 0) {
      arrival.setDate(arrival.getDate() + segments[0].numNights);
    }
    let currentArrival = arrival;

    // Procesamos los siguientes segmentos
    for (let i = 1; i < segments.length; i++) {
      const seg = segments[i];
      const baseForDeparture = this.formatDate(currentArrival);
      let segDeparture = this.parseLocalDateTime(
        baseForDeparture,
        seg.departureTime
      );
      // Si la hora de salida del segmento es anterior al arribo previo, se suma 1 día
      if (segDeparture < currentArrival) {
        segDeparture.setDate(segDeparture.getDate() + 1);
      }
      let segArrival = this.parseLocalDateTime(
        this.formatDate(segDeparture),
        seg.arrivalTime
      );
      if (segArrival < segDeparture) {
        segArrival.setDate(segArrival.getDate() + 1);
      } else if (seg.numNights > 0) {
        segArrival.setDate(segArrival.getDate() + seg.numNights);
      }
      currentArrival = segArrival;
    }
    return currentArrival;
  }

  /**
   * Calcula el tiempo total del viaje en formato "Xh Ym" usando la fecha/hora
   * de salida del primer segmento y la fecha/hora de llegada final.
   */
  private getJourneyTotalDuration(segments: any[], flightDate: string): string {
    const departure = this.computeDepartureDate(flightDate, segments[0]);
    const arrival = this.getSegmentsArrivalDate(flightDate, segments);
    const durationMinutes =
      (arrival.getTime() - departure.getTime()) / (1000 * 60);
    const hours = Math.floor(durationMinutes / 60);
    const minutes = Math.floor(durationMinutes % 60);
    return `${hours}h ${minutes}m`;
  }

  /**
   * Genera los datos del timeline de cada segmento combinando fecha y hora,
   * usando la misma lógica de getSegmentsArrivalDate.
   */
  getTimelineData(baseDate: string, segments: any[]): any[] {
    const timelineItems = [];
    // Para el primer segmento:
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
      
      // Añadir evento de salida
      timelineItems.push({
        departureCity: seg.departureCity,
        departureIata: seg.departureIata,
        departureDateTime: departure,
        type: 'departure'
      });
      
      // Añadir evento de llegada
      timelineItems.push({
        arrivalCity: seg.arrivalCity,
        arrivalIata: seg.arrivalIata,
        arrivalDateTime: arrival,
        type: 'arrival'
      });
      
      currentArrival = arrival;
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
      time: this.parseLocalDateTime(
        journeyData.date,
        departureSegment.departureTime
      ),
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
        : `${stops} escalas`;
    const airlineName = departureSegment.airline.name;
    const totalDuration = this.getJourneyTotalDuration(
      segments,
      journeyData.date
    );

    return {
      type,
      departure,
      arrival,
      segments,
      timelineData: this.getTimelineData(journeyData.date, segments),
      stopsText,
      airlineName,
      totalDuration,
    };
  }
}
