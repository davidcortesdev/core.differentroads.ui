import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Flight } from '../../../../core/models/tours/flight.model';

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
  selector: 'app-flight-section',
  templateUrl: './flight-section.component.html',
  styleUrls: ['./flight-section.component.scss'],
  standalone: false,
})
export class FlightSectionComponent implements OnChanges {
  @Input() flight!: Flight; // Recibe el vuelo seleccionado
  journeys: Journey[] = [];

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

  private computeJourney(type: 'outbound' | 'inbound'): Journey | null {
    const journeyData = this.flight ? this.flight[type] : null;
    if (!journeyData || !journeyData.segments || journeyData.segments.length === 0) {
      return null;
    }

    const segments = journeyData.segments;
    const departureSegment = segments[0];
    const arrivalSegment = segments[segments.length - 1];

    // Datos de salida
    const departure = {
      iata: departureSegment.departureIata,
      time: new Date(journeyData.date + 'T' + departureSegment.departureTime),
      date: new Date(journeyData.date),
    };

    // Datos de llegada
    const arrivalDate = new Date(journeyData.date + 'T' + arrivalSegment.arrivalTime);
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
    const totalDuration = this.getJourneyTotalDuration(segments, journeyData.date);

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

  private getJourneyTotalDuration(segments: any[], flightDate: string): string {
    const departure = new Date(flightDate + 'T' + segments[0].departureTime);
    const arrival = new Date(flightDate + 'T' + segments[segments.length - 1].arrivalTime);
    const durationMinutes = (arrival.getTime() - departure.getTime()) / (1000 * 60);
    const hours = Math.floor(durationMinutes / 60);
    const minutes = Math.floor(durationMinutes % 60);
    return `${hours}h ${minutes}m`;
  }

  private getTimelineData(baseDate: string, segments: any[]): any[] {
    const timelineItems = [];
    for (const segment of segments) {
      timelineItems.push({
        departureCity: segment.departureCity,
        departureIata: segment.departureIata,
        departureDateTime: new Date(baseDate + 'T' + segment.departureTime),
        type: 'departure',
      });
      timelineItems.push({
        arrivalCity: segment.arrivalCity,
        arrivalIata: segment.arrivalIata,
        arrivalDateTime: new Date(baseDate + 'T' + segment.arrivalTime),
        type: 'arrival',
      });
    }
    return timelineItems;
  }
}