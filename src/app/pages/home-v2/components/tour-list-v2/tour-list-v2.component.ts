import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  catchError,
  Observable,
  of,
  Subject,
  takeUntil,
  map,
  forkJoin,
  switchMap,
} from 'rxjs';

// Importar los servicios de configuración del home
import {
  HomeSectionConfigurationService,
} from '../../../../core/services/home/home-section-configuration.service';
import {
  HomeSectionTourFilterService,
  IHomeSectionTourFilterResponse,
} from '../../../../core/services/home/home-section-tour-filter.service';

// Importar servicios para filtros por tag y ubicación
import { TourTagService } from '../../../../core/services/tag/tour-tag.service';
import { TourLocationService } from '../../../../core/services/tour/tour-location.service';

@Component({
  selector: 'app-tour-list-v2',
  standalone: false,
  templateUrl: './tour-list-v2.component.html',
  styleUrls: ['./tour-list-v2.component.scss'],
})
export class TourListV2Component implements OnInit, OnDestroy {
  @Input() configurationId?: number; // ID de la configuración específica (opcional)
  @Input() sectionDisplayOrder?: number; // Orden de visualización de la sección (opcional)
  @Input() sectionType?: number; // Tipo de sección (3 = TOUR_GRID, 5 = MIXED_SECTION)

  tourIds: number[] = [];
  title: string = '';
  description: string = '';
  showMonthTags: boolean = false;
  maxToursToShow: number = 6;
  viewMoreButton?: {
    text: string;
    url: string;
  };

  private destroy$ = new Subject<void>();

  constructor(
    private readonly router: Router,
    private readonly homeSectionConfigurationService: HomeSectionConfigurationService,
    private readonly homeSectionTourFilterService: HomeSectionTourFilterService,
    private readonly tourTagService: TourTagService,
    private readonly tourLocationService: TourLocationService
  ) {}

