import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { Observable } from 'rxjs';

export interface IFormData {
    ds_MerchantParameters: string;
    ds_Signature: string;
    ds_SignatureVersion: string;
}


@Injectable({
    providedIn: 'root'
})
export class NewRedsysService {

    constructor(private readonly http: HttpClient) { }

    generateFormData(paymentId: number, baseUrlBack?: string, baseUrlFront?: string): Observable<IFormData> {
        let params = new HttpParams();
        if (baseUrlBack) {
            params = params.set('baseUrlBack', baseUrlBack);
        }
        if (baseUrlFront) {
            params = params.set('baseUrlFront', baseUrlFront);
        }

        return this.http.post<IFormData>(`${environment.redsysApiUrl}/Redsys/generate-payment-form/${paymentId}`, { params });
    }
}