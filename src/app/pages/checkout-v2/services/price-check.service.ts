import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface IPriceCheckResponse {
  needsUpdate: boolean;
  jobStatus?: string;
  jobId?: string;
  tourTKId?: string;
}

export interface IJobStatusResponse {
  jobId: string;
  state: string;
  createdAt: string;
  properties: any;
}

@Injectable({
  providedIn: 'root'
})
export class PriceCheckService {
  private readonly API_URL = `${environment.tourknifeApiUrl}/PriceCheck`;

  constructor(private http: HttpClient) {}

  /**
   * Verifica si los precios necesitan actualización
   * @param retailerID ID del retailer
   * @param departureID ID del departure
   * @param numPasajeros Número de pasajeros
   * @returns Observable con la respuesta del PriceCheck
   */
  checkPrices(retailerID: number, departureID: number, numPasajeros: number): Observable<IPriceCheckResponse> {
    return this.http.get<IPriceCheckResponse>(`${this.API_URL}/${retailerID}/${departureID}/${numPasajeros}`);
  }

  /**
   * Verifica el estado de un job de sincronización
   * @param jobId ID del job de Hangfire
   * @returns Observable con el estado del job
   */
  checkJobStatus(jobId: string): Observable<IJobStatusResponse> {
    return this.http.get<IJobStatusResponse>(`${this.API_URL}/status/${jobId}`);
  }
} 