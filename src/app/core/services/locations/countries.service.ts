import { Injectable } from '@angular/core'; // <-- New import
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';
import { Country } from '../../../shared/models/country.model';

@Injectable({ providedIn: 'root' })
export class CountriesService {
  private countriesUrl = 'assets/data/countries.json';
  private countries: Country[] = [];

  constructor(private http: HttpClient) {}

  getCountries(): Observable<Country[]> {
    if (this.countries.length > 0) {
      return of(this.countries);
    }
    return this.http.get<Country[]>(this.countriesUrl).pipe(
      map((countries) => {
        this.countries = countries;
        return countries;
      }),
      catchError((error) => {
        return of([]);
      })
    );
  }

  searchCountries(searchTerm: string): Observable<Country[]> {
    return this.getCountries().pipe(
      map((countries) => {
        if (!searchTerm) {
          return countries;
        }
        const lowerSearchTerm = searchTerm.toLowerCase();
        return countries.filter(
          (country) =>
            country.name.toLowerCase().includes(lowerSearchTerm) ||
            country.code.toLowerCase().includes(lowerSearchTerm)
        );
      })
    );
  }

  /**
   * Obtiene un país por su código
   * @param code Código del país (ISO)
   * @returns Observable con el país encontrado o null si no existe
   */
  getCountryByCode(code: string): Observable<Country | null> {
    if (!code) return of(null);

    // Primero intentamos buscar en la caché de países
    return this.getCountries().pipe(
      map((countries) => {
        const country = countries.find((c) => c.code === code);
        return country || null;
      })
    );
  }
}
