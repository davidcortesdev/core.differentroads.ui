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

// Servicios de Home
import {
  HomeSectionConfigurationService,
  IHomeSectionConfigurationResponse,
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
  @Input() sectionType: number = 8; // Por defecto FEATURED_SECTION (8)

  protected image: HighlightImage | null = null;
  protected isActive = false;

  private destroy$ = new Subject<void>();

  constructor(
    private readonly sanitizer: DomSanitizer,
    private readonly router: Router,
    private readonly homeSectionConfigurationService: HomeSectionConfigurationService,
    private readonly homeSectionImageService: HomeSectionImageService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadHighlightSection();
  }

  ngOnDestroy(): void {
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

  private loadHighlightSection(): void {
    console.log('🔍 HighlightSectionV2 - loadHighlightSection called', {
      configurationId: this.configurationId,
      sectionType: this.sectionType,
      sectionDisplayOrder: this.sectionDisplayOrder,
    });

    // Si se proporciona un configurationId específico, úsalo
    if (this.configurationId) {
      console.log(
        '🔍 HighlightSectionV2 - Using specific configurationId:',
        this.configurationId
      );
      this.loadSpecificConfiguration(this.configurationId);
      return;
    }

    // Si no, cargar la primera configuración activa del tipo de sección especificado
    console.log(
      '🔍 HighlightSectionV2 - Loading configurations by section type:',
      this.sectionType
    );
    this.homeSectionConfigurationService
      .getBySectionType(this.sectionType, true)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (configurations) => {
          console.log(
            '🔍 HighlightSectionV2 - Configurations received:',
            configurations
          );
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
            console.log(
              '🔍 HighlightSectionV2 - Target config selected:',
              targetConfig
            );
            this.loadSpecificConfiguration(targetConfig.id);
          } else {
            console.warn(
              '⚠️ HighlightSectionV2 - No configurations found for section type:',
              this.sectionType
            );
          }
        },
        error: (error) => {
          console.error(
            '❌ HighlightSectionV2 - Error loading highlight configurations:',
            error
          );
        },
      });
  }

  private loadSpecificConfiguration(configId: number): void {
    console.log(
      '🔍 HighlightSectionV2 - Loading specific configuration:',
      configId
    );

    // Cargar la configuración específica
    this.homeSectionConfigurationService
      .getById(configId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (configuration) => {
          console.log(
            '🔍 HighlightSectionV2 - Configuration loaded:',
            configuration
          );

          // Establecer datos de la configuración
          this.isActive = configuration.isActive;

          console.log('🔍 HighlightSectionV2 - Configuration state:', {
            isActive: this.isActive,
          });

          // Forzar detección de cambios
          this.cdr.markForCheck();

          if (this.isActive) {
            // Cargar imagen destacada (que incluye título y descripción)
            this.loadSectionImage(configId);
          } else {
            console.warn(
              '⚠️ HighlightSectionV2 - Configuration is not active:',
              configId
            );
          }
        },
        error: (error) => {
          console.error(
            '❌ HighlightSectionV2 - Error loading configuration:',
            error
          );
        },
      });
  }

  private loadSectionImage(configId: number): void {
    console.log(
      '🔍 HighlightSectionV2 - Loading section image for config:',
      configId
    );

    this.homeSectionImageService
      .getByConfigurationOrdered(configId, true)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (images) => {
          console.log(
            '🔍 HighlightSectionV2 - Section images received:',
            images
          );

          if (images.length > 0) {
            // Tomar la primera imagen (o la que tenga displayOrder más bajo)
            const sortedImages = images.sort(
              (a, b) => a.displayOrder - b.displayOrder
            );
            const selectedImage = sortedImages[0];

            console.log(
              '🔍 HighlightSectionV2 - Selected image raw data:',
              selectedImage
            );
            console.log(
              '🔍 HighlightSectionV2 - Image description field:',
              selectedImage.description
            );
            console.log(
              '🔍 HighlightSectionV2 - Image title field:',
              selectedImage.title
            );

            this.image = this.transformImageToHighlightFormat(selectedImage);
            console.log(
              '🔍 HighlightSectionV2 - Image transformed:',
              this.image
            );
            // Forzar detección de cambios
            this.cdr.markForCheck();
          } else {
            console.log('🔍 HighlightSectionV2 - No images found');
          }
        },
        error: (error) => {
          console.error(
            '❌ HighlightSectionV2 - Error loading section image:',
            error
          );
          this.image = null;
        },
      });
  }

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

  private navigate(url: string): void {
    if (!url) return;

    this.isExternalUrl(url)
      ? (window.location.href = url)
      : this.router.navigate([url]);
  }

  private isExternalUrl(url: string): boolean {
    return /^https?:\/\//.test(url);
  }
}