  ngOnInit(): void {
    this.loadTourList();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadTourList(): void {
    // Si se proporciona un configurationId específico, úsalo
    if (this.configurationId) {
      this.loadSpecificConfiguration(this.configurationId);
      return;
    }

    // Determinar el tipo de sección a cargar
    const sectionType = this.sectionType || 3; // Por defecto TOUR_GRID (ID: 3)

    // Cargar configuraciones según el tipo de sección
    let configObservable;
    if (sectionType === 3) {
      configObservable =
        this.homeSectionConfigurationService.getTourGridConfigurations();
    } else {
      configObservable = this.homeSectionConfigurationService.getBySectionType(
        sectionType,
        true
      );
    }

    configObservable.pipe(takeUntil(this.destroy$)).subscribe({
      next: (configurations) => {
        if (configurations.length > 0) {
          // Si se especifica un orden de visualización, buscar esa configuración
          let targetConfig = configurations[0];

          if (this.sectionDisplayOrder !== undefined) {
            const foundConfig = configurations.find(
              (c) => c.displayOrder === this.sectionDisplayOrder
            );
            if (foundConfig) {
              targetConfig = foundConfig;
            } else {
              console.warn(
                '⚠️ No se encontró configuración con displayOrder:',
                this.sectionDisplayOrder
              );
            }
          }

          this.loadSpecificConfiguration(targetConfig.id);
        } else {
          console.warn(
            '⚠️ TourListV2 - No configurations found for sectionType:',
            sectionType
          );
          console.warn(
            '⚠️ Esto puede indicar que no hay configuraciones activas para esta sección'
          );
        }
      },
      error: (error) => {
        console.error(
          '❌ Error loading TOUR_GRID configurations (ID: 3):',
          error
        );
        console.error('❌ Error completo:', error);
      },
    });
  }

  private loadSpecificConfiguration(configId: number): void {
    // Cargar la configuración específica
    this.homeSectionConfigurationService
      .getById(configId)
      .pipe(
        switchMap((configuration) => {
          // Establecer datos de la configuración
          this.title = configuration.title || '';
          this.description = configuration.content || '';
          this.showMonthTags = configuration.showMonthTags || false;
          this.maxToursToShow = configuration.maxToursToShow || 6;

          // Cargar filtros de tours para esta configuración
          return this.homeSectionTourFilterService.getByConfigurationOrdered(
            configId,
            true
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (filters) => {
          if (filters.length > 0) {
            this.loadTourIdsFromFilters(filters);
          } else {
            console.warn(
              '⚠️ No se encontraron filtros para la configuración ID:',
              configId
            );
            this.tourIds = [];
          }
        },
        error: (error) => {
          console.error('❌ Error loading configuration or filters:', error);
          console.error('❌ Error completo:', error);
          this.tourIds = [];
        },
      });
  }

  private loadTourIdsFromFilters(
    filters: IHomeSectionTourFilterResponse[]
  ): void {
    if (filters.length === 0) {
      console.warn('⚠️ No hay filtros para procesar');
      this.tourIds = [];
      return;
    }

    // Configurar el botón "Ver más" del primer filtro
    const primaryFilter = filters[0];

    if (primaryFilter.viewMoreButtonText && primaryFilter.viewMoreButtonUrl) {
      this.viewMoreButton = {
        text: primaryFilter.viewMoreButtonText,
        url: primaryFilter.viewMoreButtonUrl,
      };
    }

    // Recopilar todos los IDs de tours de todos los filtros
    this.loadTourIdsFromAllFilters(filters);
  }

  /**
   * Procesa todos los filtros y combina los IDs de tours de cada uno
   * @param filters Array de filtros a procesar
   */
  private loadTourIdsFromAllFilters(
    filters: IHomeSectionTourFilterResponse[]
  ): void {
    // Crear observables para cada filtro
    const filterObservables = filters.map((filter, index) =>
      this.getTourIdsFromFilter(filter).pipe(
        map((tourIds) => {
          return tourIds;
        })
      )
    );

    // Combinar todos los observables usando forkJoin
    forkJoin(filterObservables)
      .pipe(
        takeUntil(this.destroy$),
        map((tourIdArrays: number[][]) => {
          // Combinar todos los arrays de IDs y eliminar duplicados
          const allTourIds = tourIdArrays.flat();
          const uniqueTourIds = [...new Set(allTourIds)];

          return uniqueTourIds;
        }),
        catchError((error) => {
          console.error('❌ Error loading tour IDs from filters:', error);
          return of([]);
        })
      )
      .subscribe((tourIds: number[]) => {
        this.tourIds = tourIds;
      });
  }

  /**
   * Obtiene los IDs de tours de un filtro específico
   * @param filter Filtro a procesar
   * @returns Observable con array de IDs de tours
   */
  private getTourIdsFromFilter(
    filter: IHomeSectionTourFilterResponse
  ): Observable<number[]> {
    switch (filter.filterType) {
      case 'tag':
        return this.tourTagService.getToursByTags([filter.tagId!]).pipe(
          map((tourIds) => {
            return tourIds;
          }),
          catchError((error) => {
            console.error(
              `❌ Error loading tours by tag ${filter.tagId}:`,
              error
            );
            return of([]);
          })
        );

      case 'location':
        return this.tourLocationService
          .getToursByLocations([filter.locationId!])
          .pipe(
            map((tourIds) => {
              return tourIds;
            }),
            catchError((error) => {
              console.error(
                `❌ Error loading tours by location ${filter.locationId}:`,
                error
              );
              return of([]);
            })
          );

      case 'specific_tours':
        try {
          const tourIds =
            this.homeSectionTourFilterService.parseSpecificTourIds(
              filter.specificTourIds!
            );
          return of(tourIds);
        } catch (error) {
          console.error('❌ Error parsing specific tour IDs:', error);
          return of([]);
        }

      default:
        console.warn(`⚠️ Unknown filter type: ${filter.filterType}`);
        return of([]);
    }
  }

  onViewMore(): void {
    if (this.viewMoreButton?.url) {
      this.router.navigate([this.viewMoreButton.url]);
    }
  }
}
