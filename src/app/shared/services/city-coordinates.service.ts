import { Injectable } from '@angular/core';
import { Observable, of, from } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { LocationsApiService, LocationMunicipality } from './locations-api.service';
import { City } from '../components/tour-map/tour-map.component';

@Injectable({
  providedIn: 'root'
})
export class CityCoordinatesService {
  // Cache para almacenar coordenadas ya buscadas
  private coordinatesCache: Map<string, { lat: number, lng: number }> = new Map();

  constructor(private locationsApiService: LocationsApiService) { }

  /**
   * Busca las coordenadas de una ciudad, primero en la API de localizaciones
   * y si no se encuentra, utiliza el método alternativo actual
   */
  getCityCoordinates(cityName: string): Observable<{ lat: number, lng: number } | null> {
    // Verificar si ya tenemos las coordenadas en caché
    if (this.coordinatesCache.has(cityName)) {
      return of(this.coordinatesCache.get(cityName)!);
    }

    // Primero intentamos buscar en la API de ciudades
    return this.locationsApiService.searchCityByName(cityName).pipe(
      switchMap(cities => {
        if (cities && cities.length > 0 && cities[0].lat && cities[0].lng) {
          // Si encontramos la ciudad en la API y tiene coordenadas, las usamos
          const coordinates = { lat: cities[0].lat, lng: cities[0].lng };
          
          // Guardar en caché para futuras consultas
          this.coordinatesCache.set(cityName, coordinates);
          
          return of(coordinates);
        } else {
          // Si no encontramos en ciudades, intentamos con comunidades
          return this.locationsApiService.searchCommunityByName(cityName).pipe(
            map(communities => {
              if (communities && communities.length > 0 && communities[0].lat && communities[0].lng) {
                const coordinates = { lat: communities[0].lat, lng: communities[0].lng };
                this.coordinatesCache.set(cityName, coordinates);
                return coordinates;
              }
              return null;
            })
          );
        }
      }),
      catchError(error => {
        console.error(`Error al obtener coordenadas para ${cityName}:`, error);
        return of(null);
      })
    );
  }

  /**
   * Convierte un array de nombres de ciudades a objetos City con coordenadas
   */
  convertCitiesToCityObjects(cityNames: string[]): Observable<City[]> {
    if (!cityNames || cityNames.length === 0) {
      return of([]);
    }

    // Crear un array de observables para cada ciudad
    const cityObservables = cityNames.map(cityName => 
      this.getCityCoordinates(cityName).pipe(
        map(coordinates => {
          if (coordinates) {
            return {
              nombre: cityName,
              lat: coordinates.lat,
              lng: coordinates.lng
            } as City;
          }
          return null;
        })
      )
    );

    // Combinar todos los observables y filtrar los nulos
    return from(Promise.all(cityObservables.map(obs => 
      obs.toPromise()
    ))).pipe(
      map(cities => cities.filter(city => city !== null) as City[])
    );
  }
}