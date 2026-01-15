import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { of, Subject } from 'rxjs';
import { switchMap, map, catchError, takeUntil } from 'rxjs/operators';
import {
  HomeSectionImageService,
  IHomeSectionImageResponse,
} from '../../../../core/services/home/home-section-image.service';
import {
  HomeSectionConfigurationService,
} from '../../../../core/services/home/home-section-configuration.service';
import { CAROUSEL_CONFIG } from '../../../../shared/constants/carousel.constants';

@Component({
  selector: 'app-partners-section-v2',
  standalone: false,
  templateUrl: './partners-section-v2.component.html',
  styleUrl: './partners-section-v2.component.scss',
})
export class PartnersSectionV2Component implements OnInit, OnDestroy {
  @Input() configurationId?: number; // ID específico de configuración

  partners: IHomeSectionImageResponse[] = [];
  private abortController = new AbortController();
  private destroy$ = new Subject<void>();
  numVisible = 4;
  title = 'Colaboradores'; // Valor por defecto
  responsiveOptions = [
    {
      breakpoint: '1800px',
      numVisible: 4,
      numScroll: 1,
    },
    {
      breakpoint: '1300px',
      numVisible: 3,
      numScroll: 1,
    },
    {
      breakpoint: '1000px',
      numVisible: 2,
      numScroll: 1,
    },
    {
      breakpoint: '700px',
      numVisible: 1,
      numScroll: 1,
    },
  ];
  protected carouselConfig = CAROUSEL_CONFIG;

  constructor(
    private homeSectionImageService: HomeSectionImageService,
    private homeSectionConfigurationService: HomeSectionConfigurationService
  ) {}

  /**
   * Inicializa el componente y carga los partners.
   */
  ngOnInit(): void {
    this.loadPartners();
  }

  /**
   * Limpia los recursos del componente al destruirlo.
   * Cancela las peticiones HTTP pendientes y completa las suscripciones.
   */
  ngOnDestroy(): void {
    this.abortController.abort();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carga los partners (colaboradores).
   * Primero carga la configuración para obtener el título, luego carga las imágenes.
   * Si no hay configurationId, muestra un warning y no carga nada.
   * @private
   */
  private loadPartners(): void {
    // Si no se proporciona configurationId, mostrar warning y no cargar nada
    if (!this.configurationId) {
      console.warn('PartnersSectionV2: configurationId is required');
      this.partners = [];
      return;
    }

    // Cargar la configuración para obtener el título, luego cargar las imágenes
    this.homeSectionConfigurationService
      .getById(this.configurationId, this.abortController.signal)
      .pipe(
        switchMap((configuration) => {
          // Establecer el título desde la configuración
          this.title = configuration.title || 'Colaboradores';

          // Cargar las imágenes de la configuración
          return this.loadPartnersImagesObservable();
        }),
        catchError((error) => {
          console.error('PartnersSectionV2 - Error loading configuration:', error);
          // Continuar con la carga de imágenes aunque falle la configuración
          return this.loadPartnersImagesObservable();
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (images) => {
          this.partners = images;
        },
        error: (error) => {
          console.error('PartnersSectionV2 - Error loading partners:', error);
          this.partners = [];
        },
      });
  }

  /**
   * Carga las imágenes de partners como Observable.
   * Ordena por displayOrder y limita a 8 partners.
   * @returns Observable con array de imágenes ordenadas (máximo 8)
   * @private
   */
  private loadPartnersImagesObservable() {
    if (!this.configurationId) {
      return of([]);
    }

    // Obtener imágenes activas de la configuración específica
    return this.homeSectionImageService
      .getByConfiguration(this.configurationId, true, this.abortController.signal)
      .pipe(
        map((images: IHomeSectionImageResponse[]) => {
          // Crear copia antes de ordenar para evitar mutación in-place
          const sortedImages = [...images].sort(
            (a, b) => a.displayOrder - b.displayOrder
          );
          // Limitar a 8 partners
          return sortedImages.slice(0, 8);
        }),
        catchError((error) => {
          console.error('PartnersSectionV2 - Error loading partners images:', error);
          return of([]);
        })
      );
  }
}
