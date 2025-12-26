import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError, map } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface RetailerFilter {
  id?: number;
  name?: string;
  code?: string;
  tkId?: string;
  fiscalName?: string;
  city?: string;
  provinceId?: number;
  email?: string;
  documentationEmail?: string;
  billingEmail?: string;
  paymentTypeId?: number;
  useExactMatchForStrings?: boolean;
}

export interface Retailer {
  id: number;
  code: string;
  name: string;
  tkId: string;
  fiscalName: string;
  address: string;
  city: string;
  provinceId: number | null;
  email: string;
  documentationEmail: string;
  billingEmail: string;
  retailerGroupId: number;
  paymentTypeId: number;
}

export interface CreateRetailerRequest {
  code: string;
  name: string;
  tkId: string;
  fiscalName: string;
  address: string;
  city: string;
  provinceId: number;
  email: string;
  documentationEmail: string;
  billingEmail: string;
  retailerGroupId: number;
  paymentTypeId: number;
}

export interface UpdateRetailerRequest {
  code: string;
  name: string;
  tkId: string;
  fiscalName: string;
  address: string;
  city: string;
  provinceId: number;
  email: string;
  documentationEmail: string;
  billingEmail: string;
  retailerGroupId: number;
  paymentTypeId: number;
}

@Injectable({
  providedIn: 'root'
})
export class RetailerService {
  private readonly API_URL = `${environment.toursApiUrl}/Retailer`;

  constructor(private http: HttpClient) { }

  /**
   * Get retailers based on filter criteria
   * @param filter Filter criteria for retailers
   * @returns Observable of Retailer array
   */
  getRetailers(filter?: RetailerFilter, signal?: AbortSignal): Observable<Retailer[]> {
    let params = new HttpParams();
    
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          // Capitalize first letter of parameter names to match API expectations
          const paramName = key.charAt(0).toUpperCase() + key.slice(1);
          params = params.set(paramName, value.toString());
        }
      });
    }

    const options: {
      params?: HttpParams | { [param: string]: any };
      headers?: { [header: string]: string | string[] };
      signal?: AbortSignal;
    } = {
      params,
      headers: {
        'Accept': 'text/plain'
      }
    };
    if (signal) {
      options.signal = signal;
    }

    return this.http.get<Retailer[]>(this.API_URL, options).pipe(
      catchError(error => {
        return throwError(() => error);
      })
    );
  }

  /**
   * Get a specific retailer by its ID
   * @param id Retailer ID
   * @returns Observable of Retailer
   */
  getRetailerById(id: number, signal?: AbortSignal): Observable<Retailer> {
    const options: {
      params?: HttpParams | { [param: string]: any };
      headers?: { [header: string]: string | string[] };
      signal?: AbortSignal;
    } = {
      headers: {
        'Accept': 'text/plain'
      }
    };
    if (signal) {
      options.signal = signal;
    }
    return this.http.get<Retailer>(`${this.API_URL}/${id}`, options).pipe(
      catchError(error => {
        return throwError(() => error);
      })
    );
  }

  /**
   * Create a new retailer
   * @param retailerData Retailer creation data
   * @returns Observable of created Retailer
   */
  createRetailer(retailerData: CreateRetailerRequest): Observable<Retailer> {
    return this.http.post<Retailer>(this.API_URL, retailerData, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/plain'
      }
    }).pipe(
      catchError(error => {
        return throwError(() => error);
      })
    );
  }

  /**
   * Update an existing retailer
   * @param id Retailer ID to update
   * @param retailerData Retailer update data
   * @returns Observable of updated Retailer
   */
  updateRetailer(id: number, retailerData: UpdateRetailerRequest): Observable<Retailer> {
    return this.http.put<Retailer>(`${this.API_URL}/${id}`, retailerData, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/plain'
      }
    }).pipe(
      catchError(error => {
        return throwError(() => error);
      })
    );
  }

  /**
   * Delete a retailer
   * @param id Retailer ID to delete
   * @returns Observable of boolean indicating success
   */
  deleteRetailer(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`, {
      headers: {
        'Accept': 'text/plain'
      }
    }).pipe(
      catchError(error => {
        return throwError(() => error);
      })
    );
  }

  /**
   * Get retailer by code
   * @param code Retailer code
   * @returns Observable of Retailer
   */
  getRetailerByCode(code: string, signal?: AbortSignal): Observable<Retailer | null> {
    const filter: RetailerFilter = {
      code: code,
      useExactMatchForStrings: true
    };

    return this.getRetailers(filter, signal).pipe(
      map(retailers => {
        return retailers.length > 0 ? retailers[0] : null;
      }),
      catchError(error => {
        return throwError(() => error);
      })
    );
  }

  /**
   * Get retailer by TK ID
   * @param tkId TK identifier
   * @returns Observable of Retailer
   */
  getRetailerByTKId(tkId: string, signal?: AbortSignal): Observable<Retailer | null> {
    const filter: RetailerFilter = {
      tkId: tkId,
      useExactMatchForStrings: true
    };

    return this.getRetailers(filter, signal).pipe(
      map(retailers => {
        return retailers.length > 0 ? retailers[0] : null;
      }),
      catchError(error => {
        return throwError(() => error);
      })
    );
  }

  /**
   * Get retailers by city
   * @param city City name
   * @param useExactMatch Whether to use exact matching for city name
   * @returns Observable of Retailer array
   */
  getRetailersByCity(city: string, useExactMatch: boolean = false, signal?: AbortSignal): Observable<Retailer[]> {
    const filter: RetailerFilter = {
      city: city,
      useExactMatchForStrings: useExactMatch
    };

    return this.getRetailers(filter, signal);
  }

  /**
   * Get retailers by province
   * @param provinceId Province ID
   * @returns Observable of Retailer array
   */
  getRetailersByProvince(provinceId: number, signal?: AbortSignal): Observable<Retailer[]> {
    const filter: RetailerFilter = {
      provinceId: provinceId
    };

    return this.getRetailers(filter, signal);
  }

  /**
   * Get retailers by payment type
   * @param paymentTypeId Payment type ID
   * @returns Observable of Retailer array
   */
  getRetailersByPaymentType(paymentTypeId: number, signal?: AbortSignal): Observable<Retailer[]> {
    const filter: RetailerFilter = {
      paymentTypeId: paymentTypeId
    };

    return this.getRetailers(filter, signal);
  }

  /**
   * Search retailers by name (partial match)
   * @param name Partial name to search for
   * @returns Observable of Retailer array
   */
  searchRetailersByName(name: string, signal?: AbortSignal): Observable<Retailer[]> {
    const filter: RetailerFilter = {
      name: name,
      useExactMatchForStrings: false
    };

    return this.getRetailers(filter, signal);
  }

  /**
   * Get the default retailer (from environment configuration)
   * @returns Observable of Retailer
   */
  getDefaultRetailer(signal?: AbortSignal): Observable<Retailer> {
    const defaultId = environment.retaileriddefault || 7;
    return this.getRetailerById(defaultId, signal);
  }
}
