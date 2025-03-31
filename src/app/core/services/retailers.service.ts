import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError, map } from 'rxjs'; // Add map import
import { environment } from '../../../environments/environment';

export interface Retailer {
  _id: string;
  externalID: string;
  __v: number;
  cif: string;
  city: string;
  corporateName: string;
  createdAt: string;
  documentationEmail: string;
  email: string;
  invoiceEmail: string;
  name: string;
  paymentType: string;
  provinceName: string;
  retailerGroupID: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class RetailersService {

  private readonly API_URL = `${environment.dataApiUrl}/retailers`;

  constructor(private http: HttpClient) { }

  /**
   * Get all retailers
   */
  getAllRetailers(): Observable<Retailer[]> {
    return this.http.get<Retailer[]>(this.API_URL)
      .pipe(
        catchError(error => {
          console.error('Error al obtener los retailers:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get retailer by ID
   */
  getRetailerById(id: string): Observable<Retailer> {
    return this.http.get<Retailer>(`${this.API_URL}/${id}`)
      .pipe(
        catchError(error => {
          console.error(`Error al obtener el retailer con ID ${id}:`, error);
          return throwError(() => error);
        })
      );
  }
  // Cache to store retailer names
    private retailerNameCache: { [id: string]: string } = {};
    
    /**
     * Get retailer name by ID synchronously (from cache)
     * Note: Must call preloadRetailerName first or this will return 'Loading...'
     */
    getRetailerNameById(id: string): string {
      if (!id) return 'N/A';
      
      // Return from cache if available
      if (this.retailerNameCache[id]) {
        return this.retailerNameCache[id];
      }
      
      // Start loading if not already in progress
      this.preloadRetailerName(id);
      
      // Return placeholder while loading
      return 'Cargando...';
    }
    
    /**
     * Preload retailer name into cache
     */
    preloadRetailerName(id: string): void {
      if (!id || this.retailerNameCache[id]) return;
      
      // Mark as loading
      this.retailerNameCache[id] = 'Cargando...';
      
      this.http.get<Retailer>(`${this.API_URL}/${id}`)
        .pipe(
          map(retailer => retailer.name),
          catchError(error => {
            console.error(`Error al obtener el retailer con ID ${id}:`, error);
            return throwError(() => error);
          })
        )
        .subscribe({
          next: (name) => {
            this.retailerNameCache[id] = name;
          },
          error: () => {
            this.retailerNameCache[id] = 'Error';
          }
        });
    }
}