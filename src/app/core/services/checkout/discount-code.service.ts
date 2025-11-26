import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * Interfaz para la respuesta de DiscountCode
 */
export interface IDiscountCodeResponse {
  id: number;
  code: string;
  name?: string;
  description?: string;
  discountTypeId: number;
  discountType?: any;
  amount: number; // La API devuelve 'amount', no 'value'
  isActive?: boolean;
  validFrom?: Date | string;
  validTo?: Date | string | null;
}

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface DiscountCodeFilters {
  id?: number;
  code?: string;
  discountTypeId?: number;
  isActive?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class DiscountCodeService {
  private readonly API_URL = `${environment.reservationsApiUrl}/DiscountCode`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los códigos de descuento según los criterios de filtrado.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de códigos de descuento.
   */
  getAll(filters?: DiscountCodeFilters): Observable<IDiscountCodeResponse[]> {
    let params = new HttpParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params = params.set(
            key.charAt(0).toUpperCase() + key.slice(1),
            value.toString()
          );
        }
      });
    }

    return this.http.get<IDiscountCodeResponse[]>(this.API_URL, { params });
  }

  /**
   * Busca un código de descuento por su código (string).
   * @param code Código del descuento a buscar.
   * @returns El código de descuento encontrado o null si no existe.
   */
  getByCode(code: string): Observable<IDiscountCodeResponse[]> {
    const params = new HttpParams().set('code', code);
    return this.http.get<IDiscountCodeResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene un código de descuento específico por su ID.
   * @param id ID del código de descuento.
   * @returns El código de descuento encontrado.
   */
  getById(id: number): Observable<IDiscountCodeResponse> {
    return this.http.get<IDiscountCodeResponse>(`${this.API_URL}/${id}`);
  }
}

