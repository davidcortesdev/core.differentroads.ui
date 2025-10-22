import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TourService } from '../../../../core/services/tour/tour.service';
import { CMSTourService } from '../../../../core/services/cms/cms-tour.service';
import { CMSCreatorService } from '../../../../core/services/cms/cms-creator.service';
import { TourLocationService, ITourLocationResponse } from '../../../../core/services/tour/tour-location.service';
import { LocationNetService, Location } from '../../../../core/services/locations/locationNet.service';
import { TagService, ITagResponse } from '../../../../core/services/tag/tag.service';
import { TourTagService, ITourTagResponse } from '../../../../core/services/tag/tour-tag.service';
import { TourTagRelationTypeService } from '../../../../core/services/tag/tour-tag-relation-type.service';
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
  @Input() preview: boolean = false;
  
  loading = true;
  
  // Propiedades para manejar las ubicaciones
  tourLocations: ITourLocationResponse[] = [];
  processedLocations: ProcessedLocation[] = [];
  cities: string[] = [];
  countries: string[] = [];
  tags: string[] = [];
  mapLocations: string[] = [];
  headerLocations: string[] = [];
  
  // Propiedades para manejar los tags
  tourTags: ITourTagResponse[] = [];
  visibleTags: ITagResponse[] = [];
  
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
    private tourService: TourService,
    private cmsTourService: CMSTourService,
    private cmsCreatorService: CMSCreatorService,
    private tourLocationService: TourLocationService,
    private locationNetService: LocationNetService,
    private tagService: TagService,
    private tourTagService: TourTagService,
    private tourTagRelationTypeService: TourTagRelationTypeService
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
      this.tourService.getTourById(id, !this.preview).pipe(
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
      console.log('tour', tourData);
      
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
    
    // ✅ OPTIMIZACIÓN MÁXIMA: Cargar ubicaciones y tags en paralelo
    forkJoin([
      // Cargar ubicaciones (existente)
      this.tourLocationService.getByTourAndType(id, "COUNTRY").pipe(
        map(response => Array.isArray(response) ? response : (response ? [response] : [])),
        catchError(error => {
          console.warn('⚠️ No se encontraron ubicaciones COUNTRY:', error);
          return of([]);
        })
      ),
      this.tourLocationService.getByTourAndType(id, "HEADER").pipe(
        map(response => Array.isArray(response) ? response : (response ? [response] : [])),
        catchError(error => {
          console.warn('⚠️ No se encontraron ubicaciones HEADER:', error);
          return of([]);
        })
      ),
      this.tourLocationService.getByTourAndType(id, "CONTINENT").pipe(
        map(response => Array.isArray(response) ? response : (response ? [response] : [])),
        catchError(error => {
          console.warn('⚠️ No se encontraron ubicaciones CONTINENT:', error);
          return of([]);
        })
      ),
      
      // ✅ NUEVO: Cargar tipos de relación visibles para la web
      this.tourTagRelationTypeService.getAll({ isVisible: true }).pipe(
        catchError(error => {
          console.error('❌ Error loading visible tag relation types:', error);
          return of([]);
        })
      )
    ]).pipe(
      switchMap(([countryLocations, headerLocations, continentLocations, visibleRelationTypes]) => {        
        // Procesar ubicaciones (código existente)
        const validCountryLocations = countryLocations.filter(loc => loc && loc.id && loc.locationId);
        const validHeaderLocations = headerLocations.filter(loc => loc && loc.id && loc.locationId);
        const validContinentLocations = continentLocations.filter(loc => loc && loc.id && loc.locationId);

        const allTourLocations = [
          ...validCountryLocations,
          ...validHeaderLocations,
          ...validContinentLocations
        ];

        const locationIds = [...new Set(allTourLocations.map(tl => tl.locationId))];
        
        // ✅ NUEVO: Obtener tags del tour basados en tipos de relación visibles
        const visibleRelationTypeIds = visibleRelationTypes.map(rt => rt.id);
        const tagObservables: Observable<any>[] = [];
        
        // Cargar ubicaciones
        if (locationIds.length > 0) {
          tagObservables.push(
            this.locationNetService.getLocationsByIds(locationIds).pipe(
              catchError(error => {
                console.error('❌ Error loading specific locations:', error);
                return of([]);
              })
            )
          );
        } else {
          tagObservables.push(of([]));
        }
        
        // Cargar tags para cada tipo de relación visible
        visibleRelationTypeIds.forEach(relationTypeId => {
          tagObservables.push(
            this.tourTagService.getAll({ tourId: [id], tourTagRelationTypeId: relationTypeId }).pipe(
              catchError(error => {
                console.warn(`⚠️ No se encontraron tags para relationTypeId ${relationTypeId}:`, error);
                return of([]);
              })
            )
          );
        });

        return forkJoin(tagObservables).pipe(
          map(results => {
            const locations = results[0] || [];
            const allTourTagsArrays = results.slice(1);
            const allTourTags = allTourTagsArrays.flat();
            
            return {
              countryLocations: validCountryLocations,
              headerLocations: validHeaderLocations,
              continentLocations: validContinentLocations,
              locations,
              tourTags: allTourTags
            };
          })
        );
      }),
      switchMap(({ countryLocations, headerLocations, continentLocations, locations, tourTags }) => {
        // Procesar ubicaciones con los datos optimizados
        this.processLocationsOptimized(countryLocations, headerLocations, continentLocations, locations);
        
        // ✅ NUEVO: Procesar tags
        this.tourTags = tourTags;
        
        // Obtener detalles de los tags si existen
        if (tourTags.length > 0) {
          const tagIds = [...new Set(tourTags.map(tt => tt.tagId))];
          
          // ✅ OPTIMIZADO: Cargar solo los tags específicos del tour
          const tagDetailObservables = tagIds.map(tagId => 
            this.tagService.getById(tagId).pipe(
              catchError(error => {
                console.warn(`⚠️ Error loading tag ${tagId}:`, error);
                return of(null);
              })
            )
          );
          
          return forkJoin([
            // Cargar creator si existe
            this.loadCreator(cmsTour?.creatorId),
            // Cargar detalles específicos de los tags del tour
            forkJoin(tagDetailObservables).pipe(
              map(tagDetails => tagDetails.filter(tag => tag !== null && tag.isActive)),
              catchError(error => {
                console.error('❌ Error loading tag details:', error);
                return of([]);
              })
            )
          ]);
        } else {
          return forkJoin([
            this.loadCreator(cmsTour?.creatorId),
            of([])
          ]);
        }
      })
    ).subscribe(([creator, tagDetails]: [CreatorData | null, (ITagResponse | null)[]]) => {
      // Procesar tags visibles - filtrar nulls y convertir a ITagResponse[]
      const validTags = tagDetails.filter((tag): tag is ITagResponse => tag !== null);
      this.visibleTags = validTags;
      this.tags = validTags.map(tag => tag.name);
      
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
        // ✅ NUEVO: Usar tags reales en lugar de vtags
        vtags: this.tags
      };
    });
  }

  private loadCreator(creatorId?: number): Observable<CreatorData | null> {
    if (creatorId) {
      return (this.cmsCreatorService.getById(creatorId) as Observable<CreatorData>).pipe(
        catchError(error => {
          console.error('❌ Error loading creator data:', error);
          return of(null);
        })
      );
    }
    return of(null);
  }

  /**
   * ✅ OPTIMIZACIÓN: Procesar ubicaciones específicas usando datos ya filtrados
   */
  private processLocationsOptimized(
    countryLocations: ITourLocationResponse[],
    headerLocations: ITourLocationResponse[],
    continentLocations: ITourLocationResponse[],
    specificLocations: Location[]
  ): void {
    
    // Resetear arrays
    this.cities = [];
    this.countries = [];
    this.mapLocations = [];
    this.headerLocations = [];
    this.processedLocations = [];
    
    // Crear map de ubicaciones para búsqueda O(1)
    const locationsMap = new Map<number, Location>();
    specificLocations.forEach(location => {
      locationsMap.set(location.id, location);
    });

    // Procesar países
    const countries = countryLocations
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map(tl => locationsMap.get(tl.locationId)?.name)
      .filter(name => name) as string[];

    // Procesar ubicaciones header (ciudades)
    const headerLocationsList = headerLocations
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map(tl => locationsMap.get(tl.locationId)?.name)
      .filter(name => name) as string[];

    // Procesar continentes
    const continents = continentLocations
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map(tl => locationsMap.get(tl.locationId)?.name)
      .filter(name => name) as string[];

    // Asignar resultados
    this.countries = countries;
    this.headerLocations = headerLocationsList;
    this.cities = headerLocationsList; // Fallback
    
    // Asignar país y continente al tour
    this.tour.country = countries.join(', ');
    this.tour.continent = continents.join(', ');

    // Crear processed locations para compatibilidad
    const allLocations = [
      ...countryLocations.map(tl => ({ ...tl, type: 'COUNTRY' })),
      ...headerLocations.map(tl => ({ ...tl, type: 'HEADER' })),
      ...continentLocations.map(tl => ({ ...tl, type: 'CONTINENT' }))
    ];

    allLocations.forEach((tourLocation) => {
      const realLocation = locationsMap.get(tourLocation.locationId);
      
      if (realLocation) {
        const processedLocation: ProcessedLocation = {
          id: tourLocation.id,
          name: realLocation.name,
          type: tourLocation.type,
          typeId: tourLocation.tourLocationTypeId,
          displayOrder: tourLocation.displayOrder,
          isMapLocation: false,
          isHeaderLocation: tourLocation.type === 'HEADER'
        };
        
        this.processedLocations.push(processedLocation);
      }
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


  /**
   * Convierte un texto a formato slug (minúsculas, espacios a guiones, sin acentos)
   * Copiado del header-v2.component.ts para mantener consistencia
   */
  private textToSlug(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD') // Normalizar para separar caracteres base de diacríticos
      .replace(/[\u0300-\u036f]/g, '') // Eliminar diacríticos (acentos)
      .replace(/[^a-z0-9\s-]/g, '') // Eliminar caracteres especiales excepto espacios y guiones
      .replace(/\s+/g, '-') // Reemplazar espacios por guiones
      .replace(/-+/g, '-') // Reemplazar múltiples guiones por uno solo
      .replace(/^-+|-+$/g, ''); // Eliminar guiones al inicio y final
  }

  /**
   * Construye un slug completo para enlaces de destino
   * Formato: /destino/:menuItemSlug para continentes
   * Formato: /destino/:menuItemSlug/:destinationSlug para países
   */
  private buildDestinationSlug(continentName: string, countryName?: string): string {
    const continentSlug = this.textToSlug(continentName);
    
    if (countryName) {
      const countrySlug = this.textToSlug(countryName);
      return `/destino/${continentSlug}/${countrySlug}`;
    }
    
    return `/destino/${continentSlug}`;
  }

  get breadcrumbItems(): MenuItem[] {
    const items: MenuItem[] = [];
    
    if (this.tour?.continent) {
      items.push({
        label: this.tour.continent,
        routerLink: [this.buildDestinationSlug(this.tour.continent)]
      });
    }
    
    if (this.tour?.country) {
      items.push({
        label: this.tour.country,
        routerLink: [this.buildDestinationSlug(this.tour.continent || '', this.tour.country)]
      });
    }
    
    items.push({ label: this.tour?.name || 'Tour Details' });
    
    return items;
  }
}