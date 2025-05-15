import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { takeUntil, catchError } from 'rxjs/operators';
import { Subject, forkJoin, of } from 'rxjs';
import {
  ILocationCityResponse,
  LocationsService,
  ICountryFilters,
  ICityFilters,
} from '../../../core/services/locations.service';
import { ToursService } from '../../../core/services/tours.service'; // Añadir esta importación

interface MapMarker {
  position: google.maps.LatLngLiteral;
  label?: {
    color: string;
    text: string;
  };
  title?: string;
  info?: string;
  options: google.maps.marker.AdvancedMarkerElementOptions; // Updated from MarkerOptions
}

@Component({
  selector: 'app-tour-map',
  standalone: false,
  templateUrl: './tour-map.component.html',
  styleUrls: ['./tour-map.component.scss'],
})
export class TourMapComponent implements OnInit, OnDestroy {
  @Input() cities: string[] = [];
  @Input() country: string | undefined;
  @Input() tourSlug: string | undefined;

  citiesData: ILocationCityResponse[] = [];
  // Map configuration
  mapTypeId: google.maps.MapTypeId | undefined;
  mapId: string | undefined;
  markers: MapMarker[] = [];
  infoContent = '';
  center: google.maps.LatLngLiteral = { lat: 40.73061, lng: -73.935242 };
  zoom = 8;
  sizeMapaWidth = '100%';
  sizeMapaHeight = '100%';
  advancedMarkerOptions: google.maps.marker.AdvancedMarkerElementOptions = {
    gmpDraggable: false,
    title: '',
  };
  advancedMarkerPositions: google.maps.LatLngLiteral[] = [];
  apiLoaded: boolean = false;

  // Polyline configuration
  polylinePath: google.maps.LatLngLiteral[] = [];
  polylineOptions: google.maps.PolylineOptions = {
    strokeColor: '#FF0000', // Default color, will be updated
    strokeOpacity: 0.8,
    geodesic: true,
    clickable: false,
    strokeWeight: 3,
  };

  // Map styling and options
  mapOptions: google.maps.MapOptions = {
    zoomControl: true,
    scrollwheel: false,
    disableDoubleClickZoom: true,
    maxZoom: 15,
    minZoom: 1,
  };

  markerOptions: google.maps.marker.AdvancedMarkerElementOptions = {
    gmpDraggable: false,
    title: '',
  };

  // Añadir la propiedad destroy$ que falta
  private destroy$ = new Subject<void>();
  private scriptElement: HTMLScriptElement | null = null;

  // Propiedades para memoización
  private lastCitiesKey: string = '';
  private lastPathKey: string = '';
  private cachedSmoothPath: google.maps.LatLngLiteral[] = [];
  
  constructor(
    private locationsService: LocationsService,
    private toursService: ToursService,
    private cdr: ChangeDetectorRef
  ) {
    this.loadGoogleMapsScript();
  }

  ngOnInit(): void {
    console.log(
      'tourSlug',
      this.tourSlug,
      'pais',
      this.country,
      'ciudades',
      this.cities,
      'apiLoaded',
      this.apiLoaded
    );

    // Si tenemos un ID de tour, obtener los datos del tour
    if (this.tourSlug) {
      this.loadTourData();
    } else if (this.citiesData.length > 0) {
      this.calculateMapCenter();
    } else if (this.cities.length > 0) {
      // Si tenemos nombres de ciudades pero no datos, buscar las coordenadas
      this.loadCitiesData();
    }
  }

