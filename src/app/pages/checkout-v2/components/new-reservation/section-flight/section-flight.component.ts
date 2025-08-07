// section-flight.component.ts
import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

// Importaciones de servicios
import {
  FlightsNetService,
  IFlightPackDTO,
  IFlightDetailDTO,
  IFlightResponse,
  IFlightSegmentResponse,
} from '../../../services/flightsNet.service';

// Interfaces para el template
interface FormattedFlight {
  date: string;
  departureTime: string;
  arrivalTime: string;
  departureAirport: string;
  arrivalAirport: string;
  duration: string;
  hasStops: boolean;
  stops: number;
  segments: FormattedSegment[];
  isNextDay: boolean;
}

interface FormattedSegment {
  flightNumber: string;
  airline: string;
  departureTime: string;
  arrivalTime: string;
  departureIata: string;
  arrivalIata: string;
  isNextDay: boolean;
}

interface FormattedFlights {
  outbound: FormattedFlight | null;
  inbound: FormattedFlight | null;
}

@Component({
  selector: 'app-section-flight',
  standalone: false,
  templateUrl: './section-flight.component.html',
  styleUrl: './section-flight.component.scss',
})
export class SectionFlightComponent implements OnInit, OnChanges {
  @Input() departureId: number | undefined;

  // Datos del componente
  formattedFlights: FormattedFlights | null = null;
  loading: boolean = false;

  // Constantes
  private readonly FLIGHT_TYPE_SALIDA = 4;
  private readonly FLIGHT_TYPE_VUELTA = 5; // Asumiendo que 5 es vuelta

  // Cache para aerolíneas y logos
  private airlinesCache: Map<string, string> = new Map();
  private logoUrlCache: Map<string, string> = new Map();

  constructor(private flightsNetService: FlightsNetService) {}

