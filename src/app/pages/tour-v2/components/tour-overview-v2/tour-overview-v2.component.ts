import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TourNetService } from '../../../../core/services/tourNet.service';
import { CMSTourService, ICMSTourResponse } from '../../../../core/services/cms/cms-tour.service';
import { CMSCreatorService } from '../../../../core/services/cms/cms-creator.service';
import { TourLocationService, ITourLocationResponse } from '../../../../core/services/tour/tour-location.service';
import { TourLocationTypeService, ITourLocationTypeResponse } from '../../../../core/services/tour/tour-location-type.service';
import { LocationNetService, Location } from '../../../../core/services/locations/locationNet.service';
import { forkJoin, of, Observable } from 'rxjs';
import { catchError, switchMap, map, finalize } from 'rxjs/operators';

interface TourData {
  id?: number;
  name?: string;
  [key: string]: any;
}

interface CMSTourData {
  creatorId?: number;
  creatorComments?: string;
  imageUrl?: string;
  imageAlt?: string;
  [key: string]: any;
}

interface CreatorData {
  id?: number;
  name?: string;
  description?: string;
  imageUrl?: string;
  imageAlt?: string;
  [key: string]: any;
}

interface ProcessedLocation {
  id: number;
  name: string;
  type: string;
  typeId: number;
  displayOrder: number;
  isMapLocation: boolean;
  isHeaderLocation: boolean;
}

@Component({
  selector: 'app-tour-overview-v2',
  templateUrl: './tour-overview-v2.component.html',
  styleUrls: ['./tour-overview-v2.component.scss'],
  standalone: false
})
export class TourOverviewV2Component implements OnInit {
  @Input() tourId: number | undefined;
  
  loading = true;
  
  // Propiedades para manejar las ubicaciones
  tourLocations: ITourLocationResponse[] = [];
  processedLocations: ProcessedLocation[] = [];
  cities: string[] = [];
  countries: string[] = [];
  tags: string[] = [];
  mapLocations: string[] = [];
  headerLocations: string[] = [];
  
  tour: any = {
    id: 0,
    name: '',
    subtitle: '',
    description: '',
    continent: '',
    country: '',
    cities: [],
    vtags: [],
    expert: {
      name: '',
      charge: '',
      opinion: '',
      ephoto: [],
      creatorId: undefined
    },
    image: []
  };

  constructor(
    private router: Router,
    private sanitizer: DomSanitizer,
    private tourNetService: TourNetService,
    private cmsTourService: CMSTourService,
    private cmsCreatorService: CMSCreatorService,
    private tourLocationService: TourLocationService,
    private tourLocationTypeService: TourLocationTypeService,
    private locationNetService: LocationNetService
  ) {}

  ngOnInit(): void {
    if (this.tourId) {
      this.loadTour(this.tourId);
    } else {
      console.warn('⚠️ No se proporcionó tourId');
      this.loading = false;
    }
  }

  private loadTour(id: number): void {
    this.loading = true;
    this.loadEssentialData(id);
  }

  private loadEssentialData(id: number): void {
    // FASE 1: Cargar datos esenciales del tour
    forkJoin([
      this.tourNetService.getTourById(id).pipe(
        catchError(error => {
          console.error('❌ Error loading tour data:', error);
          return of(null);
        })
      ) as Observable<TourData | null>,
      
      this.cmsTourService.getAllTours({ tourId: id }).pipe(
        catchError(error => {
          console.error('❌ Error loading CMS tour data:', error);
          return of([]);
        })
      ) as Observable<CMSTourData[]>
    ]).pipe(
      finalize(() => {
        this.loading = false;
      })
    ).subscribe(([tourData, cmsTourData]) => {
            
      // Aplicar datos básicos inmediatamente
      this.applyBasicTourData(tourData, cmsTourData);
      
      // Cargar datos adicionales en segundo plano
      this.loadAdditionalDataOptimized(id, cmsTourData);
    });
  }

  private applyBasicTourData(tourData: TourData | null, cmsTourData: CMSTourData[]): void {
    const cmsTour: CMSTourData | null = Array.isArray(cmsTourData) && cmsTourData.length > 0 ? cmsTourData[0] : null;
    
    this.tour = {
      ...this.tour,
      ...tourData,
      
      // Aplicar imagen si está disponible
      ...(cmsTour?.imageUrl ? {
        image: [{
          url: cmsTour.imageUrl,
          alt: cmsTour.imageAlt || 'Tour Image'
        }]
      } : {}),
      
      // Aplicar datos básicos del expert si están disponibles
      ...(cmsTour ? {
        expert: {
          ...this.tour.expert,
          opinion: cmsTour.creatorComments || this.tour.expert.opinion,
          creatorId: cmsTour.creatorId
        }
      } : {})
    };
  }

