import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface IPhonePrefixResponse {
  id: number;
  code: string;
  name: string;
  description: string;
  prefix: string;
  isoCode2: string;
  isoCode3: string;
}

export interface PhonePrefixFilters {
  id?: number;
  code?: string;
  name?: string;
  description?: string;
  prefix?: string;
  isoCode2?: string;
  isoCode3?: string;
}

@Injectable({
  providedIn: 'root',
})
export class PhonePrefixService {
  private readonly API_URL = `${environment.masterdataApiUrl}/PhonePrefix`;

  constructor(private http: HttpClient) {}

  getAll(filters?: PhonePrefixFilters): Observable<IPhonePrefixResponse[]> {
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

    return this.http.get<IPhonePrefixResponse[]>(this.API_URL, { params });
  }

  getById(id: number): Observable<IPhonePrefixResponse> {
    return this.http.get<IPhonePrefixResponse>(`${this.API_URL}/${id}`);
  }

  getAllOrdered(): Observable<IPhonePrefixResponse[]> {
    return this.getAll().pipe(
      map((prefixes) => prefixes.sort((a, b) => a.name.localeCompare(b.name)))
    );
  }
}

