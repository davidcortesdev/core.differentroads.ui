import { Component, Input, OnInit, OnChanges, SimpleChanges, ChangeDetectionStrategy, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { environment } from '../../../../environments/environment';

// Interface para las ubicaciones que recibirá el mapa
interface MapLocation {
  latitude: number;
  longitude: number;
  title: string;
  displayOrder: number;
}

// Interface para los marcadores del mapa - SIN TIPADO DE GOOGLE
interface MapMarker {
  position: any;
  label?: {
    color: string;
    text: string;
  };
  title?: string;
  info?: string;
  options: any;
}

@Component({
  selector: 'app-tour-map-v2',
  standalone: false,
  templateUrl: './tour-map-v2.component.html',
  styleUrl: './tour-map-v2.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TourMapV2Component implements OnInit, OnChanges, OnDestroy {
  @Input() mapLocations: MapLocation[] = []; // Array de ubicaciones a mostrar
  @Input() zoom: number = 15; // Zoom por defecto
  @Input() title: string = 'Mapa del Tour'; // Título del mapa

  // Configuración del mapa - SIN TIPADO ESPECÍFICO
  mapTypeId: any;
  mapId: string | undefined;
  markers: MapMarker[] = [];
  infoContent = '';
  center: any = { lat: 40.4168, lng: -3.7038 }; // Madrid por defecto
  sizeMapaWidth = '100%';
  sizeMapaHeight = '100%';
  apiLoaded: boolean = false;

  // Opciones del mapa - TIPADO SIMPLIFICADO
  mapOptions: any = {
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

  // Variables para manejo mejorado de la carga
  private loadAttempts = 0;
  private maxLoadAttempts = 3;
  private loadTimeout: any;
  private initTimeout: any;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadGoogleMapsScript();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mapLocations'] && this.apiLoaded) {
      this.updateMapLocations();
    }

    if (changes['zoom'] && this.apiLoaded) {
      this.cdr.detectChanges();
    }
  }

  /**
   * 🚀 MÉTODO MEJORADO: Cargar script de Google Maps con reintentos
   */
  private loadGoogleMapsScript(): void {    
    // Limpiar timeouts anteriores
    if (this.loadTimeout) {
      clearTimeout(this.loadTimeout);
    }
    if (this.initTimeout) {
      clearTimeout(this.initTimeout);
    }

    // Verificar si Google Maps ya está disponible y completamente cargado
    if (this.isGoogleMapsFullyLoaded()) {
      this.initializeMap();
      return;
    }

    // Verificar si el script ya existe pero aún no está cargado
    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existingScript) {
      this.waitForGoogleMapsWithTimeout();
      return;
    }

    // Cargar nuevo script
    this.loadNewGoogleMapsScript();
  }

  /**
   * 🔍 MÉTODO: Verificar si Google Maps está completamente cargado - SIN TIPADO ESTRICTO
   */
  private isGoogleMapsFullyLoaded(): boolean {
    return typeof (window as any).google !== 'undefined' && 
           (window as any).google.maps && 
           (window as any).google.maps.Map && 
           (window as any).google.maps.LatLngBounds;
  }

  /**
   * 📥 MÉTODO: Cargar nuevo script de Google Maps
   */
  private loadNewGoogleMapsScript(): void {    
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&libraries=marker&loading=async&callback=initMap`;
    script.async = true;
    script.defer = true;
    script.id = 'google-maps-script';

    // Crear callback global temporal
    (window as any).initMap = () => {
      setTimeout(() => {
        if (this.isGoogleMapsFullyLoaded()) {
          this.initializeMap();
        } else {
          console.warn('⚠️ Google Maps callback ejecutado pero API no completamente disponible');
          this.retryLoad();
        }
      }, 100);
    };

    script.addEventListener('load', () => {
    });

    script.addEventListener('error', (error) => {
      console.error('❌ Error al cargar script de Google Maps:', error);
      this.retryLoad();
    });

    // Timeout de seguridad
    this.loadTimeout = setTimeout(() => {
     /*  console.warn('⏰ Timeout en carga de Google Maps'); */
      this.retryLoad();
    }, 10000); // 10 segundos

    document.head.appendChild(script);
  }

  /**
   * ⏳ MÉTODO MEJORADO: Esperar Google Maps con timeout
   */
  private waitForGoogleMapsWithTimeout(): void {
    let attempts = 0;
    const maxWaitAttempts = 50; // 5 segundos máximo

    const checkLoaded = () => {
      attempts++;
      
      if (this.isGoogleMapsFullyLoaded()) {
        this.initializeMap();
        return;
      }

      if (attempts >= maxWaitAttempts) {
        console.warn('⏰ Timeout esperando Google Maps');
        this.retryLoad();
        return;
      }

      setTimeout(checkLoaded, 100);
    };

    checkLoaded();
  }

  /**
   * 🔄 MÉTODO: Reintentar carga
   */
  private retryLoad(): void {
    this.loadAttempts++;

    if (this.loadAttempts >= this.maxLoadAttempts) {
      console.error('❌ Máximo de intentos alcanzado para cargar Google Maps');
      this.handleLoadError('No se pudo cargar Google Maps después de varios intentos');
      return;
    }    
    // Limpiar script anterior si existe
    const existingScript = document.getElementById('google-maps-script');
    if (existingScript) {
      existingScript.remove();
    }

    // Limpiar callback global
    if ((window as any).initMap) {
      delete (window as any).initMap;
    }

    setTimeout(() => {
      this.loadGoogleMapsScript();
    }, 2000);
  }

  /**
   * 🔧 MÉTODO MEJORADO: Inicializar Google Maps
   */
  private initializeMap(): void {
    if (this.initTimeout) {
      clearTimeout(this.initTimeout);
    }

    try {      
      if (!this.isGoogleMapsFullyLoaded()) {
        console.error('❌ Google Maps no está completamente disponible');
        this.retryLoad();
        return;
      }

      const google = (window as any).google;
      this.mapTypeId = google.maps.MapTypeId.ROADMAP;
      this.mapId = '7f7a264cb58d0536'; // Tu Map ID personalizado
      this.apiLoaded = true;
      this.isLoading = false;
      this.errorMessage = '';
      this.loadAttempts = 0; // Reset intentos en caso de éxito      
      this.updateMapLocations();
      this.cdr.detectChanges();

      // Limpiar callback global
      if ((window as any).initMap) {
        delete (window as any).initMap;
      }

    } catch (error) {
      console.error('❌ Error al inicializar Google Maps:', error);
      this.retryLoad();
    }
  }

  /**
   * 🗺️ MÉTODO: Actualizar ubicaciones en el mapa
   */
  private updateMapLocations(): void {
    if (!this.apiLoaded) {
      console.warn('⚠️ Intentando actualizar ubicaciones sin API cargada');
      return;
    }

    this.hasLocations = this.mapLocations && this.mapLocations.length > 0;
    if (!this.hasLocations) {
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

    try {
      // Crear marcadores
      this.mapLocations.forEach((location, index) => {
        this.addMarker(location, index + 1);
      });

      // Calcular centro del mapa
      this.calculateMapCenter();
      } catch (error) {
      console.error('❌ Error creando marcadores:', error);
    }
  }

  /**
   * 📍 MÉTODO: Añadir marcador individual
   */
  private addMarker(location: MapLocation, order: number): void {
    const position = { 
      lat: Number(location.latitude), 
      lng: Number(location.longitude) 
    };

    // Validar coordenadas
    if (isNaN(position.lat) || isNaN(position.lng)) {
      console.warn('⚠️ Coordenadas inválidas para:', location.title);
      return;
    }

    const markerOptions = {
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
  }

  /**
   * 🎯 MÉTODO: Calcular centro del mapa
   */
  private calculateMapCenter(): void {
    if (!this.mapLocations || this.mapLocations.length === 0) {
      return;
    }

    if (!this.isGoogleMapsFullyLoaded()) {
      console.warn('⚠️ Google Maps API no disponible para calcular bounds');
      return;
    }

    try {
      const google = (window as any).google;
      const bounds = new google.maps.LatLngBounds();
      let validCoordinates = 0;

      this.mapLocations.forEach((location) => {
        const lat = Number(location.latitude);
        const lng = Number(location.longitude);
        
        if (!isNaN(lat) && !isNaN(lng)) {
          bounds.extend({ lat, lng });
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
        
      }
    } catch (error) {
      console.error('❌ Error calculando centro:', error);
    }
  }

  /**
   * 🔍 MÉTODO: Calcular nivel de zoom
   */
  private getZoomLevel(bounds: any, padding: number): number {
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
    console.error('❌ Error del mapa:', message);
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
    // Limpiar timeouts
    if (this.loadTimeout) {
      clearTimeout(this.loadTimeout);
    }
    if (this.initTimeout) {
      clearTimeout(this.initTimeout);
    }

    // Limpiar callback global
    if ((window as any).initMap) {
      delete (window as any).initMap;
    }

    // Limpiar script si fue creado por este componente
    const script = document.getElementById('google-maps-script');
    if (script) {
      script.remove();
    }
  }
}