  private loadAdditionalDataOptimized(id: number, cmsTourData: CMSTourData[]): void {
    const cmsTour: CMSTourData | null = Array.isArray(cmsTourData) && cmsTourData.length > 0 ? cmsTourData[0] : null;
    
    // 🚀 OPTIMIZACIÓN: Cargar solo las ubicaciones del tour específico y tipos
    forkJoin([
      // Ubicaciones del tour - filtrar directamente
      this.tourLocationService.getAll().pipe(
        map(allLocations => allLocations.filter(location => location.tourId === id)),
        catchError(error => {
          console.error('❌ Error loading tour locations:', error);
          return of([]);
        })
      ) as Observable<ITourLocationResponse[]>,
      
      // Tipos de ubicaciones
      this.tourLocationTypeService.getAll().pipe(
        catchError(error => {
          console.error('❌ Error loading tour location types:', error);
          return of([]);
        })
      ) as Observable<ITourLocationTypeResponse[]>
    ]).pipe(
      switchMap(([tourLocations, locationTypes]) => {        
        // Extraer los IDs únicos de ubicaciones que necesitamos
        const locationIds = [...new Set(tourLocations.map(tl => tl.locationId))];
                
        if (locationIds.length === 0) {
          console.warn('⚠️ No se encontraron locationIds para cargar');
          return of({ tourLocations, locationTypes, locations: [] });
        }

        // 🚀 OPTIMIZACIÓN: Cargar solo las ubicaciones específicas que necesitamos
        return this.locationNetService.getLocationsByIds(locationIds).pipe(
          map(locations => {
            return { tourLocations, locationTypes, locations };
          }),
          catchError(error => {
            console.error('❌ Error loading specific locations:', error);
            return of({ tourLocations, locationTypes, locations: [] });
          })
        );
      }),
      switchMap(({ tourLocations, locationTypes, locations }) => {
        // Procesar ubicaciones con los datos optimizados
        this.processLocationsWithDetailsOptimized(tourLocations, locationTypes, locations);
        
        // Cargar país y continente con datos ya cargados
        this.loadCountryAndContinentOptimized(id, tourLocations, locationTypes, locations);
        
        const creatorId = cmsTour?.creatorId;
        
        // Cargar creator si existe
        if (creatorId) {
          return (this.cmsCreatorService.getById(creatorId) as Observable<CreatorData>).pipe(
            catchError(error => {
              console.error('❌ Error loading creator data:', error);
              return of(null);
            })
          );
        }
        
        return of(null as CreatorData | null);
      })
    ).subscribe((creator: CreatorData | null) => {
            
      // Actualizar tour con datos completos
      this.tour = {
        ...this.tour,
        
        // Actualizar expert con datos del creator
        expert: {
          ...this.tour.expert,
          name: creator?.name || this.tour.expert.name,
          charge: creator?.description || this.tour.expert.charge,
          ephoto: creator?.imageUrl ? [{
            url: creator.imageUrl,
            alt: creator.imageAlt || 'Creator Image'
          }] : this.tour.expert.ephoto
        },
        
        // Usar ubicaciones procesadas
        cities: this.headerLocations.length > 0 ? this.headerLocations : this.cities,
        vtags: this.tags
      };
    });
  }

  /**
   * 🚀 OPTIMIZACIÓN: Procesar país y continente usando datos ya cargados específicos
   */
  private loadCountryAndContinentOptimized(
    tourId: number, 
    tourLocations: ITourLocationResponse[],
    locationTypes: ITourLocationTypeResponse[], 
    specificLocations: Location[]
  ): void {
    
    // Buscar tipos que podrían ser país o continente
    const countryTypeId = this.findLocationTypeId(locationTypes, ['país', 'country', 'pais']);
    const continentTypeId = this.findLocationTypeId(locationTypes, ['continente', 'continent']);
        
    if (countryTypeId || continentTypeId) {
      // 🚀 OPTIMIZACIÓN: Filtrar en memoria en lugar de hacer otra llamada HTTP
      const geographicTourLocations = tourLocations.filter(location => 
        location.tourLocationTypeId === countryTypeId || location.tourLocationTypeId === continentTypeId
      );
            
      // Mapear las ubicaciones específicas para obtener nombres
      const locationsMap = new Map<number, Location>();
      specificLocations.forEach(location => {
        locationsMap.set(location.id, location);
      });
      
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
      this.tour.country = countries.join(', ');
      this.tour.continent = continents.join(', ');
      
    } else {
      console.warn('⚠️ No se encontraron tipos de ubicación para país o continente');
    }
  }

