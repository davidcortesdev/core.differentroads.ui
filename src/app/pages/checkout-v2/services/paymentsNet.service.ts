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

export interface IPaymentStatusResponse {
    id: number;
    code: string;
    name: string;
    description: string;
}

export class PaymentStatusFilter {
    id?: number = 0;
    code?: string = '';
    name?: string = '';
}

@Injectable({
    providedIn: 'root'
})
export class PaymentsNetService {
    private readonly API_URL = `${environment.reservationsApiUrl}/ReservationPayment`;

    constructor(private http: HttpClient) {}

    getPaymentById(paymentId: number): Observable<IPaymentResponse> {
        return this.http.get<IPaymentResponse>(`${this.API_URL}/${paymentId}`);
    }

    update(payment: IPaymentResponse): Observable<IPaymentResponse> {
        return this.http.put<IPaymentResponse>(`${this.API_URL}/${payment.id}`, payment);
    }

    getStatus(filter: PaymentStatusFilter): Observable<IPaymentStatusResponse[]> {
        const params: any = {};
        if (filter.id) params.id = filter.id.toString();
        if (filter.code) params.code = filter.code;
        if (filter.name) params.name = filter.name;
        return this.http.get<IPaymentStatusResponse[]>(`${this.API_URL}/PaymentStatus`, { params });
    }
}