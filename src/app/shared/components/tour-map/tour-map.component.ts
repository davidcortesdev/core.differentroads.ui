import { Component, Input, OnInit } from '@angular/core';
import { environment } from '../../../../environments/environment';

export interface City {
  nombre: string;
  lat: number;
  lng: number;
}

@Component({
  selector: 'app-tour-map',
  standalone: false,
  templateUrl: './tour-map.component.html',
  styleUrls: ['./tour-map.component.scss']
})
export class TourMapComponent implements OnInit {
  @Input() cities: string[] = [];
  @Input() citiesData: City[] = [];

  mapTypeId: google.maps.MapTypeId | undefined;
  mapId: string | undefined;
  markers: any = [];
  infoContent = '';
  center: google.maps.LatLngLiteral = { lat: 40.73061, lng: -73.935242 };
  zoom = 8;
  sizeMapaWidth = '100%';
  sizeMapaHeight = '100%';
  advancedMarkerOptions: google.maps.marker.AdvancedMarkerElementOptions = {
    gmpDraggable: false,
  };
  advancedMarkerPositions: google.maps.LatLngLiteral[] = [];
  apiLoaded: boolean = false;
  // Add polyline options and path
  polylinePath: google.maps.LatLngLiteral[] = [];
  polylineOptions: google.maps.PolylineOptions = {
    strokeColor: '#FF0000',
    strokeOpacity: 0.8,
    geodesic: true,
    clickable: false,
    strokeWeight: 3
  };
  mapOptions: google.maps.MapOptions = {
    zoomControl: true,
    scrollwheel: false,
    disableDoubleClickZoom: true,
    maxZoom: 15,
    minZoom: 1,
    styles: [
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
    ],
  };
  markerOptions: google.maps.MarkerOptions = {
    draggable: false,
  };

  constructor() {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
    script.addEventListener('load', () => {
      this.mapTypeId = google.maps.MapTypeId.ROADMAP;
      this.mapId = google.maps.Map.DEMO_MAP_ID;
      this.apiLoaded = true;
      
      // Initialize polyline options with Google Maps API objects after API is loaded
      this.polylineOptions = {
        ...this.polylineOptions,
        icons: [{
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 7,
            fillColor: '#FF0000',
            fillOpacity: 0.8,
            strokeWeight: 0
          },
          offset: '0',
          repeat: '120px'
        }]
      };
    });
  }

  ngOnInit(): void {
    // Si ya tenemos datos de ciudades, calculamos el centro
    if (this.citiesData.length > 0) {
      this.calculateMapCenter();
    }
  }

  getLatLog(
    city: City
  ):
    | google.maps.LatLngLiteral
    | google.maps.LatLng
    | google.maps.LatLngAltitude
    | google.maps.LatLngAltitudeLiteral {
    return { lat: city.lat, lng: city.lng };
  }

  addMarker(ciudad: City) {
    const position = { lat: ciudad.lat, lng: ciudad.lng };
    this.markers.push({
      position: position,
      label: {
        color: 'red',
        text: ciudad.nombre,
      },
      title: ciudad.nombre,
      info: ciudad.nombre,
      options: {},
    });
    // Add the position to the polyline path
    this.polylinePath.push(position);
  }

  calculateMapCenter(): void {
    if (this.citiesData?.length === 0) return;
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

  private getZoomLevel(
    bounds: google.maps.LatLngBounds,
    padding: number
  ): number {
    const WORLD_DIM = { height: 256, width: 256 };
    const ZOOM_MAX = 21;
    function latRad(lat: number) {
      const sin = Math.sin((lat * Math.PI) / 180);
      const radX2 = Math.log((1 + sin) / (1 - sin)) / 2;
      return Math.max(Math.min(radX2, Math.PI), -Math.PI) / 2;
    }
    function zoom(mapPx: number, worldPx: number, fraction: number) {
      return Math.floor(Math.log(mapPx / worldPx / fraction) / Math.LN2);
    }
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const latFraction = (latRad(ne.lat()) - latRad(sw.lat())) / Math.PI;
    const lngDiff = ne.lng() - sw.lng();
    const lngFraction = (lngDiff < 0 ? lngDiff + 360 : lngDiff) / 360;
    const latZoom = zoom(400 - padding * 2, WORLD_DIM.height, latFraction);
    const lngZoom = zoom(800 - padding * 2, WORLD_DIM.width, lngFraction);
    return Math.min(latZoom, lngZoom, ZOOM_MAX);
  }

  // Método para actualizar los datos de ciudades desde el componente padre
  updateCitiesData(citiesData: City[]): void {
    this.citiesData = citiesData;
    this.markers = [];
    this.polylinePath = []; // Reset the polyline path
    citiesData.forEach(city => this.addMarker(city));
    
    // Create a smooth path with additional points
    if (this.polylinePath.length > 1) {
      this.polylinePath = this.createSmoothPath(this.polylinePath);
    }
    
    this.calculateMapCenter();
  }
  
  // Create a smooth curved path between points
  private createSmoothPath(points: google.maps.LatLngLiteral[]): google.maps.LatLngLiteral[] {
    if (points.length <= 2) return points;
    
    const smoothPath: google.maps.LatLngLiteral[] = [];
    const numPoints = 20; // Increased number of points for smoother curves
    
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      
      // Add the current point
      smoothPath.push(p1);
      
      // Calculate control points for the curve
      // We'll offset the control points perpendicular to the line between p1 and p2
      const dx = p2.lng - p1.lng;
      const dy = p2.lat - p1.lat;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Create perpendicular offset (this controls the curve amount)
      const curveFactor = dist * 0.3; // Adjust this value to control curve intensity
      const perpX = -dy / dist * curveFactor;
      const perpY = dx / dist * curveFactor;
      
      // Control point (midpoint with perpendicular offset)
      const ctrlPoint = {
        lat: (p1.lat + p2.lat) / 2 + perpY,
        lng: (p1.lng + p2.lng) / 2 + perpX
      };
      
      // Add intermediate points using quadratic Bézier curve
      for (let j = 1; j < numPoints; j++) {
        const t = j / numPoints;
        
        // Quadratic Bézier curve formula: B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
        const lat = Math.pow(1-t, 2) * p1.lat + 
                    2 * (1-t) * t * ctrlPoint.lat + 
                    Math.pow(t, 2) * p2.lat;
                    
        const lng = Math.pow(1-t, 2) * p1.lng + 
                    2 * (1-t) * t * ctrlPoint.lng + 
                    Math.pow(t, 2) * p2.lng;
        
        smoothPath.push({ lat, lng });
      }
    }
    
    // Add the last point
    smoothPath.push(points[points.length - 1]);
    
    return smoothPath;
  }
}