  /**
   * Buscar ID de tipo de ubicación por nombres posibles
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

  /**
   * 🚀 OPTIMIZACIÓN: Procesar ubicaciones específicas de forma más eficiente
   */
  private processLocationsWithDetailsOptimized(
    tourLocations: ITourLocationResponse[],
    locationTypes: ITourLocationTypeResponse[],
    specificLocations: Location[]
  ): void {
    
    // Resetear arrays
    this.cities = [];
    this.countries = [];
    this.tags = [];
    this.mapLocations = [];
    this.headerLocations = [];
    this.processedLocations = [];
    
    // 🚀 OPTIMIZACIÓN: Usar Map para búsquedas O(1) en lugar de O(n)
    const locationTypesMap = new Map<number, ITourLocationTypeResponse>();
    locationTypes.forEach(type => {
      locationTypesMap.set(type.id, type);
    });
    
    const locationsMap = new Map<number, Location>();
    specificLocations.forEach(location => {
      locationsMap.set(location.id, location);
    });
    
    // 🚀 OPTIMIZACIÓN: Procesar ubicaciones en un solo bucle
    const mapLocationsList: { order: number; name: string }[] = [];
    const headerLocationsList: { order: number; name: string }[] = [];
    
    tourLocations.forEach((tourLocation) => {
      const locationType = locationTypesMap.get(tourLocation.tourLocationTypeId);
      const realLocation = locationsMap.get(tourLocation.locationId);
      
      if (realLocation && locationType) {
        const processedLocation: ProcessedLocation = {
          id: tourLocation.id,
          name: realLocation.name,
          type: locationType.name || 'Desconocido',
          typeId: tourLocation.tourLocationTypeId,
          displayOrder: tourLocation.displayOrder,
          isMapLocation: tourLocation.tourLocationTypeId === 1,
          isHeaderLocation: tourLocation.tourLocationTypeId === 2
        };
        
        this.processedLocations.push(processedLocation);
        
        // Clasificar por tipo
        if (tourLocation.tourLocationTypeId === 1) {
          mapLocationsList.push({ order: tourLocation.displayOrder, name: realLocation.name });
        } else if (tourLocation.tourLocationTypeId === 2) {
          headerLocationsList.push({ order: tourLocation.displayOrder, name: realLocation.name });
        }
        
        // También agregar a cities para fallback
        this.cities.push(realLocation.name);
      }
    });
    
    // Ordenar una sola vez al final
    this.mapLocations = mapLocationsList
      .sort((a, b) => a.order - b.order)
      .map(item => item.name);
      
    this.headerLocations = headerLocationsList
      .sort((a, b) => a.order - b.order)
      .map(item => item.name);
  }

  sanitizeHtml(html: string = ''): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  get destinationItems(): MenuItem[] {
    return this.tour?.cities?.map((city: string) => ({
      label: city,
    })) || [];
  }

  // Manejar clic en país específico
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

  // Detectar qué país se clickeó basado en la posición del clic
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

  get breadcrumbItems(): MenuItem[] {
    const items: MenuItem[] = [];
    
    if (this.tour?.continent) {
      items.push({
        label: this.tour.continent,
        command: (event) => {
          if (event.originalEvent) {
            this.onCountryClick(event.originalEvent as MouseEvent, this.tour.continent);
          }
        },
        routerLink: ['/tours'],
        queryParams: { destination: this.tour.continent },
        queryParamsHandling: 'merge'
      });
    }
    
    if (this.tour?.country) {
      items.push({
        label: this.tour.country,
        command: (event) => {
          if (event.originalEvent) {
            this.onCountryClick(event.originalEvent as MouseEvent, this.tour.country);
          }
        },
        routerLink: ['/tours'],
        queryParams: { destination: this.tour.country },
        queryParamsHandling: 'merge'
      });
    }
    
    items.push({ label: this.tour?.name || 'Tour Details' });
    
    return items;
  }
}