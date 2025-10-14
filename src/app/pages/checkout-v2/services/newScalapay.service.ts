import { Injectable } from "@angular/core";
import { environment } from "../../../../environments/environment";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { ScalapayAmount } from "../../../core/models/scalapay/ScalapayAmount";

export interface IScalapayOrderResponse {
    token: string;
    checkoutUrl: string;
    expiresAt: Date;
    order: IScalapayOrderResponseDetails;
}

export interface IScalapayOrderResponseDetails {
    totalAmount: ScalapayAmount;
    merchantReference: string;
    status: string;
    createdAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class NewScalapayService {
    private readonly API_URL = `${environment.scalapayApiUrl}/Order`;

    constructor(private http: HttpClient) {}

    createOrder(reservationId: number, baseUrl: string): Observable<IScalapayOrderResponse> {
        const params = new HttpParams()
            .set('reservationId', reservationId)
            .set('baseUrl', baseUrl);
        return this.http.post<IScalapayOrderResponse>(`${this.API_URL}/create-order`, {}, { params });
    }

    captureOrder(token: string): Observable<any> {
        return this.http.post<any>(`${this.API_URL}/capture-order`, { token });
    }

}