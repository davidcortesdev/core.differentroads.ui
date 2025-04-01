import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Airport } from '../models/airport.model';

@Injectable({
  providedIn: 'root'
})
export class AirportService {
  private airportsUrl = 'assets/data/airports.json';
  private airports: Airport[] = [];

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los aeropuertos del archivo JSON
   */
  getAirports(): Observable<Airport[]> {
    // Si ya tenemos los aeropuertos cargados, los devolvemos directamente
    if (this.airports.length > 0) {
      return of(this.airports);
    }

    // Si no, los cargamos del JSON
    return this.http.get<Airport[]>(this.airportsUrl).pipe(
      map(airports => {
        this.airports = airports;
        return airports;
      }),
      catchError(error => {
        console.error('Error loading airports data', error);
        return of([]);
      })
    );
  }

  /**
   * Filtra aeropuertos por texto (ciudad, nombre o código IATA) en inglés o español
   * @param searchText Texto para filtrar
   */
  searchAirports(searchText: string): Observable<Airport[]> {
    if (!searchText || searchText.trim() === '') {
      return this.getAirports();
    }

    return this.getAirports().pipe(
      map(airports => {
        const normalizedSearch = searchText.toLowerCase().trim();
        return airports.filter(airport => 
          // Búsqueda en inglés (original)
          airport.city.toLowerCase().includes(normalizedSearch) ||
          airport.name.toLowerCase().includes(normalizedSearch) ||
          airport.iata.toLowerCase().includes(normalizedSearch) ||
          airport.country.toLowerCase().includes(normalizedSearch) ||
          
          // Búsqueda en español (traducciones)
          (airport.translations?.es?.city?.toLowerCase().includes(normalizedSearch) || false) ||
          (airport.translations?.es?.name?.toLowerCase().includes(normalizedSearch) || false) ||
          (airport.translations?.es?.country?.toLowerCase().includes(normalizedSearch) || false)
        );
      })
    );
  }

  /**
   * Obtiene un aeropuerto por su código IATA
   * @param iata Código IATA del aeropuerto
   */
  getAirportByIata(iata: string): Observable<Airport | undefined> {
    return this.getAirports().pipe(
      map(airports => airports.find(airport => airport.iata === iata))
    );
  }

  /**
   * Obtiene aeropuertos por país
   * @param country Nombre del país
   */
  getAirportsByCountry(country: string): Observable<Airport[]> {
    return this.getAirports().pipe(
      map(airports => airports.filter(
        airport => airport.country.toLowerCase() === country.toLowerCase()
      ))
    );
  }

  /**
   * Obtiene aeropuertos con nombres traducidos según el idioma
   * @param language Código de idioma ('en' o 'es')
   */
  getLocalizedAirports(language: 'en' | 'es' = 'en'): Observable<Airport[]> {
    return this.getAirports().pipe(
      map(airports => {
        if (language === 'en') {
          return airports;
        }
        
        // Para español, creamos copias con las traducciones aplicadas
        return airports.map(airport => {
          const localizedAirport = { ...airport };
          
          if (airport.translations?.es) {
            if (airport.translations.es.city) {
              localizedAirport.city = airport.translations.es.city;
            }
            if (airport.translations.es.name) {
              localizedAirport.name = airport.translations.es.name;
            }
            if (airport.translations.es.country) {
              localizedAirport.country = airport.translations.es.country;
            }
          }
          
          return localizedAirport;
        });
      })
    );
  }

  /**
   * Busca aeropuertos y devuelve resultados localizados
   * @param searchText Texto de búsqueda
   * @param language Idioma para mostrar resultados ('en' o 'es')
   */
  searchLocalizedAirports(searchText: string, language: 'en' | 'es' = 'en'): Observable<Airport[]> {
    return this.searchAirports(searchText).pipe(
      map(airports => {
        if (language === 'en') {
          return airports;
        }
        
        // Para español, aplicamos traducciones a los resultados
        return airports.map(airport => {
          const localizedAirport = { ...airport };
          
          if (airport.translations?.es) {
            if (airport.translations.es.city) {
              localizedAirport.city = airport.translations.es.city;
            }
            if (airport.translations.es.name) {
              localizedAirport.name = airport.translations.es.name;
            }
            if (airport.translations.es.country) {
              localizedAirport.country = airport.translations.es.country;
            }
          }
          
          return localizedAirport;
        });
      })
    );
  }
}