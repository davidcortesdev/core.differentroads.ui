import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { environment } from "../../../../environments/environment";
import { Observable } from "rxjs";

export interface IPaymentResponse {
    id: number;
    reservationId: number;
    amount: number;
    paymentDate: Date;
    paymentMethodId: number;
    paymentStatusId: number;
    transactionReference?: string;
    notes?: string;
    attachmentUrl?: string;
}

@Injectable({
    providedIn: 'root'
})
export class PaymentsNetService {
    private readonly API_URL = `${environment.reservationsApiUrl}/payments`;

    constructor(private http: HttpClient) {}

    getPaymentById(paymentId: number): Observable<IPaymentResponse> {
        return this.http.get<IPaymentResponse>(`${this.API_URL}/reservationPayment/${paymentId}`);
    }
}