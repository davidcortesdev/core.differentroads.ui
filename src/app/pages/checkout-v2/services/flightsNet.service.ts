import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { map } from 'rxjs/operators';

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
  totalPrice: number;
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

  constructor(private http: HttpClient) {}

  getFlights(periodId: number): Observable<IFlightPackDTO[]> {
    return this.http.get<IFlightPackDTO[]>(`${this.API_URL_DEPARTURE}/${periodId}/flights`);
  }

  // TODO: Add methods to get flights by departureId and reservationId
  getFlightDetail(flightId: number): Observable<IFlightDetailDTO> {
    const params = new HttpParams().set('flightId', flightId.toString());
    return this.http.get<IFlightSegmentResponse[]>(`${this.API_URL_SEGMENT}`, { params }).pipe(
      map((segments: IFlightSegmentResponse[]) => {
        const numScales = segments.length;
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
    const params = new HttpParams().set('codeIata', airlineCode);
    return this.http.get<IAirlineResponse[]>(`${this.API_URL_AIRLINE}`, { params }).pipe(
      map((airline: IAirlineResponse[]) => {
        return airline[0].name;
      })
    );
  }
}