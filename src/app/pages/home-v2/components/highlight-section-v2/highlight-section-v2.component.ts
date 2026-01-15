import {
  Component,
  OnInit,
  Input,
  ChangeDetectionStrategy,
  OnDestroy,
  ChangeDetectorRef,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { HomeSectionId } from '../../../../shared/constants/home-section-codes.constants';

// Servicios de Home
import {
  HomeSectionConfigurationService,
} from '../../../../core/services/home/home-section-configuration.service';
import {
  HomeSectionImageService,
  IHomeSectionImageResponse,
} from '../../../../core/services/home/home-section-image.service';

// Interfaces locales
interface HighlightImage {
  id: number;
  imageUrl: string;
  imageAlt: string;
  title?: string;
  description?: string;
  linkUrl?: string;
}

@Component({
  selector: 'app-highlight-section-v2',
  standalone: false,
  templateUrl: './highlight-section-v2.component.html',
  styleUrls: ['./highlight-section-v2.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HighlightSectionV2Component implements OnInit, OnDestroy {
  @Input() configurationId?: number; // ID específico de configuración
  @Input() sectionDisplayOrder?: number; // Orden de visualización
  @Input() sectionType: number = HomeSectionId.FEATURED_SECTION; // Por defecto FEATURED_SECTION

  protected image: HighlightImage | null = null;
  protected isActive = false;

  private destroy$ = new Subject<void>();
  private abortController = new AbortController();

  constructor(
    private readonly sanitizer: DomSanitizer,
    private readonly router: Router,
    private readonly homeSectionConfigurationService: HomeSectionConfigurationService,
    private readonly homeSectionImageService: HomeSectionImageService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  /**
   * Inicializa el componente y carga la sección destacada.
   */
  ngOnInit(): void {
    this.loadHighlightSection();
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

  protected sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  protected onClick(): void {
    if (this.image?.linkUrl) {
      this.navigate(this.image.linkUrl);
    }
  }

  /**
   * Carga la sección destacada.
   * Si se proporciona un configurationId, lo usa directamente.
   * Si no, busca configuraciones por tipo de sección y displayOrder.
   * @private
   */
  private loadHighlightSection(): void {
    // Si se proporciona un configurationId específico, úsalo
    if (this.configurationId) {
      this.loadSpecificConfiguration(this.configurationId);
      return;
    }

    // Si no, cargar la primera configuración activa del tipo de sección especificado
    this.homeSectionConfigurationService
      .getBySectionType(this.sectionType, true, this.abortController.signal)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
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
              }
            }
            this.loadSpecificConfiguration(targetConfig.id);
          } else {
            console.warn(
              'HighlightSectionV2 - No configurations found for section type:',
              this.sectionType
            );
          }
        },
        error: (error) => {
          console.error(
            'HighlightSectionV2 - Error loading highlight configurations:',
            error
          );
        },
      });
  }

  /**
   * Carga una configuración específica por ID.
   * Establece el estado activo y carga la imagen si está activa.
   * @param configId - ID de la configuración a cargar
   * @private
   */
  private loadSpecificConfiguration(configId: number): void {
    // Cargar la configuración específica
    this.homeSectionConfigurationService
      .getById(configId, this.abortController.signal)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (configuration) => {
          // Establecer datos de la configuración
          this.isActive = configuration.isActive;

          // Forzar detección de cambios
          this.cdr.markForCheck();

          if (this.isActive) {
            // Cargar imagen destacada (que incluye título y descripción)
            this.loadSectionImage(configId);
          } else {
            console.warn(
              'HighlightSectionV2 - Configuration is not active:',
              configId
            );
          }
        },
        error: (error) => {
          console.error(
            'HighlightSectionV2 - Error loading configuration:',
            error
          );
        },
      });
  }

  /**
   * Carga la imagen destacada de la sección.
   * Ordena las imágenes por displayOrder y selecciona la primera.
   * @param configId - ID de la configuración
   * @private
   */
  private loadSectionImage(configId: number): void {
    this.homeSectionImageService
      .getByConfigurationOrdered(configId, true, this.abortController.signal)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (images) => {
          if (images.length > 0) {
            // Crear copia antes de ordenar para evitar mutación in-place
            // Tomar la primera imagen (o la que tenga displayOrder más bajo)
            const sortedImages = [...images].sort(
              (a, b) => a.displayOrder - b.displayOrder
            );
            const selectedImage = sortedImages[0];

            this.image = this.transformImageToHighlightFormat(selectedImage);
            // Forzar detección de cambios
            this.cdr.markForCheck();
          }
        },
        error: (error) => {
          console.error(
            'HighlightSectionV2 - Error loading section image:',
            error
          );
          this.image = null;
        },
      });
  }

  /**
   * Transforma una imagen del backend al formato requerido por el componente.
   * @param homeImage - Imagen del backend
   * @returns Imagen transformada al formato HighlightImage
   * @private
   */
  private transformImageToHighlightFormat(
    homeImage: IHomeSectionImageResponse
  ): HighlightImage {
    return {
      id: homeImage.id,
      imageUrl: homeImage.imageUrl || '',
      imageAlt: homeImage.altText || '',
      title: homeImage.title || undefined,
      description: homeImage.description || undefined,
      linkUrl: homeImage.linkUrl || undefined,
    };
  }

  /**
   * Navega a una URL, manejando URLs externas e internas.
   * @param url - URL a la que navegar
   * @private
   */
  private navigate(url: string): void {
    if (!url) return;

    this.isExternalUrl(url)
      ? (window.location.href = url)
      : this.router.navigate([url]);
  }

  /**
   * Verifica si una URL es externa (http/https).
   * @param url - URL a verificar
   * @returns true si la URL es externa, false en caso contrario
   * @private
   */
  private isExternalUrl(url: string): boolean {
    return /^https?:\/\//.test(url);
  }
}