  ngOnInit(): void {
    this.loadFlights();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['departureId'] && changes['departureId'].currentValue) {
      this.loadFlights();
    }
  }

  private loadFlights(): void {
    if (!this.departureId || this.departureId <= 0) {
      this.formattedFlights = null;
      return;
    }

    this.loading = true;

    this.flightsNetService.getFlights(this.departureId).subscribe({
      next: (flightPacks) => {
        console.log('Flight packs obtenidos:', flightPacks);
        this.processFlightPacks(flightPacks);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading flights:', error);
        this.formattedFlights = null;
        this.loading = false;
      },
    });
  }

  private async processFlightPacks(
    flightPacks: IFlightPackDTO[]
  ): Promise<void> {
    if (!flightPacks || flightPacks.length === 0) {
      this.formattedFlights = null;
      return;
    }

    // Tomar el primer pack de vuelos
    const flightPack = flightPacks[0];
    const flights = flightPack.flights;

    if (!flights || flights.length === 0) {
      this.formattedFlights = null;
      return;
    }

    // Separar vuelos de ida y vuelta
    const outboundFlights = flights.filter(
      (f) => f.flightTypeId === this.FLIGHT_TYPE_SALIDA
    );
    const inboundFlights = flights.filter(
      (f) => f.flightTypeId === this.FLIGHT_TYPE_VUELTA
    );

    // Formatear vuelos
    const formattedOutbound =
      outboundFlights.length > 0
        ? await this.formatFlight(outboundFlights[0])
        : null;

    const formattedInbound =
      inboundFlights.length > 0
        ? await this.formatFlight(inboundFlights[0])
        : null;

    this.formattedFlights = {
      outbound: formattedOutbound,
      inbound: formattedInbound,
    };

    console.log('Formatted flights:', this.formattedFlights);
  }

  private async formatFlight(
    flight: IFlightResponse
  ): Promise<FormattedFlight> {
    // Obtener detalles del vuelo (segmentos)
    const flightDetail = await this.flightsNetService
      .getFlightDetail(flight.id)
      .toPromise();

    if (
      !flightDetail ||
      !flightDetail.segments ||
      flightDetail.segments.length === 0
    ) {
      // Si no hay segmentos, crear un vuelo básico
      return this.createBasicFlight(flight);
    }

    const segments = flightDetail.segments;
    const firstSegment = segments[0];
    const lastSegment = segments[segments.length - 1];

    // Formatear segmentos - usar las aerolíneas del detalle del vuelo
    const formattedSegments: FormattedSegment[] = segments.map((segment) => {
      return {
        flightNumber: segment.flightNumber,
        airline: flightDetail.airlines
          ? flightDetail.airlines.join(', ')
          : this.extractAirlineCode(segment.flightNumber),
        departureTime: this.formatTime(segment.departureTime),
        arrivalTime: this.formatTime(segment.arrivalTime),
        departureIata: segment.departureIata,
        arrivalIata: segment.arrivalIata,
        isNextDay: this.isNextDay(segment.departureTime, segment.arrivalTime),
      };
    });

    // Calcular duración
    const duration = this.calculateDuration(
      firstSegment.departureTime,
      lastSegment.arrivalTime,
      firstSegment.departureDate,
      lastSegment.arrivalDate
    );

    return {
      date: firstSegment.departureDate || flight.departureDate || '',
      departureTime: this.formatTime(firstSegment.departureTime),
      arrivalTime: this.formatTime(lastSegment.arrivalTime),
      departureAirport: `${firstSegment.departureCity} (${firstSegment.departureIata})`,
      arrivalAirport: `${lastSegment.arrivalCity} (${lastSegment.arrivalIata})`,
      duration: duration,
      hasStops: segments.length > 1,
      stops: segments.length - 1,
      segments: formattedSegments,
      isNextDay: this.isNextDay(
        firstSegment.departureTime,
        lastSegment.arrivalTime
      ),
    };
  }

  private createBasicFlight(flight: IFlightResponse): FormattedFlight {
    return {
      date: flight.departureDate || '',
      departureTime: this.formatTime(flight.departureTime || ''),
      arrivalTime: this.formatTime(flight.arrivalTime || ''),
      departureAirport: `${flight.departureCity || ''} (${
        flight.departureIATACode || ''
      })`,
      arrivalAirport: `${flight.arrivalCity || ''} (${
        flight.arrivalIATACode || ''
      })`,
      duration: this.calculateBasicDuration(
        flight.departureTime,
        flight.arrivalTime
      ),
      hasStops: false,
      stops: 0,
      segments: [],
      isNextDay: this.isNextDay(flight.departureTime, flight.arrivalTime),
    };
  }

  private formatTime(timeString: string | undefined): string {
    if (!timeString) return '--:--';
    return timeString.slice(0, 5);
  }

  private isNextDay(
    departureTime: string | undefined,
    arrivalTime: string | undefined
  ): boolean {
    if (!departureTime || !arrivalTime) return false;

    const depTime = this.timeToMinutes(departureTime);
    const arrTime = this.timeToMinutes(arrivalTime);

    return arrTime < depTime;
  }

  private timeToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private calculateDuration(
    departureTime: string,
    arrivalTime: string,
    departureDate?: string,
    arrivalDate?: string
  ): string {
    try {
      // Si tenemos fechas, usarlas para cálculo preciso
      if (departureDate && arrivalDate) {
        const depDateTime = new Date(`${departureDate}T${departureTime}`);
        const arrDateTime = new Date(`${arrivalDate}T${arrivalTime}`);
        const diffMs = arrDateTime.getTime() - depDateTime.getTime();
        const diffMinutes = Math.floor(diffMs / (1000 * 60));

        const hours = Math.floor(diffMinutes / 60);
        const minutes = diffMinutes % 60;

        return `${hours}h ${minutes}m`;
      }

      // Fallback: cálculo básico
      return this.calculateBasicDuration(departureTime, arrivalTime);
    } catch (error) {
      console.error('Error calculating duration:', error);
      return 'N/A';
    }
  }

  private calculateBasicDuration(
    departureTime?: string,
    arrivalTime?: string
  ): string {
    if (!departureTime || !arrivalTime) return 'N/A';

    let depMinutes = this.timeToMinutes(departureTime);
    let arrMinutes = this.timeToMinutes(arrivalTime);

    // Si llegada es menor que salida, asumimos día siguiente
    if (arrMinutes < depMinutes) {
      arrMinutes += 24 * 60; // Añadir 24 horas
    }

    const diffMinutes = arrMinutes - depMinutes;
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;

    return `${hours}h ${minutes}m`;
  }

  private extractAirlineCode(flightNumber: string): string {
    if (!flightNumber || flightNumber.length < 2) return '';
    return flightNumber.substring(0, 2);
  }

  private async getAirlineName(airlineCode: string): Promise<string> {
    if (!airlineCode) return '';

    // Verificar cache
    if (this.airlinesCache.has(airlineCode)) {
      return this.airlinesCache.get(airlineCode)!;
    }

    try {
      const airlineName = await this.flightsNetService
        .getAirline(airlineCode)
        .toPromise();
      this.airlinesCache.set(airlineCode, airlineName || airlineCode);
      return airlineName || airlineCode;
    } catch (error) {
      console.error('Error getting airline name:', error);
      this.airlinesCache.set(airlineCode, airlineCode);
      return airlineCode;
    }
  }

  // Métodos para el template
  getAirlineNamesByFlightNumbers(flightNumbers: string[]): Observable<string> {
    if (!flightNumbers || flightNumbers.length === 0) {
      return of('');
    }

    const airlineCodes = flightNumbers
      .map((fn) => this.extractAirlineCode(fn))
      .filter((code) => code.length === 2);

    const uniqueCodes = [...new Set(airlineCodes)];

    if (uniqueCodes.length === 0) {
      return of('');
    }

    // Obtener nombres de aerolíneas
    const requests = uniqueCodes.map((code) =>
      this.flightsNetService.getAirline(code).pipe(catchError(() => of(code)))
    );

    return forkJoin(requests).pipe(map((names) => names.join(', ')));
  }

  getAirlineLogoUrl(flightNumber: string): string {
    if (!flightNumber || flightNumber.length < 2) {
      return '';
    }

    // Verificar cache
    if (this.logoUrlCache.has(flightNumber)) {
      return this.logoUrlCache.get(flightNumber)!;
    }

    // Extraer código IATA y construir URL
    const iataCode = this.extractAirlineCode(flightNumber);
    const url = `https://images.kiwi.com/airlines/32x32/${iataCode}.png`;

    this.logoUrlCache.set(flightNumber, url);
    return url;
  }

  trackByFlightNumber(index: number, segment: FormattedSegment): string {
    return segment.flightNumber || index.toString();
  }

  get hasFlights(): boolean {
    return !!(
      this.formattedFlights?.outbound || this.formattedFlights?.inbound
    );
  }
}
