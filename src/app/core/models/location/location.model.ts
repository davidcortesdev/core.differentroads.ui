export interface Location {
  id: number;
  code: string;
  name: string;
  description?: string;
  tkId?: string;
  latitude: number;
  longitude: number;
  locationTypeId: number;
  iataCode: string;
}

export interface LocationType {
  id: number;
  name: string;
  isActive: boolean;
  tkId?: string;
}

// CORREGIDO: Quité locationTypeId y agregué isActive
export interface LocationRelationship {
  id: number;
  relationshipTypeId: number;
  parentLocationId: number;
  childLocationId: number;
  isActive: boolean; // Esta propiedad faltaba
}

export interface LocationRelationshipType {
  id: number;
  code: string;
  description: string;
  name: string;
  isActive: boolean;
  parentLocationTypeId: number;
  childLocationTypeId: number;
}

export interface LocationAirport {
  id: number;
  name?: string;
  iata?: string;
  icao?: string;
  latitude?: number;
  longitude?: number;
  zonaHorariaId?: number;
  daylightSavingTimeId?: number;
  locationId?: number;
  tkId?: string;
  isDefaultConsolidator?: boolean; // ✅ NUEVO: Flag para aeropuertos por defecto del consolidador
}

export interface FuzzyLocationAirportResponse {
  id: number;
  name?: string;
  iata?: string;
  icao?: string;
  latitude?: number;
  longitude?: number;
  zonaHorariaId?: number;
  daylightSavingTimeId?: number;
  locationId?: number;
  tkId?: string;
  score: number;
}

export interface FuzzyLocationResponse {
  id?: number;
  tkId?: string;
  code?: string;
  name?: string;
  description?: string;
  locationTypeId?: number;
  latitude?: number;
  longitude?: number;
  iataCode?: string;
  score: number;
}