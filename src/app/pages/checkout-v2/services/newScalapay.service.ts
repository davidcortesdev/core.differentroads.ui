import { Injectable } from "@angular/core";
import { environment } from "../../../../environments/environment";
import { HttpClient, HttpParams } from "@angular/common/http";
import { IFlightPackDTO } from "./flightsNet.service";
import { Observable } from "rxjs";
import { ScalapayAmount } from "../../../core/models/scalapay/ScalapayAmount";

export interface IScalapayOrderResponse {
    Token: string;
    CheckoutUrl: string;
    ExpiresAt: Date;
    Order: IScalapayOrderResponseDetails;
}

export interface IScalapayOrderResponseDetails {
    TotalAmount: ScalapayAmount;
    MerchantReference: string;
    Status: string;
    CreatedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class NewScalapayService {
    private readonly API_URL = `${environment.scalapayApiUrl}/Order`;

    constructor(private http: HttpClient) {}

    createOrder(reservationId: number, payments: number): Observable<IScalapayOrderResponse> {
        const params = new HttpParams()
            .set('reservationId', reservationId)
            .set('payments', payments);
        return this.http.post<IScalapayOrderResponse>(`${this.API_URL}/create-order`, {}, { params });
    }

}