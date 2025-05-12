import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
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

  constructor(
    private locationsService: LocationsService,
    private toursService: ToursService // Añadir el servicio de tours
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
          this.cities = tour['cities'] || [];
          this.country = tour['country'];

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

  calculateMapCenter(): void {
    if (!this.citiesData?.length) return;

    const bounds = new google.maps.LatLngBounds();
    this.citiesData.forEach((city) => {
      if (!city.latitude || !city.longitude) {
        console.warn(
          `No se encontraron coordenadas para la ciudad ${city.name}`
        );
        return;
      }
      bounds.extend({ lat: city.latitude, lng: city.longitude });
    });

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
  }

  addMarker(ciudad: ILocationCityResponse): void {
    if (!ciudad.latitude || !ciudad.longitude) {
      console.warn(
        `No se encontraron coordenadas para la ciudad ${ciudad.name}`
      );
      return;
    }
    const position = { lat: ciudad.latitude, lng: ciudad.longitude };

    // Create marker options with title
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

    // Removed adding position to polyline path
    // this.polylinePath.push(position);
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

  /**
   * Carga los datos de las ciudades utilizando el servicio de locations
   */
  private loadCitiesData(): void {
    console.log(
      'pais',
      this.country,
      'ciudades',
      this.cities,
      'apiLoaded',
      this.apiLoaded
    );

    // Obtener información del país si está definido
    if (this.country) {
      const countryFilters: ICountryFilters = {
        name: this.country,
      };

      this.locationsService
        .getCountries(countryFilters)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (countries) => {
            console.log('Países encontrados:', countries);
            if (countries && countries.length > 0) {
              const countryId = countries[0].id;

              // Una vez que tenemos el país, buscamos las ciudades
              if (this.cities && this.cities.length > 0) {
                // Crear un array para almacenar todas las suscripciones de ciudades
                const cityRequests: Promise<void>[] = [];

                // Para cada nombre de ciudad, buscar su información
                this.cities.forEach((cityName) => {
                  const cityFilters: ICityFilters = {
                    name: cityName,
                    countryId: countryId,
                  };

                  // Crear una promesa para cada solicitud de ciudad
                  const cityRequest = new Promise<void>((resolve) => {
                    this.locationsService
                      .getCities(cityFilters)
                      .pipe(takeUntil(this.destroy$))
                      .subscribe({
                        next: (cities) => {
                          console.log(
                            `Ciudades encontradas para ${cityName}:`,
                            cities
                          );
                          if (cities && cities.length > 0) {
                            // Añadir la ciudad a nuestro array de datos
                            this.citiesData.push(...cities);
                          }
                          resolve();
                        },
                        error: (err) => {
                          console.error(
                            `Error al obtener la ciudad ${cityName}:`,
                            err
                          );
                          resolve();
                        },
                      });
                  });

                  cityRequests.push(cityRequest);
                });

                // Cuando todas las solicitudes de ciudades se completen
                Promise.all(cityRequests).then(() => {
                  if (this.citiesData.length > 0) {
                    // Añadir marcadores para cada ciudad
                    this.citiesData.forEach((city) => this.addMarker(city));

                    // Calcular el centro del mapa basado en las ciudades
                    this.calculateMapCenter();
                  }
                });
              }
            }
          },
          error: (err) => {
            console.error('Error al obtener información del país:', err);
          },
        });
    } else if (this.cities && this.cities.length > 0) {
      // Si no tenemos país pero sí ciudades, buscar las ciudades por nombre
      const cityRequests: Promise<void>[] = [];

      this.cities.forEach((cityName) => {
        const cityFilters: ICityFilters = {
          name: cityName,
        };

        const cityRequest = new Promise<void>((resolve) => {
          this.locationsService
            .getCities(cityFilters)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (cities) => {
                if (cities && cities.length > 0) {
                  this.citiesData.push(...cities);
                }
                resolve();
              },
              error: (err) => {
                console.error(`Error al obtener la ciudad ${cityName}:`, err);
                resolve();
              },
            });
        });

        cityRequests.push(cityRequest);
      });

      Promise.all(cityRequests).then(() => {
        if (this.citiesData.length > 0) {
          this.citiesData.forEach((city) => this.addMarker(city));
          this.calculateMapCenter();
        }
      });
    }
  }
}
