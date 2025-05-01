import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import {
  Flight,
  FlightSegment,
} from '../../../../core/models/tours/flight.model';
import { AirlinesService } from '../../../../core/services/airlines/airlines.service';

interface TimelineItem {
  departureCity?: string;
  departureIata?: string;
  departureDateTime?: Date;
  arrivalCity?: string;
  arrivalIata?: string;
  arrivalDateTime?: Date;
  type: 'departure' | 'arrival';
}

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
  segments: FlightSegment[];
  timelineData: TimelineItem[];
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
  @Input() flight!: Flight;
  journeys: Journey[] = [];

  // Caché para almacenar los nombres de aerolíneas ya consultados
  private airlineNameCache: { [flightNumber: string]: string } = {};
  
  // Mapa para acceder directamente a los nombres de aerolíneas en la plantilla
  airlineNames: { [flightNumber: string]: string } = {};

  constructor(private airlinesService: AirlinesService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['flight'] && this.flight) {
      this.processFlightData();
      this.preloadAirlineNames();
    }
  }

  // Track by function for better ngFor performance
  trackBySegmentId(index: number, segment: FlightSegment): string {
    return `${segment.departureIata}-${segment.arrivalIata}-${segment.departureTime}`;
  }

  // Extracted method for better organization
  private processFlightData(): void {
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
      time: new Date(journeyData.date + 'T' + departureSegment.departureTime),
      date: new Date(journeyData.date),
    };

    // Datos de llegada
    const arrivalDate = new Date(
      journeyData.date + 'T' + arrivalSegment.arrivalTime
    );
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

  private getJourneyTotalDuration(
    segments: FlightSegment[],
    flightDate: string
  ): string {
    const departure = new Date(flightDate + 'T' + segments[0].departureTime);
    const arrival = new Date(
      flightDate + 'T' + segments[segments.length - 1].arrivalTime
    );
    const durationMinutes =
      (arrival.getTime() - departure.getTime()) / (1000 * 60);
    const hours = Math.floor(durationMinutes / 60);
    const minutes = Math.floor(durationMinutes % 60);
    return `${hours}h ${minutes}m`;
  }

  private getTimelineData(
    baseDate: string,
    segments: FlightSegment[]
  ): TimelineItem[] {
    const timelineItems = [];
    for (const segment of segments) {
      timelineItems.push({
        departureCity: segment.departureCity,
        departureIata: segment.departureIata,
        departureDateTime: new Date(baseDate + 'T' + segment.departureTime),
        type: 'departure',
      } as TimelineItem);
      timelineItems.push({
        arrivalCity: segment.arrivalCity,
        arrivalIata: segment.arrivalIata,
        arrivalDateTime: new Date(baseDate + 'T' + segment.arrivalTime),
        type: 'arrival',
      } as TimelineItem);
    }
    return timelineItems;
  }


  // Método para precargar todos los nombres de aerolíneas de una vez
  private preloadAirlineNames(): void {
    const flightNumbers: string[] = [];
    
    // Recolectar todos los números de vuelo únicos
    this.journeys.forEach(journey => {
      journey.segments.forEach(segment => {
        if (segment.flightNumber && !this.airlineNameCache[segment.flightNumber]) {
          flightNumbers.push(segment.flightNumber);
        }
      });
    });
    
    // Si no hay números de vuelo para cargar, salir
    if (flightNumbers.length === 0) {
      return;
    }
    
    // Cargar todos los nombres de aerolíneas en paralelo
    const promises = flightNumbers.map(flightNumber => 
      this.fetchAirlineName(flightNumber)
    );
    
    // Esperar a que todas las promesas se resuelvan
    Promise.all(promises).then(() => {
      // Actualizar el mapa de nombres para la plantilla
      this.airlineNames = {...this.airlineNameCache};
    });
  }
  
  // Método para obtener un nombre de aerolínea individual
  private fetchAirlineName(flightNumber: string): Promise<string> {
    // Si no hay número de vuelo, devolver cadena vacía
    if (!flightNumber) {
      return Promise.resolve('');
    }
    
    // Si ya tenemos el nombre en caché, devolverlo directamente
    if (this.airlineNameCache[flightNumber]) {
      return Promise.resolve(this.airlineNameCache[flightNumber]);
    }
    
    // Si no, hacer la llamada al servicio
    return new Promise<string>(resolve => {
      this.airlinesService.getAirlineNameByFlightNumber(flightNumber).subscribe(
        name => {
          this.airlineNameCache[flightNumber] = name;
          this.airlineNames[flightNumber] = name;
          resolve(name);
        },
        () => {
          // En caso de error, usar las dos primeras letras del número de vuelo como fallback
          const fallbackName = flightNumber.substring(0, 2);
          this.airlineNameCache[flightNumber] = fallbackName;
          this.airlineNames[flightNumber] = fallbackName;
          resolve(fallbackName);
        }
      );
    });
  }

  // Método para obtener el nombre de la aerolínea desde la caché (para la plantilla)
  getAirlineName(flightNumber: string): string {
    return this.airlineNames[flightNumber] || flightNumber?.substring(0, 2) || '';
  }

  // Mantener el método original para compatibilidad, pero marcarlo como deprecated
  /**
   * @deprecated Use getAirlineName instead
   */
  getAirlineNameByFlightNumber(flightNumber: string): Promise<string> {
    return this.fetchAirlineName(flightNumber);
  }
}
