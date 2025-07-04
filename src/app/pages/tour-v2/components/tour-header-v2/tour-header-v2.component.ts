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
import { LocationNetService, Location } from '../../../../core/services/locations/locationNet.service';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
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
  
  // Información geográfica
  country: string = '';
  continent: string = '';

  // Scroll effect
  private isScrolled = false;
  private headerHeight = 0;
  private subscriptions = new Subscription();

  constructor(
    private tourNetService: TourNetService,
    private tourLocationService: TourLocationService,
    private locationNetService: LocationNetService,
    private el: ElementRef,
    private renderer: Renderer2,
    private router: Router
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
          this.tour = { ...tourData };
          this.loadCountryAndContinent(tourId);
        },
        error: (error) => {
          console.error('❌ Error cargando tour:', error);
        }
      })
    );
  }

  /**
   * ✅ OPTIMIZACIÓN MÁXIMA: Usar getByTourAndType igual que el componente MAP
   */
  private loadCountryAndContinent(tourId: number): void {
    this.subscriptions.add(
      forkJoin([
        // ✅ Solo cargar COUNTRY del tour específico
        this.tourLocationService.getByTourAndType(tourId, "COUNTRY").pipe(
          map(response => Array.isArray(response) ? response : (response ? [response] : [])),
          catchError(error => {
            console.warn('⚠️ No se encontraron ubicaciones COUNTRY:', error);
            return of([]);
          })
        ),
        // ✅ Solo cargar CONTINENT del tour específico  
        this.tourLocationService.getByTourAndType(tourId, "CONTINENT").pipe(
          map(response => Array.isArray(response) ? response : (response ? [response] : [])),
          catchError(error => {
            console.warn('⚠️ No se encontraron ubicaciones CONTINENT:', error);
            return of([]);
          })
        )
      ]).pipe(
        switchMap(([countryLocations, continentLocations]) => {
          // Filtrar objetos vacíos y obtener solo ubicaciones válidas
          const validCountryLocations = countryLocations.filter(loc => loc && loc.id && loc.locationId);
          const validContinentLocations = continentLocations.filter(loc => loc && loc.id && loc.locationId);

          // Extraer todos los locationIds únicos que necesitamos
          const allLocationIds = [
            ...validCountryLocations.map(tl => tl.locationId),
            ...validContinentLocations.map(tl => tl.locationId)
          ];
          const uniqueLocationIds = [...new Set(allLocationIds)];

          if (uniqueLocationIds.length === 0) {
            return of({ 
              countryLocations: validCountryLocations, 
              continentLocations: validContinentLocations, 
              locations: [] 
            });
          }

          // ✅ OPTIMIZACIÓN: Cargar solo las ubicaciones específicas que necesitamos
          return this.locationNetService.getLocationsByIds(uniqueLocationIds).pipe(
            map(locations => ({
              countryLocations: validCountryLocations,
              continentLocations: validContinentLocations,
              locations
            })),
            catchError(error => {
              console.error('❌ Error loading specific locations:', error);
              return of({ 
                countryLocations: validCountryLocations, 
                continentLocations: validContinentLocations, 
                locations: [] 
              });
            })
          );
        })
      ).subscribe(({ countryLocations, continentLocations, locations }) => {
        // Crear map de ubicaciones para búsqueda O(1)
        const locationsMap = new Map<number, Location>();
        locations.forEach(location => {
          locationsMap.set(location.id, location);
        });

        // Procesar países
        const countries = countryLocations
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map(tl => locationsMap.get(tl.locationId)?.name)
          .filter(name => name) as string[];

        // Procesar continentes
        const continents = continentLocations
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map(tl => locationsMap.get(tl.locationId)?.name)
          .filter(name => name) as string[];

        // Asignar resultados finales
        this.country = countries.join(', ');
        this.continent = continents.join(', ');
      })
    );
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

  onCountryClick(event: MouseEvent, fullCountryText: string): void {
    event.preventDefault();
    
    const clickedCountry = this.getClickedCountry(event, fullCountryText);
    if (clickedCountry) {
      this.router.navigate(['/tours'], {
        queryParams: {
          destination: clickedCountry
        }
      });
    }
  }

  private getClickedCountry(event: MouseEvent, fullText: string): string | null {
    const target = event.target as HTMLElement;
    const countries = fullText.split(',').map(c => c.trim()).filter(c => c);
    
    if (countries.length === 1) {
      return countries[0];
    }
  
    const rect = target.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    
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