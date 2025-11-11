import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * Interfaz para la respuesta de DiscountType
 */
export interface IDiscountTypeResponse {
  id: number;
  name: string;
  code: string; // 'PORCENTAJE' o 'FIJO'
  // Añade aquí otros campos que devuelva la API
}

@Injectable({
  providedIn: 'root',
})
export class DiscountTypeService {
  private readonly API_URL = `${environment.reservationsApiUrl}/DiscountType`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los tipos de descuento.
   * @returns Lista de tipos de descuento.
   */
  getAll(): Observable<IDiscountTypeResponse[]> {
    return this.http.get<IDiscountTypeResponse[]>(this.API_URL);
  }

  /**
   * Obtiene un tipo de descuento específico por su ID.
   * @param id ID del tipo de descuento.
   * @returns El tipo de descuento encontrado.
   */
  getById(id: number): Observable<IDiscountTypeResponse> {
    return this.http.get<IDiscountTypeResponse>(`${this.API_URL}/${id}`);
  }
}

