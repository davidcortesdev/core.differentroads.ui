import { Component, Input, OnInit } from '@angular/core';
import { forkJoin, of, Observable } from 'rxjs';
import { catchError, map, finalize } from 'rxjs/operators';

// Importar servicios necesarios
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
  showDebug = false; // Cambiado a false por defecto para producción
  
  // Propiedades para manejar las ubicaciones del itinerario
  tourLocations: ITourLocationResponse[] = [];
  processedLocations: ProcessedItineraryLocation[] = [];
  mapLocations: ProcessedItineraryLocation[] = [];
  
  // Propiedades para el mapa v2 (IMPORTANTE: Este es el array que usa el componente mapa)
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
    console.log('🚀 TourItineraryV2 inicializado con tourId:', this.tourId);
    
    if (this.tourId) {
      this.loadItineraryData(this.tourId);
    } else {
      console.warn('⚠️ No se proporcionó tourId para el itinerario');
      this.loading = false;
    }
  }

  /**
   * 🚀 MÉTODO PRINCIPAL: Cargar datos del itinerario usando Maps para optimización
   */
  private loadItineraryData(tourId: number): void {
    this.loading = true;
    console.log('📥 Cargando datos del itinerario para tour:', tourId);
    
    forkJoin([
      this.tourLocationService.getAll().pipe(
        map(allLocations => allLocations.filter(location => location.tourId === tourId)),
        catchError(error => {
          console.error('❌ Error loading tour locations:', error);
          return of([]);
        })
      ) as Observable<ITourLocationResponse[]>,
      
      this.tourLocationTypeService.getAll().pipe(
        catchError(error => {
          console.error('❌ Error loading tour location types:', error);
          return of([]);
        })
      ) as Observable<ITourLocationTypeResponse[]>,
      
      this.locationNetService.getLocations().pipe(
        catchError(error => {
          console.error('❌ Error loading locations:', error);
          return of([]);
        })
      ) as Observable<Location[]>
    ]).pipe(
      finalize(() => {
        this.loading = false;
        console.log('✅ Carga de datos completada');
      })
    ).subscribe(([tourLocations, locationTypes, allLocations]) => {
      
      console.log('📊 Datos recibidos:', {
        tourLocations: tourLocations.length,
        locationTypes: locationTypes.length,
        allLocations: allLocations.length
      });

      // Procesar datos en orden
      this.createLocationMaps(locationTypes, allLocations);
      this.processItineraryLocationsWithMaps(tourLocations);
      this.filterMapLocations();
      this.prepareMapLocationsForV2();
      
      console.log('✅ Procesamiento completado:', {
        totalLocations: this.processedLocations.length,
        mapLocations: this.mapLocations.length,
        mapLocationsList: this.mapLocationsList.length,
        locationTypesMap: this.locationTypesMap.size,
        locationsMap: this.locationsMap.size
      });
    });
  }

  /**
   * 🔑 MÉTODO KEY MAP 1: Crear Maps para búsquedas optimizadas O(1)
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
    
    console.log('🔑 Maps creados:', {
      locationTypesCount: this.locationTypesMap.size,
      locationsCount: this.locationsMap.size
    });
  }

  /**
   * 🔑 MÉTODO KEY MAP 2: Procesar ubicaciones usando Maps para O(1) lookup
   */
  private processItineraryLocationsWithMaps(tourLocations: ITourLocationResponse[]): void {
    
    this.processedLocations = [];
    
    console.log('🔄 Procesando', tourLocations.length, 'ubicaciones del tour');
    
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
        
        console.log('✅ Ubicación procesada:', {
          name: processedLocation.name,
          type: processedLocation.type,
          isMapLocation: processedLocation.isMapLocation,
          hasCoordinates: !!(processedLocation.latitude && processedLocation.longitude)
        });
      } else {
        console.warn('⚠️ No se encontraron datos para:', {
          tourLocationId: tourLocation.id,
          locationId: tourLocation.locationId,
          typeId: tourLocation.tourLocationTypeId,
          hasLocationType: !!locationType,
          hasRealLocation: !!realLocation
        });
      }
    });
    
    // Ordenar por displayOrder
    this.processedLocations.sort((a, b) => a.displayOrder - b.displayOrder);
    
    console.log('🔑 Ubicaciones procesadas con Maps:', {
      processed: this.processedLocations.length,
      sorted: true
    });
  }

  /**
   * 🗺️ MÉTODO: Filtrar solo ubicaciones de tipo mapa
   */
  private filterMapLocations(): void {
    this.mapLocations = this.processedLocations.filter(location => location.isMapLocation);
    this.mapLocations.sort((a, b) => a.displayOrder - b.displayOrder);
    
    console.log('🗺️ Ubicaciones de mapa filtradas:', {
      total: this.mapLocations.length,
      locations: this.mapLocations.map(loc => loc.name)
    });
  }

  /**
   * 🗺️ MÉTODO CLAVE: Preparar ubicaciones para el componente tour-map-v2
   * Este método transforma las ubicaciones al formato que espera el componente de mapa
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
    
    console.log('🗺️ Ubicaciones preparadas para tour-map-v2:', {
      total: this.mapLocationsList.length,
      locations: this.mapLocationsList
    });
  }

  /**
   * 🗺️ GETTER: Obtener solo ubicaciones de mapa con coordenadas válidas
   */
  get mapLocationsWithCoordinates(): ProcessedItineraryLocation[] {
    return this.mapLocations.filter(location => 
      location.latitude !== null && 
      location.latitude !== undefined && 
      location.longitude !== null && 
      location.longitude !== undefined &&
      location.latitude !== 0 &&
      location.longitude !== 0
    );
  }

  /**
   * 🔍 MÉTODO DEBUG: Verificar estado del mapa
   */
  debugMapState(): void {
    console.log('🔍 ESTADO DEL MAPA V2:', {
      mapLocations: this.mapLocations,
      mapLocationsWithCoordinates: this.mapLocationsWithCoordinates,
      mapLocationsList: this.mapLocationsList,
      hasValidLocations: this.mapLocationsWithCoordinates.length > 0,
      loading: this.loading
    });
    
    // Verificar si el componente de mapa existe en el DOM
    const mapElement = document.querySelector('app-tour-map-v2');
    console.log('🔍 Elemento app-tour-map-v2 encontrado:', !!mapElement);
    
    // Verificar si Google Maps está disponible
    console.log('🔍 Google Maps disponible:', typeof (window as any)['google'] !== 'undefined');
    
    // Verificar props del mapa
    console.log('🔍 Props del mapa:', {
      mapLocationsList: this.mapLocationsList,
      zoom: 6,
      title: 'Mapa del Tour'
    });
  }

  /**
   * 🔑 MÉTODO DEBUG: Mostrar el estado completo de los Maps y procesamiento
   */
  debugMapsState(): void {
    console.log('🔍 ESTADO COMPLETO DE MAPS Y PROCESAMIENTO:', {
      // Estado de los Maps
      locationTypesMap: {
        size: this.locationTypesMap.size,
        entries: Array.from(this.locationTypesMap.entries())
      },
      locationsMap: {
        size: this.locationsMap.size,
        entries: Array.from(this.locationsMap.entries()).slice(0, 5) // Solo primeros 5 para no saturar console
      },
      
      // Estado del procesamiento
      tourLocations: this.tourLocations.length,
      processedLocations: {
        total: this.processedLocations.length,
        data: this.processedLocations
      },
      mapLocations: {
        total: this.mapLocations.length,
        data: this.mapLocations
      },
      mapLocationsWithCoordinates: {
        total: this.mapLocationsWithCoordinates.length,
        data: this.mapLocationsWithCoordinates
      },
      
      // Estado para el componente de mapa
      mapLocationsList: {
        total: this.mapLocationsList.length,
        data: this.mapLocationsList
      },
      
      // Estado general
      loading: this.loading,
      tourId: this.tourId
    });
    
    // Verificar configuración del componente
    console.log('🔍 CONFIGURACIÓN DEL COMPONENTE:', {
      showDebug: this.showDebug,
      hasValidTourId: !!this.tourId,
      componentInitialized: true
    });
  }

  /**
   * 🗺️ MÉTODO: Abrir ubicación en Google Maps
   */
  openInGoogleMaps(latitude: number, longitude: number): void {
    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    window.open(url, '_blank');
    
    console.log('🗺️ Abriendo Google Maps:', {
      latitude,
      longitude,
      url
    });
  }

  /**
   * 🔄 MÉTODO: Refrescar datos del itinerario
   */
  refreshItinerary(): void {
    if (this.tourId) {
      console.log('🔄 Refrescando datos del itinerario');
      this.loadItineraryData(this.tourId);
    }
  }

  /**
   * 🎯 MÉTODO: Centrar mapa en una ubicación específica
   */
  focusOnLocation(location: ProcessedItineraryLocation): void {
    console.log('🎯 Enfocando en ubicación:', location.name);
    // Este método podría expandirse para comunicarse con el componente de mapa
    // y centrar la vista en una ubicación específica
  }

  /**
   * 📊 GETTER: Estadísticas del itinerario
   */
  get itineraryStats() {
    return {
      totalLocations: this.processedLocations.length,
      mapLocations: this.mapLocations.length,
      locationsWithCoordinates: this.mapLocationsWithCoordinates.length,
      headerLocations: this.processedLocations.filter(loc => loc.isHeaderLocation).length,
      locationsWithoutCoordinates: this.mapLocations.length - this.mapLocationsWithCoordinates.length
    };
  }

  /**
   * ✅ GETTER: Verificar si hay datos válidos para mostrar
   */
  get hasValidData(): boolean {
    return !this.loading && this.processedLocations.length > 0;
  }

  /**
   * 🗺️ GETTER: Verificar si hay ubicaciones válidas para el mapa
   */
  get hasValidMapData(): boolean {
    return this.mapLocationsList.length > 0;
  }
}