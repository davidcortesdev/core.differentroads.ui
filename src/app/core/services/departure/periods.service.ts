import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PeriodsService {

  constructor(
    private http: HttpClient,
  ) {}

/**
 * Obtiene toda la información de la departure asociada a un periodo usando el tkid.
 * @param externalId - El ID de TK del periodo
 * @param signal Signal de cancelación opcional para abortar la petición HTTP.
 * @returns Observable con toda la información de la departure (sin transformar)
 */
getRawDepartureByTkId(externalId: string, signal?: AbortSignal): Observable<any> {
  const params = new HttpParams().set('TKId', externalId);
  
  const options: {
    headers?: HttpHeaders | { [header: string]: string | string[] };
    observe?: 'body';
    params?: HttpParams | { [param: string]: any };
    reportProgress?: boolean;
    responseType?: 'json';
    withCredentials?: boolean;
    signal?: AbortSignal;
  } = { params };
  if (signal) {
    options.signal = signal;
  }
  
  // Llama a la misma URL pero devuelve el JSON tal cual lo recibe, sin map ni transformación
  return this.http.get<any>(`${environment.toursApiUrl}/salidas`, options);
}

}