import { Component, Input, OnInit } from '@angular/core';
import { forkJoin, of, Observable } from 'rxjs';
import { catchError, map, finalize } from 'rxjs/operators';

// Importar servicios para el mapa
import { TourLocationService, ITourLocationResponse } from '../../../../core/services/tour/tour-location.service';
import { TourLocationTypeService, ITourLocationTypeResponse } from '../../../../core/services/tour/tour-location-type.service';
import { LocationNetService, Location } from '../../../../core/services/locations/locationNet.service';

interface ProcessedItineraryLocation {
  id: number;
  name: string;
  type: string;
  typeId: number;
  displayOrder: number;
  isMapLocation: boolean;
  isHeaderLocation: boolean;
  isItineraryLocation: boolean;
  latitude?: number;
  longitude?: number;
  locationData?: Location;
  tourLocationData?: ITourLocationResponse;
}

// Interface para las ubicaciones del mapa (compatible con tour-map-v2)
interface MapLocation {
  latitude: number;
  longitude: number;
  title: string;
  displayOrder: number;
}

@Component({
  selector: 'app-tour-itinerary-v2',
  standalone: false,
  templateUrl: './tour-itinerary-v2.component.html',
  styleUrl: './tour-itinerary-v2.component.scss'
})
export class TourItineraryV2Component implements OnInit {
  @Input() tourId: number | undefined;

  // Estados del componente
  loading = true;
  showDebug = false;
  
  // Propiedades para manejar las ubicaciones del mapa
  tourLocations: ITourLocationResponse[] = [];
  processedLocations: ProcessedItineraryLocation[] = [];
  mapLocations: ProcessedItineraryLocation[] = [];
  
  // Propiedades para el mapa v2
  mapLocationsList: MapLocation[] = [];
  
  // Maps para optimización de búsquedas O(1)
  private locationTypesMap = new Map<number, ITourLocationTypeResponse>();
  private locationsMap = new Map<number, Location>();

  constructor(
    private tourLocationService: TourLocationService,
    private tourLocationTypeService: TourLocationTypeService,
    private locationNetService: LocationNetService
  ) {}

  ngOnInit(): void {    
    if (this.tourId) {
      this.loadMapData(this.tourId);
    } else {
      console.warn('⚠️ No se proporcionó tourId para el itinerario');
      this.loading = false;
    }
  }

  /**
   * 🗺️ MÉTODO: Cargar datos del mapa
   */
  private loadMapData(tourId: number): void {
    this.loading = true;    
    forkJoin([
      // Cargar ubicaciones del tour (para el mapa)
      this.tourLocationService.getAll().pipe(
        map(allLocations => allLocations.filter(location => location.tourId === tourId)),
        catchError(error => {
          console.error('❌ Error loading tour locations:', error);
          return of([]);
        })
      ) as Observable<ITourLocationResponse[]>,
      
      // Cargar tipos de ubicaciones
      this.tourLocationTypeService.getAll().pipe(
        catchError(error => {
          console.error('❌ Error loading tour location types:', error);
          return of([]);
        })
      ) as Observable<ITourLocationTypeResponse[]>,
      
      // Cargar todas las ubicaciones
      this.locationNetService.getLocations().pipe(
        catchError(error => {
          console.error('❌ Error loading locations:', error);
          return of([]);
        })
      ) as Observable<Location[]>
      
    ]).pipe(
      finalize(() => {
        this.loading = false;
      })
    ).subscribe(([tourLocations, locationTypes, allLocations]) => {

      // Procesar datos del mapa
      this.createLocationMaps(locationTypes, allLocations);
      this.processItineraryLocationsWithMaps(tourLocations);
      this.filterMapLocations();
      this.prepareMapLocationsForV2();
    });
  }

  /**
   * 🔑 MÉTODO: Crear Maps para búsquedas optimizadas O(1)
   */
  private createLocationMaps(
    locationTypes: ITourLocationTypeResponse[], 
    allLocations: Location[]
  ): void {
    
    // Limpiar maps existentes
    this.locationTypesMap.clear();
    this.locationsMap.clear();
    
    // Crear map de tipos de ubicación
    locationTypes.forEach(type => {
      this.locationTypesMap.set(type.id, type);
    });
    
    // Crear map de ubicaciones
    allLocations.forEach(location => {
      this.locationsMap.set(location.id, location);
    });
    
  }

  /**
   * 🔑 MÉTODO: Procesar ubicaciones usando Maps para O(1) lookup
   */
  private processItineraryLocationsWithMaps(tourLocations: ITourLocationResponse[]): void {
    
    this.processedLocations = [];
        
    tourLocations.forEach((tourLocation) => {
      // Búsqueda O(1) usando Maps
      const locationType = this.locationTypesMap.get(tourLocation.tourLocationTypeId);
      const realLocation = this.locationsMap.get(tourLocation.locationId);
      
      if (realLocation && locationType) {
        const processedLocation: ProcessedItineraryLocation = {
          id: tourLocation.id,
          name: realLocation.name,
          type: locationType.name || 'Desconocido',
          typeId: tourLocation.tourLocationTypeId,
          displayOrder: tourLocation.displayOrder,
          isMapLocation: tourLocation.tourLocationTypeId === 1, // Tipo 1 = ubicaciones de mapa
          isHeaderLocation: tourLocation.tourLocationTypeId === 2, // Tipo 2 = ubicaciones de header
          isItineraryLocation: true,
          latitude: realLocation.latitude,
          longitude: realLocation.longitude,
          locationData: realLocation,
          tourLocationData: tourLocation
        };
        
        this.processedLocations.push(processedLocation);
      }
    });
    
    // Ordenar por displayOrder
    this.processedLocations.sort((a, b) => a.displayOrder - b.displayOrder);
  }

  /**
   * 🗺️ MÉTODO: Filtrar solo ubicaciones de tipo mapa
   */
  private filterMapLocations(): void {
    this.mapLocations = this.processedLocations.filter(location => location.isMapLocation);
    this.mapLocations.sort((a, b) => a.displayOrder - b.displayOrder);
  }

  /**
   * 🗺️ MÉTODO: Preparar ubicaciones para el componente tour-map-v2
   */
  private prepareMapLocationsForV2(): void {
    this.mapLocationsList = this.mapLocations
      .filter(location => 
        location.latitude !== null && 
        location.latitude !== undefined && 
        location.longitude !== null && 
        location.longitude !== undefined &&
        location.latitude !== 0 &&
        location.longitude !== 0
      )
      .map(location => ({
        latitude: location.latitude!,
        longitude: location.longitude!,
        title: location.name,
        displayOrder: location.displayOrder
      }));
  }

  /**
   * 🗺️ GETTER: Verificar si hay ubicaciones válidas para el mapa
   */
  get hasValidMapData(): boolean {
    return this.mapLocationsList.length > 0;
  }

  /**
   * 🔄 MÉTODO: Refrescar datos del mapa
   */
  refreshMapData(): void {
    if (this.tourId) {
      this.loadMapData(this.tourId);
    }
  }
}