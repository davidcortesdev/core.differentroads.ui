import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { environment } from '../../../../environments/environment';

export interface City {
  nombre: string;
  lat: number;
  lng: number;
}

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
  @Input() citiesData: City[] = [];

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
    /*styles: [
      {
        elementType: 'geometry',
        stylers: [{ color: '#f5f5f5' }],
      },
      {
        elementType: 'labels.icon',
        stylers: [{ visibility: 'off' }],
      },
      {
        elementType: 'labels.text.fill',
        stylers: [{ color: '#616161' }],
      },
      {
        elementType: 'labels.text.stroke',
        stylers: [{ color: '#f5f5f5' }],
      },
      {
        featureType: 'administrative.land_parcel',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#bdbdbd' }],
      },
      {
        featureType: 'poi',
        elementType: 'geometry',
        stylers: [{ color: '#eeeeee' }],
      },
      {
        featureType: 'poi',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#757575' }],
      },
      {
        featureType: 'poi.park',
        elementType: 'geometry',
        stylers: [{ color: '#e5e5e5' }],
      },
      {
        featureType: 'poi.park',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#9e9e9e' }],
      },
      {
        featureType: 'road',
        elementType: 'geometry',
        stylers: [{ color: '#ffffff' }],
      },
      {
        featureType: 'road.arterial',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#757575' }],
      },
      {
        featureType: 'road.highway',
        elementType: 'geometry',
        stylers: [{ color: '#dadada' }],
      },
      {
        featureType: 'road.highway',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#616161' }],
      },
      {
        featureType: 'road.local',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#9e9e9e' }],
      },
      {
        featureType: 'transit.line',
        elementType: 'geometry',
        stylers: [{ color: '#e5e5e5' }],
      },
      {
        featureType: 'transit.station',
        elementType: 'geometry',
        stylers: [{ color: '#eeeeee' }],
      },
      {
        featureType: 'water',
        elementType: 'geometry',
        stylers: [{ color: '#c9c9c9' }],
      },
      {
        featureType: 'water',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#9e9e9e' }],
      },
    ],*/
  };
  
  markerOptions: google.maps.marker.AdvancedMarkerElementOptions = {
    gmpDraggable: false,
    title: '',
  };

  private scriptElement: HTMLScriptElement | null = null;

  constructor() {
    this.loadGoogleMapsScript();
  }

  ngOnInit(): void {
    if (this.citiesData.length > 0) {
      this.calculateMapCenter();
    }
  }

  ngOnDestroy(): void {
    // Clean up the script element if component is destroyed
    if (this.scriptElement && this.scriptElement.parentNode) {
      this.scriptElement.parentNode.removeChild(this.scriptElement);
    }
  }

  private loadGoogleMapsScript(): void {
    // Check if script is already loaded
    if (document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')) {
      this.initializeMap();
      return;
    }

    this.scriptElement = document.createElement('script');
    this.scriptElement.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&libraries=marker`;
    this.scriptElement.async = true;
    this.scriptElement.defer = true;
    
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
    this.mapId = "7f7a264cb58d0536"; // Get this from Google Cloud Console
    this.apiLoaded = true;

    // Initialize polyline options with the primary color
    this.polylineOptions = {
      ...this.polylineOptions,
      strokeColor: this.getPrimaryColor(),
      icons: [],
    };
  }

  getLatLog(city: City): google.maps.LatLngLiteral {
    return { lat: city.lat, lng: city.lng };
  }

  addMarker(ciudad: City): void {
    const position = { lat: ciudad.lat, lng: ciudad.lng };
    
    // Create marker options with title
    const markerOptions: google.maps.marker.AdvancedMarkerElementOptions = {
      gmpDraggable: false,
      title: ciudad.nombre,
    };
    
    this.markers.push({
      position,
      title: ciudad.nombre,
      info: ciudad.nombre,
      options: markerOptions,
    });
    
    // Add the position to the polyline path
    this.polylinePath.push(position);
  }

  calculateMapCenter(): void {
    if (!this.citiesData?.length) return;
    
    const bounds = new google.maps.LatLngBounds();
    this.citiesData.forEach((city) => {
      bounds.extend({ lat: city.lat, lng: city.lng });
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

  // Método para actualizar los datos de ciudades desde el componente padre
  updateCitiesData(citiesData: City[]): void {
    this.citiesData = citiesData;
    this.markers = [];
    this.polylinePath = []; 
    
    // Add markers for each city
    citiesData.forEach((city) => this.addMarker(city));

    // Create a smooth path with additional points if we have multiple cities
    if (this.polylinePath.length > 1) {
      this.polylinePath = this.createSmoothPath(this.polylinePath);
    }

    this.calculateMapCenter();
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
}
