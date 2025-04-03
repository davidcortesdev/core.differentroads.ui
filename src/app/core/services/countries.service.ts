import { HttpClient } from "@angular/common/http";
import { Country } from "../../shared/models/country.model";
import { catchError, map, Observable, of } from "rxjs";
 
export class CountriesService {
  private countriesUrl = 'assets/data/countries.json';
  private countries: Country[] = [];
 
  constructor(private http: HttpClient) {}

    getCountries(): Observable<Country[]> {
        if (this.countries.length > 0) {
            return of(this.countries);
        }
        return this.http.get<Country[]>(this.countriesUrl).pipe(
            map(countries => {
                this.countries = countries;
                return countries;
            }),
            catchError(error => {
                console.error('Error loading airports data', error);
                return of([]);
            })
        );
    }

    searchCountries(searchTerm: string): Observable<Country[]> {
        return this.getCountries().pipe(
            map(countries => {
                if (!searchTerm) {
                    return countries;
                }
                const lowerSearchTerm = searchTerm.toLowerCase();
                return countries.filter(country =>
                    country.name.toLowerCase().includes(lowerSearchTerm) ||
                    country.nationality.toLowerCase().includes(lowerSearchTerm)
                );
            })
        );
    }
}