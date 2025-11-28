import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { map } from 'rxjs/operators';

export interface IAgeGroupPriceDTO {
  price: number;
  ageGroupId: number;
  ageGroupName: string;
}

export interface IFlightPackDTO {
  id: number;
  code: string;
  name: string;
  description: string;
  tkId: number;
  itineraryId: number;
  isOptional: boolean;
  imageUrl: string;
  imageAlt: string;
  isVisibleOnWeb: boolean;
  ageGroupPrices: IAgeGroupPriceDTO[];
  flights: IFlightResponse[];
}

export interface IFlightResponse {
  id: number;
  tkId?: string;
  name?: string;
  activityId: number;
  departureId: number;
  tkActivityPeriodId?: string;
  tkServiceCombinationId?: string;
  date?: string;
  tkServiceId?: string;
  tkJourneyId?: string;
  flightTypeId: number;
  departureIATACode?: string;
  arrivalIATACode?: string;
  departureDate?: string;
  departureTime?: string;
  arrivalDate?: string;
  arrivalTime?: string;
  departureCity?: string;
  arrivalCity?: string;
}

export interface IFlightDetailDTO {
  numScales: number;
  duration: number;
  airlines: string[];
  segments: IFlightSegmentResponse[];
}

export interface IFlightSegmentResponse { 
  id: number;
  tkId?: string;
  flightId: number;
  tkServiceId?: string;
  tkJourneyId?: string;
  segmentRank: number;
  departureCity: string;
  departureTime: string;
  departureIata: string;
  arrivalCity: string;
  arrivalTime: string;
  arrivalIata: string;
  flightNumber: string;
  goSegment: boolean;
  returnSegment: boolean;
  duringSegment: boolean;
  type: string; 
  numNights: number;
  differential: number;
  tkProviderId: number;  
  departureDate: string; 
  arrivalDate: string;
}

export interface IAirlineResponse {
  id: number;
  name: string;
  prefixIata: string;
  codeIata: string;
  officialName: string;
  aqsGroup: string;
}

@Injectable({
  providedIn: 'root'
})
export class FlightsNetService {
  private readonly API_URL_DEPARTURE = `${environment.toursApiUrl}/Departure`;
  private readonly API_URL_SEGMENT = `${environment.toursApiUrl}/FlightSegment`;
  private readonly API_URL_AIRLINE = `${environment.hotelsApiUrl}/Airline`;
  
  // Cache para nombres de aerolíneas
  private airlineNamesCache: Map<string, string> = new Map();

  constructor(private http: HttpClient) {}

  getFlights(periodId: number): Observable<IFlightPackDTO[]> {
    return this.http.get<IFlightPackDTO[]>(`${this.API_URL_DEPARTURE}/${periodId}/flights`);
  }

  
  getFlightDetail(flightId: number): Observable<IFlightDetailDTO> {
    const params = new HttpParams().set('flightId', flightId.toString());
    return this.http.get<IFlightSegmentResponse[]>(`${this.API_URL_SEGMENT}`, { params }).pipe(
      map((segments: IFlightSegmentResponse[]) => {
        const numScales = segments.length - 1;
        const duration = 0; // Aquí puedes calcular la duración si tienes los datos necesarios
        const airlines: string[] = [];
        segments.forEach(segment => {
          this.getAirline(segment.flightNumber.substring(0, 2)).subscribe((airline: string) => {
            if (airline && !airlines.includes(airline)) {
              airlines.push(airline);
            }
          });
        });
        const detail: IFlightDetailDTO = {
          numScales: numScales,
          duration: duration,
          airlines: airlines,
          segments: segments
        };   
        return detail;
      })
    );
  }

  getAirline(airlineCode: string): Observable<string> {
    // Verificar si ya tenemos el nombre en cache
    if (this.airlineNamesCache.has(airlineCode)) {
      return new Observable(observer => {
        observer.next(this.airlineNamesCache.get(airlineCode)!);
        observer.complete();
      });
    }

    // Si no está en cache, hacer la llamada al API
    const params = new HttpParams().set('codeIata', airlineCode);
    return this.http.get<IAirlineResponse[]>(`${this.API_URL_AIRLINE}`, { params }).pipe(
      map((airline: IAirlineResponse[]) => {
        const airlineName = airline[0]?.name || airlineCode;
        // Guardar en cache para futuras consultas
        this.airlineNamesCache.set(airlineCode, airlineName);
        return airlineName;
      })
    );
  }

  /**
   * Limpia la cache de nombres de aerolíneas
   */
  clearAirlineCache(): void {
    this.airlineNamesCache.clear();
  }

  /**
   * Obtiene el nombre de una aerolínea desde la cache (síncrono)
   * @param airlineCode Código IATA de la aerolínea
   * @returns Nombre de la aerolínea o el código si no está en cache
   */
  getAirlineNameFromCache(airlineCode: string): string {
    return this.airlineNamesCache.get(airlineCode) || airlineCode;
  }

  /**
   * Precarga múltiples aerolíneas de una vez para mejorar el rendimiento
   * @param airlineCodes Array de códigos IATA de aerolíneas
   * @returns Observable que se completa cuando todas las aerolíneas están cargadas
   */
  preloadAirlines(airlineCodes: string[]): Observable<string[]> {
    const uniqueCodes = [...new Set(airlineCodes)]; // Eliminar duplicados
    const codesToLoad = uniqueCodes.filter(code => !this.airlineNamesCache.has(code));
    
    if (codesToLoad.length === 0) {
      // Todas las aerolíneas ya están en cache
      return new Observable(observer => {
        observer.next(uniqueCodes.map(code => this.airlineNamesCache.get(code)!));
        observer.complete();
      });
    }

    // Cargar las aerolíneas que no están en cache
    const loadRequests = codesToLoad.map(code => this.getAirline(code));
    
    return new Observable(observer => {
      // Usar Promise.all para cargar todas las aerolíneas en paralelo
      Promise.all(loadRequests.map(req => req.toPromise()))
        .then(() => {
          const results = uniqueCodes.map(code => this.airlineNamesCache.get(code)!);
          observer.next(results);
          observer.complete();
        })
        .catch(error => {
          observer.error(error);
        });
    });
  }

  /**
   * Obtiene estadísticas de la cache de aerolíneas
   * @returns Objeto con información sobre el estado de la cache
   */
  getAirlineCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.airlineNamesCache.size,
      keys: Array.from(this.airlineNamesCache.keys())
    };
  }
}