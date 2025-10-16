import { Component, OnInit, OnDestroy } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { LocationNetService, Location } from '../../core/services/locations/locationNet.service';
import { TourLocationService } from '../../core/services/tour/tour-location.service';

@Component({
  selector: 'app-destination-page',
  standalone: false,
  templateUrl: './destination-page.component.html',
  styleUrl: './destination-page.component.scss',
})
export class DestinationPageComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  
  continentSlug: string = ''; // menuItemSlug = continente (ej: "africa")
  destinationSlug: string = ''; // destinationSlug = país (ej: "marruecos")
  
  continentLocation: Location | null = null;
  destinationLocation: Location | null = null;
  continentId: number | null = null;
  destinationId: number | null = null;
  
  tourIds: number[] = []; // IDs de tours filtrados por ubicación
  isLoading = true;
  isLoadingTours = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private titleService: Title,
    private locationService: LocationNetService,
    private tourLocationService: TourLocationService
  ) {}

  ngOnInit(): void {
    // Observar cambios en los parámetros de la ruta
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.continentSlug = params['menuItemSlug'] || ''; // El continente
        this.destinationSlug = params['destinationSlug'] || ''; // El país (opcional)
        
        this.loadDestinationData();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDestinationData(): void {
    this.isLoading = true;
    
    // Si hay destinationSlug, buscar el país/destino directamente
    if (this.destinationSlug) {
      const destinationName = this.formatSlug(this.destinationSlug);
      
      this.locationService
        .getLocations({ name: destinationName })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (destinationLocations) => {
            if (destinationLocations && destinationLocations.length > 0) {
              this.destinationLocation = destinationLocations[0];
              this.destinationId = this.destinationLocation.id;
            } else {
              console.warn(`No se encontró ubicación para el destino: ${destinationName}`);
            }
            this.updatePageInfo();
          },
          error: (error) => {
            console.error('Error al buscar destino:', error);
            this.updatePageInfo();
          }
        });
    } else {
      // Si NO hay destinationSlug, buscar el continente
      const continentName = this.formatSlug(this.continentSlug);
      
      this.locationService
        .getLocations({ name: continentName })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (continentLocations) => {
            if (continentLocations && continentLocations.length > 0) {
              this.continentLocation = continentLocations[0];
              this.continentId = this.continentLocation.id;
            } else {
              console.warn(`No se encontró ubicación para el continente: ${continentName}`);
            }
            this.updatePageInfo();
          },
          error: (error) => {
            console.error('Error al buscar continente:', error);
            this.updatePageInfo();
          }
        });
    }
  }

  private updatePageInfo(): void {
    // Actualizar título
    let title: string;
    
    if (this.destinationSlug && this.destinationLocation) {
      // Si buscamos destino y lo encontramos
      title = `${this.destinationLocation.name} - Different Roads`;
    } else if (this.destinationSlug) {
      // Si buscamos destino pero no lo encontramos
      title = `${this.formatSlug(this.destinationSlug)} - Different Roads`;
    } else if (this.continentLocation) {
      // Si buscamos continente y lo encontramos
      title = `Destinos en ${this.continentLocation.name} - Different Roads`;
    } else {
      // Si buscamos continente pero no lo encontramos
      title = `Destinos en ${this.formatSlug(this.continentSlug)} - Different Roads`;
    }
    
    this.titleService.setTitle(title);

    // Log para debug
    console.log('Datos de ubicación cargados:', {
      destinationId: this.destinationId,
      destinationName: this.destinationLocation?.name,
      continentId: this.continentId,
      continentName: this.continentLocation?.name
    });

    this.isLoading = false;
    
    // Cargar tours basados en las ubicaciones
    this.loadTours();
  }

  /**
   * Carga los tours filtrados por las ubicaciones seleccionadas
   */
  private loadTours(): void {
    const locationIds: number[] = [];
    
    // Si hay destino específico, usar solo ese
    if (this.destinationId) {
      locationIds.push(this.destinationId);
    } 
    // Si solo hay continente, usar ese
    else if (this.continentId) {
      locationIds.push(this.continentId);
    }

    // Si no hay ubicaciones, no hacer nada
    if (locationIds.length === 0) {
      console.warn('No hay IDs de ubicación para filtrar tours');
      return;
    }

    this.isLoadingTours = true;
    
    this.tourLocationService
      .getToursByLocations(locationIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tourIds) => {
          this.tourIds = tourIds;
          console.log(`Tours encontrados para las ubicaciones [${locationIds.join(', ')}]:`, tourIds);
          this.isLoadingTours = false;
        },
        error: (error) => {
          console.error('Error al cargar tours por ubicaciones:', error);
          this.tourIds = [];
          this.isLoadingTours = false;
        }
      });
  }

  /**
   * Obtiene el nombre a mostrar para el continente
   */
  getContinentName(): string {
    // Si hay destino, el continente no se buscó, usar el slug formateado
    if (this.destinationSlug) {
      return this.formatSlug(this.continentSlug);
    }
    // Si no hay destino, se buscó el continente
    return this.continentLocation?.name || this.formatSlug(this.continentSlug);
  }

  /**
   * Obtiene el nombre a mostrar para el destino
   */
  getDestinationName(): string {
    return this.destinationLocation?.name || this.formatSlug(this.destinationSlug);
  }

  formatSlug(slug: string): string {
    return slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

