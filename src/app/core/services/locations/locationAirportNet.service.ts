import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { LocationAirport, FuzzyLocationAirportResponse } from '../../models/location/location.model';

@Injectable({
    providedIn: 'root'
})
export class LocationAirportNetService {
    private apiUrl = environment.locationsApiUrl;

    constructor(private http: HttpClient) { }

    // Obtener aeropuertos con filtros
    getAirports(filters?: any, signal?: AbortSignal): Observable<LocationAirport[]> {
        let params = new HttpParams();
        if (filters) {
            Object.keys(filters).forEach(key => {
                if (filters[key] !== undefined && filters[key] !== null) {
                    params = params.append(key, filters[key]);
                }
            });
        }
        const options: {
            params?: HttpParams | { [param: string]: any };
            signal?: AbortSignal;
        } = { params };
        if (signal) {
            options.signal = signal;
        }
        return this.http.get<LocationAirport[]>(`${this.apiUrl}/locationairport`, options)
            .pipe(
                catchError(error => {
                    return of([]);
                })
            );
    }

    // Obtener aeropuerto por ID
    getAirportById(id: number, signal?: AbortSignal): Observable<LocationAirport> {
        const options: {
            params?: HttpParams | { [param: string]: any };
            signal?: AbortSignal;
        } = {};
        if (signal) {
            options.signal = signal;
        }
        return this.http.get<LocationAirport>(`${this.apiUrl}/locationairport/${id}`, options)
            .pipe(
                catchError(error => {
                    return of({} as LocationAirport);
                })
            );
    }

    // Crear aeropuerto
    createAirport(airport: LocationAirport): Observable<LocationAirport> {
        return this.http.post<LocationAirport>(`${this.apiUrl}/locationairport`, airport)
            .pipe(
                catchError(error => {
                    return of({} as LocationAirport);
                })
            );
    }

    // Actualizar aeropuerto
    updateAirport(id: number, airport: LocationAirport): Observable<LocationAirport> {
        return this.http.put<LocationAirport>(`${this.apiUrl}/locationairport/${id}`, airport)
            .pipe(
                catchError(error => {
                    return of({} as LocationAirport);
                })
            );
    }

    // Eliminar aeropuerto
    deleteAirport(id: number): Observable<{ success: boolean; error?: any }> {
        return this.http.delete<{ success: boolean; error?: any }>(`${this.apiUrl}/locationairport/${id}`)
            .pipe(
                catchError(error => {
                    return of({ success: false, error });
                })
            );
    }

    // Búsqueda fuzzy de aeropuertos
    searchAirports(query: string, limit: number = 20, signal?: AbortSignal): Observable<FuzzyLocationAirportResponse[]> {
        let params = new HttpParams().set('q', query).set('limit', limit.toString());
        const options: {
            params?: HttpParams | { [param: string]: any };
            signal?: AbortSignal;
        } = { params };
        if (signal) {
            options.signal = signal;
        }
        return this.http.get<FuzzyLocationAirportResponse[]>(`${this.apiUrl}/locationairport/search`, options)
            .pipe(
                catchError(error => {
                    return of([]);
                })
            );
    }

    // Método para obtener múltiples aeropuertos por IDs
    getAirportsByIds(ids: number[], signal?: AbortSignal): Observable<LocationAirport[]> {
        if (!ids || ids.length === 0) {
            return of([]);
        }

        let params = new HttpParams();
        ids.forEach(id => {
            params = params.append('Id', id.toString());
        });

        const options: {
            params?: HttpParams | { [param: string]: any };
            signal?: AbortSignal;
        } = { params };
        if (signal) {
            options.signal = signal;
        }

        return this.http.get<LocationAirport[]>(`${this.apiUrl}/locationairport`, options)
            .pipe(
                catchError(error => {
                    return of([]);
                })
            );
    }
} 