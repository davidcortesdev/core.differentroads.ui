import { Component, Input, OnInit } from '@angular/core';
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
  
  // ✅ SOLUCION 1: Controlar correctamente el estado de carga
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
      // ✅ SOLUCION: Establecer loading false si no hay tourId
      this.loading = false;
    }
  }

  private loadTour(id: number): void {
    this.loading = true;
    
    // ✅ OPTIMIZACION 1: Cargar datos esenciales primero
    this.loadEssentialData(id);
  }

  private loadEssentialData(id: number): void {
    // ✅ OPTIMIZACION 2: Dividir la carga en dos fases para mostrar contenido más rápido
    
    // FASE 1: Cargar solo datos esenciales del tour
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
      // ✅ SOLUCION 2: Usar finalize para asegurar que loading se establezca en false
      finalize(() => {
        console.log('🔄 Finalizando carga esencial');
        this.loading = false; // ✅ CRITICO: Establecer loading false aquí
      })
    ).subscribe(([tourData, cmsTourData]) => {
      
      console.log('📊 Datos esenciales cargados:', { tourData, cmsTourData });
      
      // Aplicar datos básicos inmediatamente
      this.applyBasicTourData(tourData, cmsTourData);
      
      // Cargar datos adicionales en segundo plano
      this.loadAdditionalData(id, cmsTourData);
    });
  }

  private applyBasicTourData(tourData: TourData | null, cmsTourData: CMSTourData[]): void {
    const cmsTour: CMSTourData | null = Array.isArray(cmsTourData) && cmsTourData.length > 0 ? cmsTourData[0] : null;
    
    // ✅ OPTIMIZACION 3: Aplicar datos básicos inmediatamente para mostrar contenido
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
    
    console.log('✅ Datos básicos aplicados al tour');
  }

  private loadAdditionalData(id: number, cmsTourData: CMSTourData[]): void {
    const cmsTour: CMSTourData | null = Array.isArray(cmsTourData) && cmsTourData.length > 0 ? cmsTourData[0] : null;
    
    // ✅ OPTIMIZACION 4: Cargar datos adicionales en paralelo sin bloquear la UI
    forkJoin([
      // Ubicaciones del tour
      this.tourLocationService.getAll().pipe(
        map(allLocations => allLocations.filter(location => location.tourId === id)),
        catchError(error => {
          console.error('❌ Error loading tour locations:', error);
          return of([]);
        })
      ) as Observable<ITourLocationResponse[]>,
      
      // Tipos de ubicaciones de tour  
      this.tourLocationTypeService.getAll().pipe(
        catchError(error => {
          console.error('❌ Error loading tour location types:', error);
          return of([]);
        })
      ) as Observable<ITourLocationTypeResponse[]>,
      
      // Todas las ubicaciones
      this.locationNetService.getLocations().pipe(
        catchError(error => {
          console.error('❌ Error loading locations:', error);
          return of([]);
        })
      ) as Observable<Location[]>
    ]).pipe(
      switchMap(([tourLocations, locationTypes, allLocations]) => {
        // Procesar ubicaciones
        this.processLocationsWithDetails(tourLocations, locationTypes, allLocations);
        
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
      
      console.log('📊 Datos adicionales cargados:', { creator });
      
      // ✅ Actualizar tour con datos completos
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
      
      console.log('✅ Tour completamente cargado:', this.tour);
    });
  }

  /**
   * ✅ OPTIMIZACION 5: Procesar ubicaciones de forma más eficiente
   */
  private processLocationsWithDetails(
    tourLocations: ITourLocationResponse[],
    locationTypes: ITourLocationTypeResponse[],
    allLocations: Location[]
  ): void {
    
    // Resetear arrays
    this.cities = [];
    this.countries = [];
    this.tags = [];
    this.mapLocations = [];
    this.headerLocations = [];
    this.processedLocations = [];
    
    // ✅ OPTIMIZACION: Usar Map para búsquedas O(1) en lugar de O(n)
    const locationTypesMap = new Map<number, ITourLocationTypeResponse>();
    locationTypes.forEach(type => {
      locationTypesMap.set(type.id, type);
    });
    
    const locationsMap = new Map<number, Location>();
    allLocations.forEach(location => {
      locationsMap.set(location.id, location);
    });
    
    // Procesar ubicaciones
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
    
    // ✅ OPTIMIZACION: Ordenar una sola vez al final
    this.mapLocations = mapLocationsList
      .sort((a, b) => a.order - b.order)
      .map(item => item.name);
      
    this.headerLocations = headerLocationsList
      .sort((a, b) => a.order - b.order)
      .map(item => item.name);
    
    console.log('📍 Ubicaciones procesadas:', {
      mapLocations: this.mapLocations,
      headerLocations: this.headerLocations,
      cities: this.cities
    });
  }

  sanitizeHtml(html: string = ''): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  get destinationItems(): MenuItem[] {
    return this.tour?.cities?.map((city: string) => ({
      label: city,
    })) || [];
  }

  get breadcrumbItems(): MenuItem[] {
    return [
      {
        label: this.tour?.continent,
        routerLink: ['/tours'],
        queryParams: {
          destination: typeof this.tour?.continent === 'string' 
            ? this.tour.continent.trim() 
            : this.tour?.continent || ''
        }
      },
      {
        label: this.tour?.country,
        routerLink: ['/tours'],
        queryParams: {
          destination: typeof this.tour?.country === 'string' 
            ? this.tour.country.trim() 
            : this.tour?.country || ''
        }
      },
      { label: this.tour?.name || 'Tour Details' }
    ];
  }
}