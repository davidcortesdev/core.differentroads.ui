import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { forkJoin, of, Observable } from 'rxjs';
import { catchError, map, finalize, switchMap } from 'rxjs/operators';
import { ActivityHighlight } from '../../../../shared/components/activity-card/activity-card.component';

// Importar servicios para el mapa
import { TourLocationService, ITourLocationResponse } from '../../../../core/services/tour/tour-location.service';
import { TourLocationTypeService, ITourLocationTypeResponse } from '../../../../core/services/tour/tour-location-type.service';
import { LocationNetService, Location } from '../../../../core/services/locations/locationNet.service';

// Interface del selector
import { SelectedDepartureEvent } from './components/selector-itinerary/selector-itinerary.component';

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
  @Output() departureSelected = new EventEmitter<SelectedDepartureEvent>();
  
  // NUEVO: Output para emitir actividades seleccionadas
  @Output() activitySelected = new EventEmitter<ActivityHighlight>();

  // Estados del componente
  loading = true;
  showDebug = false;
  
  // Propiedades para manejar las ubicaciones del mapa
  tourLocations: ITourLocationResponse[] = [];
  processedLocations: ProcessedItineraryLocation[] = [];
  mapLocations: ProcessedItineraryLocation[] = [];
  
  // Propiedades para el mapa v2
  mapLocationsList: MapLocation[] = [];
  
  // Propiedades para el selector
  selectedDeparture: SelectedDepartureEvent | null = null;
  selectedItineraryId: number | undefined;
  selectedDepartureId: number | undefined; // NUEVO: Para pasar al componente hijo
  
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
   * MÉTODO CRÍTICO: Manejar selección de departure - ASEGURAR ASIGNACIÓN CORRECTA
   */
  onDepartureSelected(event: SelectedDepartureEvent): void {    
    // CRÍTICO: Asegurar que selectedItineraryId y selectedDepartureId se asignan correctamente
    this.selectedDeparture = event;
    this.selectedItineraryId = event.itinerary.id;
    this.selectedDepartureId = event.departure.id; // NUEVO: Guardar el ID del departure
    this.departureSelected.emit(event);
  }

  // NUEVO: Manejar selección de actividad y reenviar al padre
  onActivitySelected(activityHighlight: ActivityHighlight): void {
    this.activitySelected.emit(activityHighlight);
  }

  /**
   * 🗺️ MÉTODO: Cargar datos del mapa usando getByTourAndType con optimización
   */
  private loadMapData(tourId: number): void {
    this.loading = true;
    
    // Solo cargar ubicaciones MAP del tour
    this.tourLocationService.getByTourAndType(tourId, "MAP").pipe(
      map(response => {
        // Si es un array, devolverlo como está; si es un objeto, convertir a array
        return Array.isArray(response) ? response : (response ? [response] : []);
      }),
      catchError(error => {
        console.warn(`⚠️ No se encontraron ubicaciones para tipo MAP:`, error);
        return of([]);
      }),
      switchMap((mapLocations: ITourLocationResponse[]) => {        
        // Filtrar objetos vacíos y obtener solo ubicaciones válidas
        const validMapLocations = mapLocations.filter(loc => loc && loc.id && loc.locationId);
      
        // Extraer los IDs únicos de las ubicaciones que necesitamos
        const locationIds = [...new Set(validMapLocations.map(tl => tl.locationId))];
                
        if (locationIds.length === 0) {
          console.warn('⚠️ No se encontraron locationIds para cargar');
          return of({ tourLocations: validMapLocations, locations: [] });
        }

        // OPTIMIZACIÓN: Cargar solo las ubicaciones específicas que necesitamos
        return this.locationNetService.getLocationsByIds(locationIds).pipe(
          map(locations => {
            return { tourLocations: validMapLocations, locations };
          }),
          catchError(error => {
            console.error('❌ Error loading specific locations:', error);
            return of({ tourLocations: validMapLocations, locations: [] });
          })
        );
      }),
      finalize(() => {
        this.loading = false;
      })
    ).subscribe((data) => {
      const { tourLocations, locations } = data;
      
      // Procesar datos del mapa (sin tipos, ya sabemos que son MAP)
      this.createLocationMaps([], locations); // Array vacío para tipos
      this.processMapLocationsDirectly(tourLocations, locations);
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
   * 🔑 MÉTODO: Procesar ubicaciones MAP directamente (sin tipos complejos)
   */
  private processMapLocationsDirectly(tourLocations: ITourLocationResponse[], locations: Location[]): void {
    
    this.processedLocations = [];
    this.locationsMap.clear();
    
    // Crear map de ubicaciones para búsqueda O(1)
    locations.forEach(location => {
      this.locationsMap.set(location.id, location);
    });
        
    tourLocations.forEach((tourLocation) => {
      // Búsqueda O(1) de la ubicación real
      const realLocation = this.locationsMap.get(tourLocation.locationId);
      
      if (realLocation) {
        const processedLocation: ProcessedItineraryLocation = {
          id: tourLocation.id,
          name: realLocation.name,
          type: 'MAP', // Sabemos que es MAP
          typeId: tourLocation.tourLocationTypeId,
          displayOrder: tourLocation.displayOrder,
          isMapLocation: true, // Todas son MAP
          isHeaderLocation: false,
          isItineraryLocation: false,
          latitude: realLocation.latitude,
          longitude: realLocation.longitude,
          locationData: realLocation,
          tourLocationData: tourLocation
        };
        
        this.processedLocations.push(processedLocation);
      } else {
        console.warn(`⚠️ No se encontró ubicación para tourLocation:`, {
          tourLocationId: tourLocation.id,
          locationId: tourLocation.locationId
        });
      }
    });
    
    // Ordenar por displayOrder
    this.processedLocations.sort((a, b) => a.displayOrder - b.displayOrder);
    
    // Para MAP, todas las ubicaciones procesadas son mapLocations
    this.mapLocations = [...this.processedLocations];
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
      .filter(location => {
        const hasValidCoords = location.latitude !== null && 
                              location.latitude !== undefined && 
                              location.longitude !== null && 
                              location.longitude !== undefined &&
                              location.latitude !== 0 &&
                              location.longitude !== 0;
        
        return hasValidCoords;
      })
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
  }}