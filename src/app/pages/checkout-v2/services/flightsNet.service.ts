import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

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

@Injectable({
  providedIn: 'root'
})
export class FlightsNetService {
  private readonly API_URL_DEPARTURE = `${environment.toursApiUrl}/Departure`;

  constructor(private http: HttpClient) {}

  getFlights(periodId: number): Observable<IFlightPackDTO[]> {
    return this.http.get<IFlightPackDTO[]>(`${this.API_URL_DEPARTURE}/${periodId}/flights`);
  }

  // TODO: Add methods to get flights by departureId and reservationId
}