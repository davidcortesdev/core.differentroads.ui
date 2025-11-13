import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ReservationCouponService {
  private readonly API_URL = `${environment.reservationsApiUrl}/ReservationCoupon`;

  constructor(private http: HttpClient) {}

  /**
   * Aplica un código de descuento a una reserva.
   * @param introducedCoupon Código de descuento introducido por el usuario.
   * @param reservationId ID de la reserva.
   * @param userId ID del usuario.
   * @param travelerId ID del viajero (opcional, nullable).
   * @returns Observable con un booleano indicando si se aplicó correctamente.
   */
  apply(
    introducedCoupon: string,
    reservationId: number,
    userId: number,
    travelerId?: number | null
  ): Observable<boolean> {
    let params = new HttpParams()
      .set('introducedCoupon', introducedCoupon)
      .set('reservationId', reservationId.toString())
      .set('userId', userId.toString());

    // travelerId es nullable, solo se incluye si se proporciona un valor
    if (travelerId != null && travelerId !== undefined) {
      params = params.set('travelerId', travelerId.toString());
    }

    return this.http.get<boolean>(`${this.API_URL}/apply`, { params });
  }
}

