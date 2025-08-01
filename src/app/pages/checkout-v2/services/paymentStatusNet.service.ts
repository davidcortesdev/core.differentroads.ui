import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { environment } from "../../../../environments/environment";
import { Observable } from "rxjs";

export interface IPaymentStatusResponse {
    id: number;
    code: string;
    name: string;
    description: string;
}

export interface IPaymentStatusCreate {
    code: string;
    name: string;
    description: string;
}

export interface IPaymentStatusUpdate {
    id: number;
    code?: string;
    name?: string;
    description?: string;
}

export interface PaymentStatusFilter {
    id?: number;
    code?: string;
    name?: string;
    description?: string;
}

@Injectable({
    providedIn: 'root'
})
export class PaymentStatusNetService {
    private readonly API_URL = `${environment.reservationsApiUrl}`;

    constructor(private http: HttpClient) {}

    /**
     * Obtiene un estado de pago por ID
     * @param statusId - El ID del estado de pago
     * @returns Observable del estado de pago
     */
    getPaymentStatusById(statusId: number): Observable<IPaymentStatusResponse> {
        return this.http.get<IPaymentStatusResponse>(`${this.API_URL}/PaymentStatus/${statusId}`);
    }

    /**
     * Obtiene todos los estados de pago con filtros opcionales
     * @param filter - Filtros opcionales para la búsqueda
     * @returns Observable de array de estados de pago
     */
    getAllPaymentStatuses(filter?: PaymentStatusFilter): Observable<IPaymentStatusResponse[]> {
        const params: any = {};
        if (filter?.id) params.id = filter.id.toString();
        if (filter?.code) params.code = filter.code;
        if (filter?.name) params.name = filter.name;
        if (filter?.description) params.description = filter.description;
        
        return this.http.get<IPaymentStatusResponse[]>(`${this.API_URL}/PaymentStatus`, { params });
    }

    /**
     * Obtiene estados de pago por código
     * @param code - El código del estado de pago
     * @returns Observable de array de estados de pago
     */
    getPaymentStatusByCode(code: string): Observable<IPaymentStatusResponse[]> {
        return this.getAllPaymentStatuses({ code: code });
    }

    /**
     * Obtiene estados de pago por nombre
     * @param name - El nombre del estado de pago
     * @returns Observable de array de estados de pago
     */
    getPaymentStatusByName(name: string): Observable<IPaymentStatusResponse[]> {
        return this.getAllPaymentStatuses({ name: name });
    }

    /**
     * Crea un nuevo estado de pago
     * @param paymentStatus - Los datos del estado de pago a crear
     * @returns Observable del estado de pago creado
     */
    createPaymentStatus(paymentStatus: IPaymentStatusCreate): Observable<IPaymentStatusResponse> {
        return this.http.post<IPaymentStatusResponse>(`${this.API_URL}/PaymentStatus`, paymentStatus);
    }

    /**
     * Actualiza un estado de pago existente
     * @param paymentStatus - Los datos del estado de pago a actualizar
     * @returns Observable del estado de pago actualizado
     */
    updatePaymentStatus(paymentStatus: IPaymentStatusUpdate): Observable<IPaymentStatusResponse> {
        return this.http.put<IPaymentStatusResponse>(`${this.API_URL}/PaymentStatus/${paymentStatus.id}`, paymentStatus);
    }

    /**
     * Elimina un estado de pago
     * @param statusId - El ID del estado de pago a eliminar
     * @returns Observable vacío
     */
    deletePaymentStatus(statusId: number): Observable<void> {
        return this.http.delete<void>(`${this.API_URL}/PaymentStatus/${statusId}`);
    }
} 