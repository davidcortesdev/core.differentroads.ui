import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface DepartureAccommodationPriceCreate {
  id: number;
  tkId: string;
  departureAccommodationId: number;
  ageGroupId: number;
  campaignId: number;
  priceCategoryId: number;
  priceRateId: number;
  currencyId: number;
  retailerId: number;
  departureId: number;
}

export interface DepartureAccommodationPriceUpdate {
  id: number;
  tkId: string;
  departureAccommodationId: number;
  ageGroupId: number;
  campaignId: number;
  priceCategoryId: number;
  priceRateId: number;
  currencyId: number;
  retailerId: number;
  departureId: number;
}

export interface IDepartureAccommodationPriceResponse {
  id: number;
  tkId: string;
  departureAccommodationId: number;
  ageGroupId: number;
  campaignId: number;
  priceCategoryId: number;
  priceRateId: number;
  currencyId: number;
  retailerId: number;
  departureId: number;
}

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface DepartureAccommodationPriceFilters {
  id?: number;
  tkId?: string;
  departureAccommodationId?: number;
  ageGroupId?: number;
  campaignId?: number;
  priceCategoryId?: number;
  priceRateId?: number;
  currencyId?: number;
  retailerId?: number;
  departureId?: number;
}

@Injectable({
  providedIn: 'root',
})
export class DepartureAccommodationPriceService {
  private readonly API_URL = `${environment.toursApiUrl}/DepartureAccommodationPrice`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los precios de accommodation de departures según los criterios de filtrado.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de departure accommodation prices.
   */
  getAll(filters?: DepartureAccommodationPriceFilters): Observable<IDepartureAccommodationPriceResponse[]> {
    let params = new HttpParams();

    // Add filter parameters if provided
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

    return this.http.get<IDepartureAccommodationPriceResponse[]>(this.API_URL, { params });
  }

  /**
   * Crea un nuevo precio de departure accommodation.
   * @param data Datos para crear el precio de departure accommodation.
   * @returns El precio de departure accommodation creado.
   */
  create(data: DepartureAccommodationPriceCreate): Observable<IDepartureAccommodationPriceResponse> {
    return this.http.post<IDepartureAccommodationPriceResponse>(`${this.API_URL}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Obtiene un precio de departure accommodation específico por su ID.
   * @param id ID del precio de departure accommodation.
   * @returns El precio de departure accommodation encontrado.
   */
  getById(id: number): Observable<IDepartureAccommodationPriceResponse> {
    return this.http.get<IDepartureAccommodationPriceResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * Actualiza un precio de departure accommodation existente.
   * @param id ID del precio de departure accommodation a actualizar.
   * @param data Datos actualizados.
   * @returns Resultado de la operación.
   */
  update(id: number, data: DepartureAccommodationPriceUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Elimina un precio de departure accommodation existente.
   * @param id ID del precio de departure accommodation a eliminar.
   * @returns Resultado de la operación.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }

  /**
   * Obtiene precios de departure accommodation por ID de departure.
   * @param departureId ID del departure.
   * @returns Lista de precios de accommodation del departure.
   */
  getByDeparture(departureId: number): Observable<IDepartureAccommodationPriceResponse[]> {
    const params = new HttpParams()
      .set('DepartureId', departureId.toString())
      .set('useExactMatchForStrings', 'false');
    
    return this.http.get<IDepartureAccommodationPriceResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene precios de departure accommodation por ID de departure accommodation.
   * @param departureAccommodationId ID del departure accommodation.
   * @returns Lista de precios del departure accommodation.
   */
  getByDepartureAccommodation(departureAccommodationId: number): Observable<IDepartureAccommodationPriceResponse[]> {
    const params = new HttpParams()
      .set('DepartureAccommodationId', departureAccommodationId.toString())
      .set('useExactMatchForStrings', 'false');
    
    return this.http.get<IDepartureAccommodationPriceResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene precios de departure accommodation por ID de campaign.
   * @param campaignId ID de la campaign.
   * @returns Lista de precios de la campaign.
   */
  getByCampaign(campaignId: number): Observable<IDepartureAccommodationPriceResponse[]> {
    const params = new HttpParams()
      .set('CampaignId', campaignId.toString())
      .set('useExactMatchForStrings', 'false');
    
    return this.http.get<IDepartureAccommodationPriceResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene precios de departure accommodation por ID de retailer.
   * @param retailerId ID del retailer.
   * @returns Lista de precios del retailer.
   */
  getByRetailer(retailerId: number): Observable<IDepartureAccommodationPriceResponse[]> {
    const params = new HttpParams()
      .set('RetailerId', retailerId.toString())
      .set('useExactMatchForStrings', 'false');
    
    return this.http.get<IDepartureAccommodationPriceResponse[]>(this.API_URL, { params });
  }
}