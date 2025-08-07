import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Currency {
  id: number;
  code: string;
  name: string;
  symbol?: string;
  isActive?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CurrencyService {
  private readonly API_URL = `${environment.masterdataApiUrl}/currency`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todas las currencies disponibles
   */
  getAllCurrencies(): Observable<Currency[]> {
    return this.http.get<Currency[]>(this.API_URL);
  }

  /**
   * Obtiene una currency por su código
   * @param code Código de la currency (ej: 'EUR')
   */
  getCurrencyByCode(code: string): Observable<Currency | null> {
    const params = new HttpParams().set('filter[code]', code);
    return this.http.get<Currency[]>(this.API_URL, { params }).pipe(
      map(currencies => {
        if (currencies && currencies.length > 0) {
          return currencies[0];
        }
        return null;
      })
    );
  }

  /**
   * Obtiene el ID de una currency por su código
   * @param code Código de la currency (ej: 'EUR')
   */
  getCurrencyIdByCode(code: string): Observable<number | null> {
    return this.getCurrencyByCode(code).pipe(
      map(currency => currency?.id || null)
    );
  }
}
