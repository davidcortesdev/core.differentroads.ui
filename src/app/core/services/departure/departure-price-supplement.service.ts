import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface DeparturePriceSupplementCreate {
  id: number;
  tkId: string;
  departureId: number;
  ageGroupId: number;
  campaignId: number;
  priceCategoryId: number;
  priceRateId: number;
  currencyId: number;
  retailerId: number;
  supplement: number;
  campaignSupplement: number;
  basePeriodPrice: number;
}

export interface DeparturePriceSupplementUpdate {
  id: number;
  tkId: string;
  departureId: number;
  ageGroupId: number;
  campaignId: number;
  priceCategoryId: number;
  priceRateId: number;
  currencyId: number;
  retailerId: number;
  supplement: number;
  campaignSupplement: number;
  basePeriodPrice: number;
}

export interface IDeparturePriceSupplementResponse {
  id: number;
  tkId: string;
  departureId: number;
  ageGroupId: number;
  campaignId: number;
  priceCategoryId: number;
  priceRateId: number;
  currencyId: number;
  retailerId: number;
  supplement: number;
  campaignSupplement: number;
  basePeriodPrice: number;
}

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface DeparturePriceSupplementFilters {
  id?: number;
  tkId?: string;
  departureId?: number;
  ageGroupId?: number;
  campaignId?: number;
  priceCategoryId?: number;
  priceRateId?: number;
  currencyId?: number;
  retailerId?: number;
  supplement?: number;
  campaignSupplement?: number;
  basePeriodPrice?: number;
}

@Injectable({
  providedIn: 'root',
})
export class DeparturePriceSupplementService {
  private readonly API_URL = `${environment.toursApiUrl}/DeparturePriceSupplement`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los suplementos de precio de departure según los criterios de filtrado.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de suplementos de precio de departure.
   */
  getAll(filters?: DeparturePriceSupplementFilters): Observable<IDeparturePriceSupplementResponse[]> {
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

    return this.http.get<IDeparturePriceSupplementResponse[]>(this.API_URL, { params });
  }

