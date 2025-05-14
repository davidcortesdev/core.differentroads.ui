import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// Interfaces para las respuestas de la API
export interface ILocationCountryResponse {
  id: number;
  name: string;
  code: string;
  continent: string;
  isActive: boolean;
}

export interface ILocationCityResponse {
  id: number;
  name: string;
  code: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  countryId: number;
  stateId?: number;
  countyId?: number;
  municipalityId?: number;
  country: ILocationCountryResponse;
  isActive: boolean;
}

export interface ILocationAreaResponse {
  id: number;
  name: string;
  code: string;
  parentAreaId?: number;
  parentArea?: ILocationAreaResponse;
  isActive: boolean;
}

export interface ILocationAreaCountryResponse {
  id: number;
  areaId: number;
  area: ILocationAreaResponse;
  countryId: number;
  country: ILocationCountryResponse;
}

export interface ILocationAreaCityResponse {
  id: number;
  areaId: number;
  area: ILocationAreaResponse;
  cityId: number;
  city: ILocationCityResponse;
}

// Interfaces para la creación y actualización
export interface LocationCountryCreate {
  name: string;
  code: string;
  continent: string;
  isActive?: boolean;
}

export interface LocationCountryUpdate {
  name?: string;
  code?: string;
  continent?: string;
  isActive?: boolean;
}

export interface LocationCityCreate {
  name: string;
  code: string;
  countryId: number;
  isActive?: boolean;
}

export interface LocationCityUpdate {
  name?: string;
  code?: string;
  countryId?: number;
  isActive?: boolean;
}

export interface LocationAreaCreate {
  name: string;
  code: string;
  parentAreaId?: number;
  isActive?: boolean;
}

export interface LocationAreaUpdate {
  name?: string;
  code?: string;
  parentAreaId?: number;
  isActive?: boolean;
}

export interface LocationAreaCountryCreate {
  areaId: number;
  countryId: number;
}

export interface LocationAreaCountryUpdate {
  areaId?: number;
  countryId?: number;
}

export interface LocationAreaCityCreate {
  areaId: number;
  cityId: number;
}

export interface LocationAreaCityUpdate {
  areaId?: number;
  cityId?: number;
}

// Interfaces para los parámetros de filtrado
export interface ICountryFilters {
  id?: number;
  name?: string;
  code?: string;
  continent?: string;
}

export interface ICityFilters {
  id?: number;
  name?: string;
  code?: string;
  countryId?: number;
}

export interface IAreaFilters {
  id?: number;
  name?: string;
  code?: string;
  parentAreaId?: number;
}

export interface IAreaCountryFilters {
  id?: number;
  areaId?: number;
  countryId?: number;
}

export interface IAreaCityFilters {
  id?: number;
  areaId?: number;
  cityId?: number;
}

@Injectable({
  providedIn: 'root'
})
export class LocationsService {
  private readonly API_URL = `${environment.locationsApiUrl}`;

  constructor(private http: HttpClient) {}

