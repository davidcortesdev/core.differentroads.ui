import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface MandatoryTypeCreate {
  id: number;
  code: string;
  name: string;
  description: string;
  mandatory: boolean;
  mandatoryOwner: boolean;
  tkId: string;
}

export interface MandatoryTypeUpdate {
  id: number;
  code: string;
  name: string;
  description: string;
  mandatory: boolean;
  mandatoryOwner: boolean;
  tkId: string;
}

export interface IMandatoryTypeResponse {
  id: number;
  code: string;
  name: string;
  description: string;
  mandatory: boolean;
  mandatoryOwner: boolean;
  tkId: string;
}

export interface MandatoryTypeFilters {
  id?: number;
  code?: string;
  name?: string;
  description?: string;
  mandatory?: boolean;
  mandatoryOwner?: boolean;
  tkId?: string;
}

@Injectable({
  providedIn: 'root',
})
export class MandatoryTypeService {
  private readonly API_URL = `${environment.masterdataApiUrl}/MandatoryType`;

  constructor(private http: HttpClient) {}

  getAll(filters?: MandatoryTypeFilters): Observable<IMandatoryTypeResponse[]> {
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

    return this.http.get<IMandatoryTypeResponse[]>(this.API_URL, { params });
  }

  create(data: MandatoryTypeCreate): Observable<IMandatoryTypeResponse> {
    return this.http.post<IMandatoryTypeResponse>(`${this.API_URL}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  getById(id: number): Observable<IMandatoryTypeResponse> {
    return this.http.get<IMandatoryTypeResponse>(`${this.API_URL}/${id}`);
  }

  update(id: number, data: MandatoryTypeUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }

  getByCode(code: string): Observable<IMandatoryTypeResponse[]> {
    const params = new HttpParams()
      .set('Code', code)
      .set('useExactMatchForStrings', 'false');

    return this.http.get<IMandatoryTypeResponse[]>(this.API_URL, { params });
  }

  getAllOrdered(): Observable<IMandatoryTypeResponse[]> {
    return this.getAll().pipe(
      map((types) => types.sort((a, b) => a.id - b.id))
    );
  }
}
