import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map } from 'rxjs';

export interface Coordinates {
  lat: string;
  lon: string;
}

@Injectable({
  providedIn: 'root',
})
export class GeoService {
  private readonly NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

  constructor(private http: HttpClient) {}

  getCoordinates(city: string): Observable<Coordinates | null> {
    const url = `${this.NOMINATIM_URL}?city=${city}&format=json&limit=1`;

    return this.http.get<any[]>(url).pipe(
      map((data) => {
        if (data.length > 0) {
          const location = data[0];
          return { lat: location.lat, lon: location.lon };
        }
        return null;
      }),
      catchError(() => {
        return new Observable<null>((subscriber) => subscriber.next(null));
      })
    );
  }
}