  // Métodos para Countries
  getCountries(filters?: ICountryFilters): Observable<ILocationCountryResponse[]> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.id) params = params.set('Id', filters.id.toString());
      if (filters.name) params = params.set('Name', filters.name);
      if (filters.code) params = params.set('Code', filters.code);
      if (filters.continent) params = params.set('Continent', filters.continent);
    }
    
    return this.http.get<ILocationCountryResponse[]>(`${this.API_URL}/LocationCountry`, { params });
  }

  getCountryById(id: number): Observable<ILocationCountryResponse> {
    return this.http.get<ILocationCountryResponse>(`${this.API_URL}/LocationCountry/${id}`);
  }

  createCountry(country: LocationCountryCreate): Observable<ILocationCountryResponse> {
    return this.http.post<ILocationCountryResponse>(`${this.API_URL}/LocationCountry`, country);
  }

  updateCountry(id: number, country: LocationCountryUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/LocationCountry/${id}`, country);
  }

  deleteCountry(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/LocationCountry/${id}`);
  }

  // Métodos para Cities
  getCities(filters?: ICityFilters, useExactMatchForStrings: boolean = false): Observable<ILocationCityResponse[]> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.id) params = params.set('Id', filters.id.toString());
      if (filters.name) params = params.set('Name', filters.name);
      if (filters.code) params = params.set('Code', filters.code);
      if (filters.countryId) params = params.set('CountryId', filters.countryId.toString());
    }
    
    params = params.set('UseExactMatchForStrings', useExactMatchForStrings.toString());
    
    return this.http.get<ILocationCityResponse[]>(`${this.API_URL}/LocationCity`, { params });
  }

  getCityById(id: number): Observable<ILocationCityResponse> {
    return this.http.get<ILocationCityResponse>(`${this.API_URL}/LocationCity/${id}`);
  }

  createCity(city: LocationCityCreate): Observable<ILocationCityResponse> {
    return this.http.post<ILocationCityResponse>(`${this.API_URL}/LocationCity`, city);
  }

  updateCity(id: number, city: LocationCityUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/LocationCity/${id}`, city);
  }

  deleteCity(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/LocationCity/${id}`);
  }

  // Métodos para Areas
  getAreas(filters?: IAreaFilters): Observable<ILocationAreaResponse[]> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.id) params = params.set('Id', filters.id.toString());
      if (filters.name) params = params.set('Name', filters.name);
      if (filters.code) params = params.set('Code', filters.code);
      if (filters.parentAreaId) params = params.set('ParentAreaId', filters.parentAreaId.toString());
    }
    
    return this.http.get<ILocationAreaResponse[]>(`${this.API_URL}/LocationArea`, { params });
  }

  getAreaById(id: number): Observable<ILocationAreaResponse> {
    return this.http.get<ILocationAreaResponse>(`${this.API_URL}/LocationArea/${id}`);
  }

  createArea(area: LocationAreaCreate): Observable<ILocationAreaResponse> {
    return this.http.post<ILocationAreaResponse>(`${this.API_URL}/LocationArea`, area);
  }

  updateArea(id: number, area: LocationAreaUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/LocationArea/${id}`, area);
  }

  deleteArea(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/LocationArea/${id}`);
  }

  // Métodos para relaciones Area-Country
  getAreaCountries(filters?: IAreaCountryFilters): Observable<ILocationAreaCountryResponse[]> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.id) params = params.set('Id', filters.id.toString());
      if (filters.areaId) params = params.set('AreaId', filters.areaId.toString());
      if (filters.countryId) params = params.set('CountryId', filters.countryId.toString());
    }
    
    return this.http.get<ILocationAreaCountryResponse[]>(`${this.API_URL}/LocationAreaCountry`, { params });
  }

  getAreaCountryById(id: number): Observable<ILocationAreaCountryResponse> {
    return this.http.get<ILocationAreaCountryResponse>(`${this.API_URL}/LocationAreaCountry/${id}`);
  }

  createAreaCountry(areaCountry: LocationAreaCountryCreate): Observable<ILocationAreaCountryResponse> {
    return this.http.post<ILocationAreaCountryResponse>(`${this.API_URL}/LocationAreaCountry`, areaCountry);
  }

  updateAreaCountry(id: number, areaCountry: LocationAreaCountryUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/LocationAreaCountry/${id}`, areaCountry);
  }

  deleteAreaCountry(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/LocationAreaCountry/${id}`);
  }

  // Métodos para relaciones Area-City
  getAreaCities(filters?: IAreaCityFilters): Observable<ILocationAreaCityResponse[]> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.id) params = params.set('Id', filters.id.toString());
      if (filters.areaId) params = params.set('AreaId', filters.areaId.toString());
      if (filters.cityId) params = params.set('CityId', filters.cityId.toString());
    }
    
    return this.http.get<ILocationAreaCityResponse[]>(`${this.API_URL}/LocationAreaCity`, { params });
  }

  getAreaCityById(id: number): Observable<ILocationAreaCityResponse> {
    return this.http.get<ILocationAreaCityResponse>(`${this.API_URL}/LocationAreaCity/${id}`);
  }

  createAreaCity(areaCity: LocationAreaCityCreate): Observable<ILocationAreaCityResponse> {
    return this.http.post<ILocationAreaCityResponse>(`${this.API_URL}/LocationAreaCity`, areaCity);
  }

  updateAreaCity(id: number, areaCity: LocationAreaCityUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/LocationAreaCity/${id}`, areaCity);
  }

  deleteAreaCity(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/LocationAreaCity/${id}`);
  }

  // Métodos de utilidad
  getCountriesByAreaId(areaId: number): Observable<ILocationCountryResponse[]> {
    return this.getAreaCountries({ areaId }).pipe(
      map((areaCountries) => areaCountries.map(ac => ac.country))
    );
  }

  getCitiesByAreaId(areaId: number): Observable<ILocationCityResponse[]> {
    return this.getAreaCities({ areaId }).pipe(
      map((areaCities) => areaCities.map(ac => ac.city))
    );
  }

  getCitiesByCountryId(countryId: number): Observable<ILocationCityResponse[]> {
    return this.getCities({ countryId });
  }
}