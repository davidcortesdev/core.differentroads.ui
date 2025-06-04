import { Component, Input, OnInit, OnChanges, SimpleChanges, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { environment } from '../../../../environments/environment';

// Interface para las ubicaciones que recibirá el mapa
interface MapLocation {
  latitude: number;
  longitude: number;
  title: string;
  displayOrder: number;
}

// Interface para los marcadores del mapa
interface MapMarker {
  position: google.maps.LatLngLiteral;
  label?: {
    color: string;
    text: string;
  };
  title?: string;
  info?: string;
  options: google.maps.marker.AdvancedMarkerElementOptions;
}

@Component({
  selector: 'app-tour-map-v2',
  standalone: false,
  templateUrl: './tour-map-v2.component.html',
  styleUrl: './tour-map-v2.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TourMapV2Component implements OnInit, OnChanges {
  @Input() mapLocations: MapLocation[] = []; // Array de ubicaciones a mostrar
  @Input() zoom: number = 15; // Zoom por defecto
  @Input() title: string = 'Mapa del Tour'; // Título del mapa

  // Configuración del mapa
  mapTypeId: google.maps.MapTypeId | undefined;
  mapId: string | undefined;
  markers: MapMarker[] = [];
  infoContent = '';
  center: google.maps.LatLngLiteral = { lat: 40.4168, lng: -3.7038 }; // Madrid por defecto
  sizeMapaWidth = '100%';
  sizeMapaHeight = '100%';
  apiLoaded: boolean = false;

  // Opciones del mapa
  mapOptions: google.maps.MapOptions = {
    zoomControl: true,
    scrollwheel: true,
    disableDoubleClickZoom: false,
    maxZoom: 20,
    minZoom: 1,
    streetViewControl: false,
    fullscreenControl: true,
    mapTypeControl: true,
    gestureHandling: 'cooperative',
    clickableIcons: true,
    keyboardShortcuts: true
  };

  // Estados del componente
  isLoading = true;
  hasLocations = false;
  errorMessage = '';

  private scriptElement: HTMLScriptElement | null = null;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    console.log('🗺️ TourMapV2 inicializado con:', {
      mapLocations: this.mapLocations,
      zoom: this.zoom,
      title: this.title
    });

    this.loadGoogleMapsScript();
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('🔄 TourMapV2 cambios detectados:', changes);

    if (changes['mapLocations'] && this.apiLoaded) {
      this.updateMapLocations();
    }

    if (changes['zoom'] && this.apiLoaded) {
      console.log('🔍 Zoom actualizado:', this.zoom);
      this.cdr.detectChanges();
    }
  }

  /**
   * 🚀 MÉTODO: Cargar script de Google Maps
   */
  private loadGoogleMapsScript(): void {
    // Verificar si Google Maps ya está disponible
    if (typeof google !== 'undefined' && google.maps) {
      console.log('✅ Google Maps ya está disponible');
      this.initializeMap();
      return;
    }

    // Verificar si el script ya existe
    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existingScript) {
      console.log('⏳ Script de Google Maps ya existe, esperando carga...');
      this.waitForGoogleMaps();
      return;
    }

    console.log('📥 Cargando script de Google Maps...');
    this.scriptElement = document.createElement('script');
    this.scriptElement.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&libraries=marker&loading=async`;
    this.scriptElement.async = true;
    this.scriptElement.defer = true;

    this.scriptElement.addEventListener('load', () => {
      console.log('✅ Script de Google Maps cargado exitosamente');
      setTimeout(() => {
        if (typeof google !== 'undefined' && google.maps) {
          this.initializeMap();
        } else {
          this.handleLoadError('Google Maps API no disponible después de cargar');
        }
      }, 100);
    });

    this.scriptElement.addEventListener('error', (error) => {
      console.error('❌ Error al cargar Google Maps API:', error);
      this.handleLoadError('Error al cargar Google Maps API');
    });

    document.head.appendChild(this.scriptElement);
  }

  /**
   * ⏳ MÉTODO: Esperar a que Google Maps esté disponible
   */
  private waitForGoogleMaps(): void {
    const checkLoaded = () => {
      if (typeof google !== 'undefined' && google.maps) {
        this.initializeMap();
      } else {
        setTimeout(checkLoaded, 100);
      }
    };
    checkLoaded();
  }

  /**
   * 🔧 MÉTODO: Inicializar Google Maps
   */
  private initializeMap(): void {
    try {
      this.mapTypeId = google.maps.MapTypeId.ROADMAP;
      this.mapId = '7f7a264cb58d0536'; // Tu Map ID personalizado
      this.apiLoaded = true;
      this.isLoading = false;

      console.log('✅ Google Maps API inicializada correctamente');
      
      this.updateMapLocations();
      this.cdr.detectChanges();
    } catch (error) {
      console.error('❌ Error al inicializar Google Maps:', error);
      this.handleLoadError('Error al inicializar Google Maps');
    }
  }

  /**
   * 🗺️ MÉTODO: Actualizar ubicaciones en el mapa
   */
  private updateMapLocations(): void {
    if (!this.apiLoaded) {
      console.log('⚠️ API no está cargada aún');
      return;
    }

    console.log('🔄 Actualizando ubicaciones del mapa:', this.mapLocations);

    this.hasLocations = this.mapLocations && this.mapLocations.length > 0;

    if (!this.hasLocations) {
      console.log('⚠️ No hay ubicaciones para mostrar');
      this.markers = [];
      this.center = { lat: 40.4168, lng: -3.7038 }; // Madrid por defecto
      this.cdr.detectChanges();
      return;
    }

    this.createMarkersAndCenter();
    this.cdr.detectChanges();
  }

  /**
   * 📍 MÉTODO: Crear marcadores y calcular centro
   */
  private createMarkersAndCenter(): void {
    this.markers = [];

    if (!this.mapLocations || this.mapLocations.length === 0) {
      return;
    }

    // Crear marcadores
    this.mapLocations.forEach((location, index) => {
      this.addMarker(location, index + 1);
    });

    // Calcular centro del mapa
    this.calculateMapCenter();

    console.log('📍 Marcadores creados:', this.markers.length);
  }

  /**
   * 📍 MÉTODO: Añadir marcador individual
   */
  private addMarker(location: MapLocation, order: number): void {
    const position = { 
      lat: Number(location.latitude), 
      lng: Number(location.longitude) 
    };

    const markerOptions: google.maps.marker.AdvancedMarkerElementOptions = {
      gmpDraggable: false,
      title: `${order}. ${location.title}`,
    };

    this.markers.push({
      position,
      title: `${order}. ${location.title}`,
      info: `Orden ${location.displayOrder}: ${location.title}`,
      label: {
        color: 'white',
        text: order.toString()
      },
      options: markerOptions,
    });

    console.log(`📍 Marcador ${order} agregado:`, location.title, position);
  }

  /**
   * 🎯 MÉTODO: Calcular centro del mapa
   */
  private calculateMapCenter(): void {
    if (!this.mapLocations || this.mapLocations.length === 0) {
      return;
    }

    if (typeof google === 'undefined') {
      console.warn('Google Maps API no disponible para calcular bounds');
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    let validCoordinates = 0;

    this.mapLocations.forEach((location) => {
      if (location.latitude && location.longitude) {
        bounds.extend({ 
          lat: Number(location.latitude), 
          lng: Number(location.longitude) 
        });
        validCoordinates++;
      }
    });

    if (validCoordinates > 0) {
      this.center = {
        lat: bounds.getCenter().lat(),
        lng: bounds.getCenter().lng(),
      };

      // Ajustar zoom si hay múltiples ubicaciones
      if (validCoordinates > 1) {
        const PADDING = 50;
        this.zoom = Math.min(
          this.getZoomLevel(bounds, PADDING),
          this.mapOptions.maxZoom || 20
        );
      }

      console.log('🎯 Centro calculado:', this.center, 'Zoom:', this.zoom);
    }
  }

  /**
   * 🔍 MÉTODO: Calcular nivel de zoom
   */
  private getZoomLevel(bounds: google.maps.LatLngBounds, padding: number): number {
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

  /**
   * ❌ MÉTODO: Manejar errores de carga
   */
  private handleLoadError(message: string): void {
    this.isLoading = false;
    this.errorMessage = message;
    this.apiLoaded = false;
    this.cdr.detectChanges();
  }

  /**
   * 🔍 MÉTODO: Track by para optimizar renderizado
   */
  trackByPosition(index: number, marker: MapMarker): string {
    return `${marker.position.lat}-${marker.position.lng}`;
  }

  /**
   * 🧹 MÉTODO: Cleanup al destruir componente
   */
  ngOnDestroy(): void {
    if (this.scriptElement && this.scriptElement.parentNode) {
      this.scriptElement.parentNode.removeChild(this.scriptElement);
    }
  }
}