  /**
   * Crea un nuevo suplemento de precio de departure.
   * @param data Datos para crear el suplemento de precio de departure.
   * @returns El suplemento de precio de departure creado.
   */
  create(data: DeparturePriceSupplementCreate): Observable<IDeparturePriceSupplementResponse> {
    return this.http.post<IDeparturePriceSupplementResponse>(`${this.API_URL}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Obtiene un suplemento de precio de departure específico por su ID.
   * @param id ID del suplemento de precio de departure.
   * @returns El suplemento de precio de departure encontrado.
   */
  getById(id: number): Observable<IDeparturePriceSupplementResponse> {
    return this.http.get<IDeparturePriceSupplementResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * Actualiza un suplemento de precio de departure existente.
   * @param id ID del suplemento de precio de departure a actualizar.
   * @param data Datos actualizados.
   * @returns Resultado de la operación.
   */
  update(id: number, data: DeparturePriceSupplementUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Elimina un suplemento de precio de departure existente.
   * @param id ID del suplemento de precio de departure a eliminar.
   * @returns Resultado de la operación.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }

  /**
   * Obtiene suplementos de precio por ID de departure.
   * @param departureId ID del departure.
   * @returns Lista de suplementos de precio del departure.
   */
  getByDeparture(departureId: number): Observable<IDeparturePriceSupplementResponse[]> {
    const params = new HttpParams()
      .set('DepartureId', departureId.toString())
      .set('useExactMatchForStrings', 'false');
    
    return this.http.get<IDeparturePriceSupplementResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene suplementos de precio por ID de campaign.
   * @param campaignId ID de la campaign.
   * @returns Lista de suplementos de precio de la campaign.
   */
  getByCampaign(campaignId: number): Observable<IDeparturePriceSupplementResponse[]> {
    const params = new HttpParams()
      .set('CampaignId', campaignId.toString())
      .set('useExactMatchForStrings', 'false');
    
    return this.http.get<IDeparturePriceSupplementResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene suplementos de precio por ID de retailer.
   * @param retailerId ID del retailer.
   * @returns Lista de suplementos de precio del retailer.
   */
  getByRetailer(retailerId: number): Observable<IDeparturePriceSupplementResponse[]> {
    const params = new HttpParams()
      .set('RetailerId', retailerId.toString())
      .set('useExactMatchForStrings', 'false');
    
    return this.http.get<IDeparturePriceSupplementResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene suplementos de precio por ID de age group.
   * @param ageGroupId ID del age group.
   * @returns Lista de suplementos de precio del age group.
   */
  getByAgeGroup(ageGroupId: number): Observable<IDeparturePriceSupplementResponse[]> {
    const params = new HttpParams()
      .set('AgeGroupId', ageGroupId.toString())
      .set('useExactMatchForStrings', 'false');
    
    return this.http.get<IDeparturePriceSupplementResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene suplementos de precio por ID de price category.
   * @param priceCategoryId ID de la price category.
   * @returns Lista de suplementos de precio de la price category.
   */
  getByPriceCategory(priceCategoryId: number): Observable<IDeparturePriceSupplementResponse[]> {
    const params = new HttpParams()
      .set('PriceCategoryId', priceCategoryId.toString())
      .set('useExactMatchForStrings', 'false');
    
    return this.http.get<IDeparturePriceSupplementResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene suplementos de precio por ID de price rate.
   * @param priceRateId ID del price rate.
   * @returns Lista de suplementos de precio del price rate.
   */
  getByPriceRate(priceRateId: number): Observable<IDeparturePriceSupplementResponse[]> {
    const params = new HttpParams()
      .set('PriceRateId', priceRateId.toString())
      .set('useExactMatchForStrings', 'false');
    
    return this.http.get<IDeparturePriceSupplementResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene suplementos de precio por ID de currency.
   * @param currencyId ID de la currency.
   * @returns Lista de suplementos de precio de la currency.
   */
  getByCurrency(currencyId: number): Observable<IDeparturePriceSupplementResponse[]> {
    const params = new HttpParams()
      .set('CurrencyId', currencyId.toString())
      .set('useExactMatchForStrings', 'false');
    
    return this.http.get<IDeparturePriceSupplementResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene suplementos de precio con filtros múltiples para búsquedas específicas.
   * @param departureId ID del departure.
   * @param campaignId ID de la campaign.
   * @param retailerId ID del retailer.
   * @returns Lista de suplementos de precio filtrados.
   */
  getByDepartureCampaignRetailer(
    departureId: number, 
    campaignId: number, 
    retailerId: number
  ): Observable<IDeparturePriceSupplementResponse[]> {
    const params = new HttpParams()
      .set('DepartureId', departureId.toString())
      .set('CampaignId', campaignId.toString())
      .set('RetailerId', retailerId.toString())
      .set('useExactMatchForStrings', 'false');
    
    return this.http.get<IDeparturePriceSupplementResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene suplementos de precio para cotización específica.
   * @param departureId ID del departure.
   * @param ageGroupId ID del age group.
   * @param priceCategoryId ID de la price category.
   * @param currencyId ID de la currency.
   * @returns Lista de suplementos de precio para cotización.
   */
  getForPricing(
    departureId: number,
    ageGroupId: number,
    priceCategoryId: number,
    currencyId: number
  ): Observable<IDeparturePriceSupplementResponse[]> {
    const params = new HttpParams()
      .set('DepartureId', departureId.toString())
      .set('AgeGroupId', ageGroupId.toString())
      .set('PriceCategoryId', priceCategoryId.toString())
      .set('CurrencyId', currencyId.toString())
      .set('useExactMatchForStrings', 'false');
    
    return this.http.get<IDeparturePriceSupplementResponse[]>(this.API_URL, { params });
  }
}