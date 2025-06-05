import {
  Component,
  Input,
  OnInit,
  HostListener,
  ElementRef,
  Renderer2,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { TourNetService, Tour } from '../../../../core/services/tourNet.service';
import { TourLocationService, ITourLocationResponse } from '../../../../core/services/tour/tour-location.service';
import { TourLocationTypeService, ITourLocationTypeResponse } from '../../../../core/services/tour/tour-location-type.service';
import { LocationNetService, Location } from '../../../../core/services/locations/locationNet.service';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Router } from '@angular/router';

@Component({
  selector: 'app-tour-header-v2',
  standalone: false,
  templateUrl: './tour-header-v2.component.html',
  styleUrls: ['./tour-header-v2.component.scss']
})
export class TourHeaderV2Component implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  @Input() tourId: number | undefined;

  // Tour data
  tour: Partial<Tour> = {};
  
  // ✅ NUEVA PROPIEDAD: Información geográfica
  country: string = '';
  continent: string = '';

  // Scroll effect
  private isScrolled = false;
  private headerHeight = 0;
  private subscriptions = new Subscription();

  constructor(
    private tourNetService: TourNetService,
    private tourLocationService: TourLocationService,
    private tourLocationTypeService: TourLocationTypeService,
    private locationNetService: LocationNetService,
    private el: ElementRef,
    private renderer: Renderer2,
    private router: Router // Agregar Router para la navegación
  ) {}

  ngOnInit() {
    if (this.tourId) {
      this.loadTourData(this.tourId);
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['tourId'] && changes['tourId'].currentValue) {
      this.loadTourData(changes['tourId'].currentValue);
    }
  }

  ngAfterViewInit() {
    this.setHeaderHeight();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.handleScrollEffect();
  }

  // ===== PRIVATE METHODS =====

  private loadTourData(tourId: number) {
    this.subscriptions.add(
      this.tourNetService.getTourById(tourId).subscribe({
        next: (tourData) => {
          // Log detallado de cada propiedad
          Object.entries(tourData).forEach(([key, value]) => {
          });

          this.tour = { ...tourData };

          // ✅ NUEVA FUNCIONALIDAD: Cargar país y continente
          this.loadCountryAndContinent(tourId);
        },
        error: (error) => {
          console.error('❌ ======= ERROR CARGANDO TOUR =======');
          console.error('💥 Error completo:', error);
          console.error('🆔 Tour ID que falló:', tourId);
        }
      })
    );
  }

  /**
   * ✅ NUEVA FUNCIÓN: Obtener país y continente usando los servicios existentes
   */
  private loadCountryAndContinent(tourId: number): void {
    this.subscriptions.add(
      forkJoin([
        // Tipos de ubicaciones de tour  
        this.tourLocationTypeService.getAll().pipe(
          catchError(error => {
            console.error('❌ Error loading tour location types:', error);
            return of([]);
          })
        ),
        
        // Todas las ubicaciones
        this.locationNetService.getLocations().pipe(
          catchError(error => {
            console.error('❌ Error loading locations:', error);
            return of([]);
          })
        )
      ]).subscribe(([locationTypes, allLocations]) => {
        
        // Buscar tipos que podrían ser país o continente
        const countryTypeId = this.findLocationTypeId(locationTypes, ['país', 'country', 'pais']);
        const continentTypeId = this.findLocationTypeId(locationTypes, ['continente', 'continent']);
                
        // Si encontramos los tipos, buscar las ubicaciones correspondientes
        if (countryTypeId || continentTypeId) {
          
          // Obtener relaciones del tour para país y continente
          this.subscriptions.add(
            this.tourLocationService.getAll().pipe(
              map(allTourLocations => allTourLocations.filter(location => 
                location.tourId === tourId && 
                (location.tourLocationTypeId === countryTypeId || location.tourLocationTypeId === continentTypeId)
              )),
              catchError(error => {
                console.error('❌ Error loading country/continent tour locations:', error);
                return of([]);
              })
            ).subscribe((geographicTourLocations: ITourLocationResponse[]) => {
                            
              // Mapear las ubicaciones para obtener nombres
              const locationsMap = new Map<number, Location>();
              allLocations.forEach(location => {
                locationsMap.set(location.id, location);
              });
              
              // Arrays para manejar múltiples países y continentes
              const countries: string[] = [];
              const continents: string[] = [];
              
              // Ordenar por displayOrder para mantener el orden correcto
              const sortedGeographicLocations = geographicTourLocations.sort((a, b) => a.displayOrder - b.displayOrder);
              
              sortedGeographicLocations.forEach(tourLocation => {
                const location = locationsMap.get(tourLocation.locationId);
                if (location) {
                  if (tourLocation.tourLocationTypeId === countryTypeId) {
                    countries.push(location.name);
                  } else if (tourLocation.tourLocationTypeId === continentTypeId) {
                    continents.push(location.name);
                  }
                }
              });
              
              // Unir múltiples países/continentes con comas
              this.country = countries.join(', ');
              this.continent = continents.join(', ');
            })
          );
        } else {
          console.warn('⚠️ No se encontraron tipos de ubicación para país o continente en header');
        }
      })
    );
  }

  /**
   * ✅ FUNCIÓN AUXILIAR: Buscar ID de tipo de ubicación por nombres posibles
   */
  private findLocationTypeId(locationTypes: ITourLocationTypeResponse[], possibleNames: string[]): number | null {
    for (const type of locationTypes) {
      if (type.name) {
        const typeName = type.name.toLowerCase();
        for (const possibleName of possibleNames) {
          if (typeName.includes(possibleName.toLowerCase())) {
            return type.id;
          }
        }
      }
    }
    return null;
  }

  private setHeaderHeight() {
    const headerElement = this.el.nativeElement.querySelector('.tour-header');
    if (headerElement) {
      this.headerHeight = headerElement.offsetHeight;
      document.documentElement.style.setProperty(
        '--header-height',
        `${this.headerHeight}px`
      );
    }
  }

  private handleScrollEffect() {
    const scrollPosition =
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0;
    const headerElement = this.el.nativeElement.querySelector('.tour-header');

    if (!headerElement) return;

    const scrollThreshold = 100;

    if (scrollPosition > scrollThreshold && !this.isScrolled) {
      this.renderer.addClass(headerElement, 'scrolled');
      this.renderer.addClass(this.el.nativeElement, 'header-fixed');
      this.isScrolled = true;
    } else if (scrollPosition <= scrollThreshold && this.isScrolled) {
      this.renderer.removeClass(headerElement, 'scrolled');
      this.renderer.removeClass(this.el.nativeElement, 'header-fixed');
      this.isScrolled = false;
    }
  }

  // Agregar estas funciones al final del componente, antes del último cierre de llave
  
  // ✅ NUEVA FUNCIÓN: Manejar clic en país específico
  onCountryClick(event: MouseEvent, fullCountryText: string): void {
    event.preventDefault();
    
    const clickedCountry = this.getClickedCountry(event, fullCountryText);
    if (clickedCountry) {
      // Navegar a la búsqueda con el país específico
      this.router.navigate(['/tours'], {
        queryParams: {
          destination: clickedCountry
        }
      });
    }
  }

  // ✅ NUEVA FUNCIÓN: Detectar qué país se clickeó basado en la posición del clic
  private getClickedCountry(event: MouseEvent, fullText: string): string | null {
    const target = event.target as HTMLElement;
    const countries = fullText.split(',').map(c => c.trim()).filter(c => c);
    
    if (countries.length === 1) {
      return countries[0];
    }
  
    // Obtener la posición del clic dentro del elemento
    const rect = target.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const elementWidth = rect.width;
    
    // Crear un elemento temporal para medir el ancho de cada país
    const tempElement = document.createElement('span');
    tempElement.style.visibility = 'hidden';
    tempElement.style.position = 'absolute';
    tempElement.style.fontSize = window.getComputedStyle(target).fontSize;
    tempElement.style.fontFamily = window.getComputedStyle(target).fontFamily;
    document.body.appendChild(tempElement);
    
    let currentX = 0;
    let clickedCountry: string | null = null;
    
    for (let i = 0; i < countries.length; i++) {
      const country = countries[i];
      const separator = i < countries.length - 1 ? ', ' : '';
      const textToMeasure = country + separator;
      
      tempElement.textContent = textToMeasure;
      const textWidth = tempElement.offsetWidth;
      
      if (clickX >= currentX && clickX <= currentX + textWidth) {
        // Verificar si el clic está específicamente en el nombre del país (no en la coma)
        tempElement.textContent = country;
        const countryWidth = tempElement.offsetWidth;
        
        if (clickX <= currentX + countryWidth) {
          clickedCountry = country;
          break;
        }
      }
      
      currentX += textWidth;
    }
    
    document.body.removeChild(tempElement);
    return clickedCountry;
  }
}