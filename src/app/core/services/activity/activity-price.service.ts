import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * Filtros disponibles para el método getAll (query params).
 */
export interface ActivityPriceFilters {
  Id?: number[];
  TkId?: string;
  ActivityId?: number;
  AgeGroupId?: number;
  CampaignId?: number;
  PriceCategoryId?: number;
  PriceRateId?: number;
  CurrencyId?: number;
  RetailerId?: number;
  DepartureId?: number;
}

/**
 * Modelo para crear un precio de actividad.
 */
export interface ActivityPriceCreate {
  tkId?: string | null;
  activityId: number;
  ageGroupId: number;
  campaignId?: number | null;
  priceCategoryId: number;
  priceRateId: number;
  currencyId: number;
  retailerId: number;
  basePrice: number;
  campaignPrice?: number | null;
  departureId: number;
}

/**
 * Modelo para actualizar un precio de actividad existente.
 */
export interface ActivityPriceUpdate extends ActivityPriceCreate {
  id: number;
}

/**
 * Respuesta del backend para un precio de actividad.
 */
export interface IActivityPriceResponse {
  tkId?: string | null;
  id: number;
  activityId: number;
  ageGroupId: number;
  campaignId?: number | null;
  priceCategoryId: number;
  priceRateId: number;
  currencyId: number;
  retailerId: number;
  basePrice: number;
  campaignPrice?: number | null;
  departureId: number;
}

@Injectable({
  providedIn: 'root',
})
export class ActivityPriceService {
  private readonly API_URL = `${environment.toursApiUrl}/ActivityPrice`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los precios de actividad disponibles, con filtros opcionales.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de precios de actividad.
   */
  getAll(filters?: ActivityPriceFilters): Observable<IActivityPriceResponse[]> {
    let params = new HttpParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => {
              params = params.append(key, v.toString());
            });
          } else {
            params = params.set(key, value.toString());
          }
        }
      });
    }
    return this.http.get<IActivityPriceResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene un precio de actividad específico por su ID.
   * @param id ID del precio de actividad.
   * @returns Precio de actividad correspondiente.
   */
  getById(id: number): Observable<IActivityPriceResponse> {
    return this.http.get<IActivityPriceResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * Crea un nuevo precio de actividad.
   * @param data Datos del precio de actividad a crear.
   * @returns Precio de actividad creado.
   */
  create(data: ActivityPriceCreate): Observable<IActivityPriceResponse> {
    return this.http.post<IActivityPriceResponse>(this.API_URL, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Actualiza un precio de actividad existente.
   * @param id ID del precio de actividad a actualizar.
   * @param data Datos actualizados.
   * @returns `true` si la operación fue exitosa.
   */
  update(id: number, data: ActivityPriceUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Elimina un precio de actividad por su ID.
   * @param id ID del precio de actividad a eliminar.
   * @returns `true` si la eliminación fue exitosa.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }
}