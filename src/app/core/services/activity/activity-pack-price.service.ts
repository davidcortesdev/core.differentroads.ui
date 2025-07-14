import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface ActivityPackPriceFilters {
  id?: number;
  tkId?: string;
  activityPackId?: number;
  ageGroupId?: number;
  campaignId?: number;
  priceCategoryId?: number;
  priceRateId?: number;
  currencyId?: number;
  retailerId?: number;
  basePrice?: number;
  campaignPrice?: number;
  departureId?: number;
}

/**
 * Modelo para crear un precio de pack de actividad.
 */
export interface ActivityPackPriceCreate {
  tkId: string | null;
  activityPackId: number;
  ageGroupId: number;
  campaignId: number;
  priceCategoryId: number;
  priceRateId: number;
  currencyId: number;
  retailerId: number;
  basePrice: number;
  campaignPrice: number;
  departureId: number;
}

/**
 * Modelo para actualizar un precio de pack de actividad existente.
 */
export interface ActivityPackPriceUpdate {
  tkId: string | null;
  activityPackId: number;
  ageGroupId: number;
  campaignId: number;
  priceCategoryId: number;
  priceRateId: number;
  currencyId: number;
  retailerId: number;
  basePrice: number;
  campaignPrice: number;
  departureId: number;
}

/**
 * Respuesta del backend para un precio de pack de actividad.
 */
export interface IActivityPackPriceResponse {
  id: number;
  tkId: string | null;
  activityPackId: number;
  ageGroupId: number;
  campaignId: number;
  priceCategoryId: number;
  priceRateId: number;
  currencyId: number;
  retailerId: number;
  basePrice: number;
  campaignPrice: number;
  departureId: number;
}

@Injectable({
  providedIn: 'root',
})
export class ActivityPackPriceService {
  private readonly API_URL = `${environment.toursApiUrl}/ActivityPackPrice`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los precios de pack de actividad disponibles.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de precios de pack de actividad.
   */
  getAll(filter?: ActivityPackPriceFilters): Observable<IActivityPackPriceResponse[]> {
    let params = new HttpParams();

    // Add filter parameters if provided
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params = params.set(
            key.charAt(0).toUpperCase() + key.slice(1),
            value.toString()
          );
        }
      });
    }

    return this.http.get<IActivityPackPriceResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene un precio de pack de actividad específico por su ID.
   * @param id ID del precio de pack de actividad.
   * @returns Precio de pack de actividad correspondiente.
   */
  getById(id: number): Observable<IActivityPackPriceResponse> {
    return this.http.get<IActivityPackPriceResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * Obtiene todos los precios de un pack de actividad específico.
   * @param activityPackId ID del pack de actividad.
   * @returns Lista de precios del pack de actividad.
   */
  getByActivityPackId(activityPackId: number): Observable<IActivityPackPriceResponse[]> {
    return this.getAll({ activityPackId });
  }

  /**
   * Obtiene precios por campaña específica.
   * @param campaignId ID de la campaña.
   * @returns Lista de precios de la campaña.
   */
  getByCampaignId(campaignId: number): Observable<IActivityPackPriceResponse[]> {
    return this.getAll({ campaignId });
  }

  /**
   * Obtiene precios por grupo de edad específico.
   * @param ageGroupId ID del grupo de edad.
   * @returns Lista de precios del grupo de edad.
   */
  getByAgeGroupId(ageGroupId: number): Observable<IActivityPackPriceResponse[]> {
    return this.getAll({ ageGroupId });
  }

  /**
   * Obtiene precios por salida específica.
   * @param departureId ID de la salida.
   * @returns Lista de precios de la salida.
   */
  getByDepartureId(departureId: number): Observable<IActivityPackPriceResponse[]> {
    return this.getAll({ departureId });
  }

  /**
   * Obtiene precios por retailer específico.
   * @param retailerId ID del retailer.
   * @returns Lista de precios del retailer.
   */
  getByRetailerId(retailerId: number): Observable<IActivityPackPriceResponse[]> {
    return this.getAll({ retailerId });
  }

  /**
   * Obtiene precios por moneda específica.
   * @param currencyId ID de la moneda.
   * @returns Lista de precios en la moneda especificada.
   */
  getByCurrencyId(currencyId: number): Observable<IActivityPackPriceResponse[]> {
    return this.getAll({ currencyId });
  }

  /**
   * Crea un nuevo precio de pack de actividad.
   * @param data Datos del precio a crear.
   * @returns Precio de pack de actividad creado.
   */
  create(data: ActivityPackPriceCreate): Observable<IActivityPackPriceResponse> {
    return this.http.post<IActivityPackPriceResponse>(this.API_URL, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Actualiza un precio de pack de actividad existente.
   * @param id ID del precio a actualizar.
   * @param data Datos actualizados.
   * @returns `true` si la operación fue exitosa.
   */
  update(id: number, data: ActivityPackPriceUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Elimina un precio de pack de actividad por su ID.
   * @param id ID del precio a eliminar.
   * @returns `true` si la eliminación fue exitosa.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }

  /**
   * Actualiza solo los precios (base y campaña) de un registro.
   * @param id ID del precio.
   * @param basePrice Nuevo precio base.
   * @param campaignPrice Nuevo precio de campaña.
   * @returns `true` si la operación fue exitosa.
   */
  updatePrices(id: number, basePrice: number, campaignPrice: number): Observable<boolean> {
    return this.http.patch<boolean>(`${this.API_URL}/${id}/prices`, { basePrice, campaignPrice }, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Obtiene el precio más bajo para un pack de actividad específico.
   * @param activityPackId ID del pack de actividad.
   * @param campaignId ID de la campaña (opcional).
   * @returns Precio más bajo encontrado.
   */
  getLowestPrice(activityPackId: number, campaignId?: number): Observable<IActivityPackPriceResponse> {
    let params = new HttpParams().set('activityPackId', activityPackId.toString());
    if (campaignId) {
      params = params.set('campaignId', campaignId.toString());
    }
    return this.http.get<IActivityPackPriceResponse>(`${this.API_URL}/lowest-price`, { params });
  }

  /**
   * Crea múltiples precios en lote.
   * @param prices Array de precios a crear.
   * @returns Lista de precios creados.
   */
  createBatch(prices: ActivityPackPriceCreate[]): Observable<IActivityPackPriceResponse[]> {
    return this.http.post<IActivityPackPriceResponse[]>(`${this.API_URL}/batch`, prices, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }
}