  // Nuevo método para cargar datos del tour
  private loadTourData(): void {
    const filterByStatus = true; // Puedes ajustar esto según tus necesidades

    this.toursService
      .getTourDetailBySlug(
        this.tourSlug!,
        ['cities', 'country'],
        filterByStatus
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tour) => {
          // Aplicar trim a cada ciudad si es un array
          this.cities = (tour['cities'] || []).map((city: string) => city.trim());
          this.country = tour['country'] ? tour['country'].trim() : undefined;

          if (this.cities.length > 0) {
            this.loadCitiesData();
          }
        },
        error: (err) => {
          console.error('Error al obtener datos del tour:', err);
        },
      });
  }

  ngOnDestroy(): void {
    // Clean up the script element if component is destroyed
    if (this.scriptElement && this.scriptElement.parentNode) {
      this.scriptElement.parentNode.removeChild(this.scriptElement);
    }

    // Completar el subject para evitar memory leaks
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadGoogleMapsScript(): void {
    // Check if script is already loaded
    if (
      document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')
    ) {
      this.initializeMap();
      return;
    }

    this.scriptElement = document.createElement('script');
    this.scriptElement.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&libraries=marker`;
    this.scriptElement.async = true;
    this.scriptElement.defer = true;
    // Add loading attribute to follow best practices
    this.scriptElement.setAttribute('loading', 'async');

    this.scriptElement.addEventListener('load', () => {
      this.initializeMap();
    });

    this.scriptElement.addEventListener('error', () => {
      console.error('Failed to load Google Maps API');
    });

    document.head.appendChild(this.scriptElement);
  }

  private initializeMap(): void {
    this.mapTypeId = google.maps.MapTypeId.ROADMAP;
    // Replace DEMO_MAP_ID with your actual Map ID from Google Cloud Console
    this.mapId = '7f7a264cb58d0536'; // Get this from Google Cloud Console
    this.apiLoaded = true;

    // Initialize polyline options with the primary color
    this.polylineOptions = {
      ...this.polylineOptions,
      strokeColor: this.getPrimaryColor(),
      icons: [],
    };
  }

  // Eliminar la función calculateMapCenter duplicada en la línea 469
  // Solo mantener la implementación original que está en la línea 142

  // Corregir el método updatePolylinePath para manejar correctamente los tipos
  private updatePolylinePath(): void {
    // Crear un array de puntos para el polyline asegurando que no hay valores undefined
    const points: google.maps.LatLngLiteral[] = this.citiesData
      .filter(city => city.latitude !== undefined && city.longitude !== undefined)
      .map(city => ({ 
        lat: city.latitude as number, 
        lng: city.longitude as number 
      }));
    
    if (points.length > 1) {
      // Actualizar la polylinePath con los puntos filtrados
      this.polylinePath = this.createSmoothPath(points);
    }
  }

  // Añadir una llamada a updatePolylinePath en calculateMapCenter
  calculateMapCenter(): void {
    if (!this.citiesData?.length) return;
  
    // Usar memoización para evitar recalcular si los datos no han cambiado
    const citiesKey = this.citiesData.map(c => `${c.latitude}-${c.longitude}`).join('|');
    if (this.lastCitiesKey === citiesKey) return;
    this.lastCitiesKey = citiesKey;
  
    const bounds = new google.maps.LatLngBounds();
    let validCoordinates = 0;
    
    this.citiesData.forEach((city) => {
      if (!city.latitude || !city.longitude) {
        console.warn(`No se encontraron coordenadas para la ciudad ${city.name}`);
        return;
      }
      bounds.extend({ lat: city.latitude, lng: city.longitude });
      validCoordinates++;
    });
  
    // Solo actualizar si hay coordenadas válidas
    if (validCoordinates > 0) {
      this.center = {
        lat: bounds.getCenter().lat(),
        lng: bounds.getCenter().lng(),
      };
  
      const PADDING = 10;
      if (this.mapOptions.maxZoom) {
        this.zoom = Math.min(
          this.getZoomLevel(bounds, PADDING),
          this.mapOptions.maxZoom
        );
      }
      
      // Actualizar el polylinePath si hay más de una ciudad
      if (this.citiesData.length > 1) {
        this.updatePolylinePath();
      }
    }
  }
  
  addMarker(ciudad: ILocationCityResponse): void {
    if (!ciudad.latitude || !ciudad.longitude) {
      console.warn(
        `No se encontraron coordenadas para la ciudad ${ciudad.name}`
      );
      return;
    }

    // Crear el marcador solo si no existe ya uno con las mismas coordenadas
    const position = { lat: ciudad.latitude, lng: ciudad.longitude };
    const markerExists = this.markers.some(
      (m) => m.position.lat === position.lat && m.position.lng === position.lng
    );

    if (!markerExists) {
      const markerOptions: google.maps.marker.AdvancedMarkerElementOptions = {
        gmpDraggable: false,
        title: ciudad.name,
      };

      this.markers.push({
        position,
        title: ciudad.name,
        info: ciudad.name,
        options: markerOptions,
      });
    }
  }

  // Create a smooth curved path between points using quadratic Bézier curves
  private createSmoothPath(
    points: google.maps.LatLngLiteral[]
  ): google.maps.LatLngLiteral[] {
    if (points.length <= 2) return points;

    const smoothPath: google.maps.LatLngLiteral[] = [];
    const numPoints = 20; // Number of points for curve smoothness

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];

      // Add the current point
      smoothPath.push(p1);

      // Calculate control points for the curve
      const dx = p2.lng - p1.lng;
      const dy = p2.lat - p1.lat;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Create perpendicular offset for curve control
      const curveFactor = dist * 0.3; // Controls curve intensity
      const perpX = (-dy / dist) * curveFactor;
      const perpY = (dx / dist) * curveFactor;

      // Control point (midpoint with perpendicular offset)
      const ctrlPoint = {
        lat: (p1.lat + p2.lat) / 2 + perpY,
        lng: (p1.lng + p2.lng) / 2 + perpX,
      };

      // Add intermediate points using quadratic Bézier curve
      for (let j = 1; j < numPoints; j++) {
        const t = j / numPoints;

        // Quadratic Bézier curve formula: B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
        const lat =
          Math.pow(1 - t, 2) * p1.lat +
          2 * (1 - t) * t * ctrlPoint.lat +
          Math.pow(t, 2) * p2.lat;

        const lng =
          Math.pow(1 - t, 2) * p1.lng +
          2 * (1 - t) * t * ctrlPoint.lng +
          Math.pow(t, 2) * p2.lng;

        smoothPath.push({ lat, lng });
      }
    }

    // Add the last point
    smoothPath.push(points[points.length - 1]);

    return smoothPath;
  }

  private getZoomLevel(
    bounds: google.maps.LatLngBounds,
    padding: number
  ): number {
    const WORLD_DIM = { height: 256, width: 256 };
    const ZOOM_MAX = 21;

    const latRad = (lat: number): number => {
      const sin = Math.sin((lat * Math.PI) / 180);
      const radX2 = Math.log((1 + sin) / (1 - sin)) / 2;
      return Math.max(Math.min(radX2, Math.PI), -Math.PI) / 2;
    };

    const zoom = (mapPx: number, worldPx: number, fraction: number): number => {
      return Math.floor(Math.log(mapPx / worldPx / fraction) / Math.LN2);
    };

    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const latFraction = (latRad(ne.lat()) - latRad(sw.lat())) / Math.PI;
    const lngDiff = ne.lng() - sw.lng();
    const lngFraction = (lngDiff < 0 ? lngDiff + 360 : lngDiff) / 360;
    const latZoom = zoom(400 - padding * 2, WORLD_DIM.height, latFraction);
    const lngZoom = zoom(800 - padding * 2, WORLD_DIM.width, lngFraction);

    return Math.min(latZoom, lngZoom, ZOOM_MAX);
  }

  // Helper method to get primary color from CSS variables
  private getPrimaryColor(): string {
    try {
      const primaryColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--p-primary-color')
        .trim();
      return primaryColor || '#FF0000'; // Fallback to red if variable not found
    } catch (error) {
      console.warn('Error getting primary color:', error);
      return '#FF0000';
    }
  }

  // Añadir este método para optimizar el renderizado de marcadores
  trackByPosition(index: number, marker: MapMarker): string {
    return `${marker.position.lat}-${marker.position.lng}`;
  }

  /**
   * Carga los datos de las ciudades utilizando el servicio de locations
   */
  private loadCitiesData(): void {
    // Eliminar logs innecesarios
    if (this.country) {
      // Dividir la cadena de países por comas y procesar cada uno
      const countries = this.country.split(',').map(c => c.trim());
      
      // Limpiar los datos de ciudades antes de cargar nuevas
      this.citiesData = [];
      
      // Procesar cada país
      countries.forEach(countryName => {
        const countryFilters: ICountryFilters = {
          name: countryName,
        };

        this.locationsService
          .getCountries(countryFilters)
          .pipe(
            takeUntil(this.destroy$),
            // Añadir operadores para manejo más eficiente
            catchError(err => {
              console.error(`Error al obtener información del país ${countryName}:`, err);
              return of([]);
            })
          )
          .subscribe({
            next: (countries) => {
              if (countries && countries.length > 0) {
                const countryId = countries[0].id;
                this.loadCitiesByCountry(countryId);
              }
            }
          });
      });
    } else if (this.cities && this.cities.length > 0) {
      this.loadCitiesByName();
    }
  }

  // Extraer la lógica de carga de ciudades a métodos separados
  private loadCitiesByCountry(countryId: number): void {
    if (!this.cities || this.cities.length === 0) return;
    
    // Limpiar los datos de ciudades antes de cargar nuevas
    this.citiesData = [];
    
    // Procesar cada ciudad individualmente en lugar de usar forkJoin
    this.cities.forEach(cityName => {
      const cityFilters: ICityFilters = {
        name: cityName.trim(), // Aplicar trim al nombre de la ciudad
        countryId: countryId,
      };
      
      this.locationsService.getCities(cityFilters, true).pipe(
        takeUntil(this.destroy$),
        catchError(err => {
          console.error(`Error al obtener la ciudad ${cityName}:`, err);
          return of([]);
        })
      ).subscribe(cities => {
        if (cities && cities.length > 0) {
          // Añadir la ciudad a los datos
          this.citiesData.push(...cities);
          
          // Añadir marcadores para las nuevas ciudades
          cities.forEach(city => this.addMarker(city));
          
          // Recalcular el centro del mapa con cada nueva ciudad
          this.calculateMapCenter();
          
          // Forzar la detección de cambios para actualizar la vista
          this.cdr.detectChanges();
        }
      });
    });
  }

  private loadCitiesByName(): void {
    // Limpiar los datos de ciudades antes de cargar nuevas
    this.citiesData = [];
    
    // Procesar cada ciudad individualmente
    this.cities.forEach(cityName => {
      const cityFilters: ICityFilters = {
        name: cityName.trim(), // Aplicar trim al nombre de la ciudad
      };
      
      this.locationsService.getCities(cityFilters, true).pipe(
        takeUntil(this.destroy$),
        catchError(err => {
          console.error(`Error al obtener la ciudad ${cityName}:`, err);
          return of([]);
        })
      ).subscribe(cities => {
        if (cities && cities.length > 0) {
          // Añadir la ciudad a los datos
          this.citiesData.push(...cities);
          
          // Añadir marcadores para las nuevas ciudades
          cities.forEach(city => this.addMarker(city));
          
          // Recalcular el centro del mapa con cada nueva ciudad
          this.calculateMapCenter();
          
          // Forzar la detección de cambios para actualizar la vista
          this.cdr.detectChanges();
        }
      });
    });
  }
}
