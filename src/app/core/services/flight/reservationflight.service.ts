import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Observable, throwError } from "rxjs";
import { catchError } from "rxjs/operators";
import { environment } from "../../../../environments/environment";
import { IAgeGroupPriceDTO, IFlightResponse } from "./flight-search.service";
 
export interface IFlightPackDTO {
    id: number;
    code?: string | null;
    name?: string | null;
    description?: string | null;
    tkId?: string | null;
    itineraryId: number;
    isOptional: boolean;
    imageUrl?: string | null;
    imageAlt?: string | null;
    isVisibleOnWeb: boolean;
    ageGroupPrices?: IAgeGroupPriceDTO[] | null;
    flights?: IFlightResponse[] | null;
  }
 
@Injectable({
    providedIn: 'root'
})
export class ReservationFlightService {
    private readonly API_URL = `${environment.reservationsApiUrl}/ReservationFlightPacks`;
 
    constructor(private http: HttpClient) {}
  
    getSelectedFlightPack(reservationId: number): Observable<IFlightPackDTO | IFlightPackDTO[]> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        });
        
        return this.http.get<IFlightPackDTO | IFlightPackDTO[]>(`${this.API_URL}/${reservationId}`, { headers })
            .pipe(
                catchError(error => {
                    console.error('Error al obtener flight pack:', error);
                    return throwError(() => error);
                })
            );
    }
}