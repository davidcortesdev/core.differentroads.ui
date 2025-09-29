// section-flight.component.ts
import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
  Inject,
} from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

// Importaciones de servicios
import {
  ReservationFlightService,
  IFlightPackDTO,
} from '../../../../../core/services/flight/reservationflight.service';
import {
  IFlightResponse,
} from '../../../../../core/services/flight-search.service';

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
  @Input() reservationId: number | undefined;

  // Datos del componente
  formattedFlights: FormattedFlights | null = null;
  loading: boolean = false;

  // Constantes
  private readonly FLIGHT_TYPE_SALIDA = 4;
  private readonly FLIGHT_TYPE_VUELTA = 5; // Asumiendo que 5 es vuelta

  // Cache para aerolíneas y logos
  private airlinesCache: Map<string, string> = new Map();
  private logoUrlCache: Map<string, string> = new Map();

  constructor(@Inject(ReservationFlightService) private reservationFlightService: ReservationFlightService) {}

  ngOnInit(): void {
    this.loadFlights();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['departureId'] && changes['departureId'].currentValue) ||
        (changes['reservationId'] && changes['reservationId'].currentValue)) {
      this.loadFlights();
    }
  }

  private loadFlights(): void {
    if (!this.reservationId || this.reservationId <= 0) {
      this.formattedFlights = null;
      return;
    }

    this.loading = true;

    this.reservationFlightService.getSelectedFlightPack(this.reservationId).subscribe({
      next: (flightPacks: IFlightPackDTO | IFlightPackDTO[]) => {
        this.processFlightPacks(flightPacks);
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading flights:', error);
        this.formattedFlights = null;
        this.loading = false;
      },
    });
  }

  private async processFlightPacks(
    flightPacks: IFlightPackDTO | IFlightPackDTO[]
  ): Promise<void> {
    // Manejar tanto arrays como objetos individuales
    let flightPackData: IFlightPackDTO | null = null;
    
    if (Array.isArray(flightPacks)) {
      if (flightPacks.length > 0) {
        flightPackData = flightPacks[0];
      }
    } else if (flightPacks && typeof flightPacks === 'object') {
      flightPackData = flightPacks as IFlightPackDTO;
    }

    if (!flightPackData) {
      this.formattedFlights = null;
      return;
    }

    const flights = flightPackData.flights;

    if (!flights || flights.length === 0) {
      this.formattedFlights = null;
      return;
    }

    // Separar vuelos de ida y vuelta
    const outboundFlights = flights.filter(
      (f: IFlightResponse) => f.flightTypeId === this.FLIGHT_TYPE_SALIDA
    );
    const inboundFlights = flights.filter(
      (f: IFlightResponse) => f.flightTypeId === this.FLIGHT_TYPE_VUELTA
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
  }

  private async formatFlight(
    flight: IFlightResponse
  ): Promise<FormattedFlight> {
    // Crear un vuelo básico usando los datos directos del flight
    return this.createBasicFlight(flight);
  }

  private createBasicFlight(flight: IFlightResponse): FormattedFlight {
    return {
      date: flight.departureDate || flight.date || '',
      departureTime: this.formatTime(flight.departureTime || ''),
      arrivalTime: this.formatTime(flight.arrivalTime || ''),
      departureAirport: `${flight.departureCity || ''} (${
        flight.departureIATACode || ''
      })`,
      arrivalAirport: `${flight.arrivalCity || ''} (${
        flight.arrivalIATACode || ''
      })`,
      duration: this.calculateBasicDuration(
        flight.departureTime || undefined,
        flight.arrivalTime || undefined
      ),
      hasStops: false,
      stops: 0,
      segments: [{
        flightNumber: flight.tkId || flight.id?.toString() || '',
        airline: this.extractAirlineName(flight),
        departureTime: this.formatTime(flight.departureTime || ''),
        arrivalTime: this.formatTime(flight.arrivalTime || ''),
        departureIata: flight.departureIATACode || '',
        arrivalIata: flight.arrivalIATACode || '',
        isNextDay: this.isNextDay(flight.departureTime || undefined, flight.arrivalTime || undefined),
      }],
      isNextDay: this.isNextDay(flight.departureTime || undefined, flight.arrivalTime || undefined),
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

  private extractAirlineName(flight: IFlightResponse): string {
    // Si no encuentra, intentar derivar del nombre del vuelo o código
    const flightName = flight.name || '';
    const flightNumber = flight.tkId || flight.id?.toString() || '';
    
    // Buscar patrones en el nombre como "Vuelo EDI - VLC - KL928"
    const airlineCodeMatch = flightName.match(/([A-Z]{2}\d+)/);
    if (airlineCodeMatch) {
      const code = airlineCodeMatch[1].substring(0, 2);
      return this.getAirlineNameFromCode(code);
    }
    
    // Derivar de códigos IATA si es posible
    return this.deriveAirlineFromRoute(
      flight.departureIATACode || '',
      flight.arrivalIATACode || ''
    );
  }

  private getAirlineNameFromCode(code: string): string {
    const commonCodes: { [key: string]: string } = {
      'IB': 'Iberia',
      'VY': 'Vueling', 
      'FR': 'Ryanair',
      'KL': 'KLM',
      'UX': 'Air Europa',
      'AV': 'Avianca',
      'LA': 'LATAM'
    };
    
    return commonCodes[code] || 'Aerolínea';
  }

  private deriveAirlineFromRoute(departureIata: string, arrivalIata: string): string {
    // Lógica muy básica basada en aeropuertos principales
    if (!departureIata || !arrivalIata) return 'Aerolínea';
    
    // Si es una ruta europea, probablemente low-cost
    const europeanAirports = ['MAD', 'BCN', 'VLC', 'EDI', 'LGW', 'STN'];
    if (europeanAirports.includes(departureIata) && europeanAirports.includes(arrivalIata)) {
      return 'Aerolínea Europea';
    }
    
    return 'Aerolínea';
  }

  private async getAirlineName(airlineCode: string): Promise<string> {
    if (!airlineCode) return '';

    // Verificar cache
    if (this.airlinesCache.has(airlineCode)) {
      return this.airlinesCache.get(airlineCode)!;
    }

    // Por ahora, usar el método extractAirlineName para obtener el nombre
    const airlineName = this.getAirlineNameFromCode(airlineCode);
    this.airlinesCache.set(airlineCode, airlineName);
    return airlineName;
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
      of(this.getAirlineNameFromCode(code)).pipe(catchError(() => of(code)))
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
