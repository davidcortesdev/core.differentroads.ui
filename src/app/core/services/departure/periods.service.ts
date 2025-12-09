import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
 * @param tkid - El ID de TK del periodo
 * @returns Observable con toda la información de la departure (sin transformar)
 */
getRawDepartureByTkId(externalId: string): Observable<any> {
  // Llama a la misma URL pero devuelve el JSON tal cual lo recibe, sin map ni transformación
  return this.http.get<any>(`${environment.toursApiUrl}/salidas?TKId=${externalId}`);
}

}