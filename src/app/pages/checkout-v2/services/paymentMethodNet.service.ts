import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { environment } from "../../../../environments/environment";
import { Observable } from "rxjs";

export interface IPaymentMethodResponse {
    id: number;
    code: string;
    name: string;
    description: string;
    isActive: boolean;
}

export interface IPaymentMethodCreate {
    code: string;
    name: string;
    description: string;
    isActive: boolean;
}

export interface IPaymentMethodUpdate {
    id: number;
    code?: string;
    name?: string;
    description?: string;
    isActive?: boolean;
}

export interface PaymentMethodFilter {
    id?: number;
    code?: string;
    name?: string;
    isActive?: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class PaymentMethodNetService {
    private readonly API_URL = `${environment.reservationsApiUrl}`;

    constructor(private http: HttpClient) {}

    /**
     * Obtiene un método de pago por ID
     * @param methodId - El ID del método de pago
     * @returns Observable del método de pago
     */
    getPaymentMethodById(methodId: number): Observable<IPaymentMethodResponse> {
        return this.http.get<IPaymentMethodResponse>(`${this.API_URL}/PaymentMethod/${methodId}`);
    }

    /**
     * Obtiene todos los métodos de pago con filtros opcionales
     * @param filter - Filtros opcionales para la búsqueda
     * @returns Observable de array de métodos de pago
     */
    getAllPaymentMethods(filter?: PaymentMethodFilter): Observable<IPaymentMethodResponse[]> {
        const params: any = {};
        if (filter?.id) params.id = filter.id.toString();
        if (filter?.code) params.code = filter.code;
        if (filter?.name) params.name = filter.name;
        if (filter?.isActive !== undefined) params.isActive = filter.isActive.toString();
        
        return this.http.get<IPaymentMethodResponse[]>(`${this.API_URL}/PaymentMethod`, { params });
    }

    /**
     * Obtiene métodos de pago por código
     * @param code - El código del método de pago
     * @returns Observable de array de métodos de pago
     */
    getPaymentMethodByCode(code: string): Observable<IPaymentMethodResponse[]> {
        return this.getAllPaymentMethods({ code: code });
    }

    /**
     * Obtiene métodos de pago activos
     * @returns Observable de array de métodos de pago activos
     */
    getActivePaymentMethods(): Observable<IPaymentMethodResponse[]> {
        return this.getAllPaymentMethods({ isActive: true });
    }

    /**
     * Crea un nuevo método de pago
     * @param paymentMethod - Los datos del método de pago a crear
     * @returns Observable del método de pago creado
     */
    createPaymentMethod(paymentMethod: IPaymentMethodCreate): Observable<IPaymentMethodResponse> {
        return this.http.post<IPaymentMethodResponse>(`${this.API_URL}/PaymentMethod`, paymentMethod);
    }

    /**
     * Actualiza un método de pago existente
     * @param paymentMethod - Los datos del método de pago a actualizar
     * @returns Observable del método de pago actualizado
     */
    updatePaymentMethod(paymentMethod: IPaymentMethodUpdate): Observable<IPaymentMethodResponse> {
        return this.http.put<IPaymentMethodResponse>(`${this.API_URL}/PaymentMethod/${paymentMethod.id}`, paymentMethod);
    }

    /**
     * Elimina un método de pago
     * @param methodId - El ID del método de pago a eliminar
     * @returns Observable vacío
     */
    deletePaymentMethod(methodId: number): Observable<void> {
        return this.http.delete<void>(`${this.API_URL}/PaymentMethod/${methodId}`);
    }
} 