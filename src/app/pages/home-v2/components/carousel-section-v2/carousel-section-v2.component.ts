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
import { CAROUSEL_CONFIG } from '../../../../shared/constants/carousel.constants';

// Servicios de Home únicamente
import {
  HomeSectionConfigurationService,
  IHomeSectionConfigurationResponse,
} from '../../../../core/services/home/home-section-configuration.service';
import {
  HomeSectionContentService,
  IHomeSectionContentResponse,
} from '../../../../core/services/home/home-section-content.service';
import {
  HomeSectionCardService,
  IHomeSectionCardResponse,
} from '../../../../core/services/home/home-section-card.service';

// Interfaces locales simples (sin modelos externos)
interface ResponsiveOption {
  breakpoint: string;
  numVisible: number;
  numScroll: number;
}

interface CarouselCard {
  id: number;
  title: string;
  description: string;
  image: {
    url: string;
    alt: string;
  };
  buttonText?: string;
  link?: string;
}

@Component({
  selector: 'app-carousel-section-v2',
  standalone: false,
  templateUrl: './carousel-section-v2.component.html',
  styleUrls: ['./carousel-section-v2.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarouselSectionV2Component implements OnInit, OnDestroy {
  @Input() configurationId?: number; // ID específico de configuración
  @Input() sectionDisplayOrder?: number; // Orden de visualización
  @Input() sectionType: number = 5; // Por defecto MIXED_SECTION (5), también puede ser FULLSCREEN_CARDS (4)

  protected carouselConfig = CAROUSEL_CONFIG;
  protected cards: CarouselCard[] = [];
  protected textContent = '';
  protected title = '';
  protected isActive = false;

  private destroy$ = new Subject<void>();

  protected readonly responsiveOptions: ResponsiveOption[] = [
    { breakpoint: '1024px', numVisible: 3, numScroll: 1 },
    { breakpoint: '768px', numVisible: 2, numScroll: 1 },
    { breakpoint: '560px', numVisible: 1, numScroll: 1 },
  ];

  constructor(
    private readonly sanitizer: DomSanitizer,
    private readonly router: Router,
    private readonly homeSectionConfigurationService: HomeSectionConfigurationService,
    private readonly homeSectionContentService: HomeSectionContentService,
    private readonly homeSectionCardService: HomeSectionCardService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadCarouselSection();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  protected onClick(link: string): void {
    this.navigate(link);
  }

  private loadCarouselSection(): void {
    console.log('🔍 CarouselSectionV2 - loadCarouselSection called', {
      configurationId: this.configurationId,
      sectionType: this.sectionType,
      sectionDisplayOrder: this.sectionDisplayOrder,
    });

    // Si se proporciona un configurationId específico, úsalo
    if (this.configurationId) {
      console.log(
        '🔍 CarouselSectionV2 - Using specific configurationId:',
        this.configurationId
      );
      this.loadSpecificConfiguration(this.configurationId);
      return;
    }

    // Si no, cargar la primera configuración activa del tipo de sección especificado
    console.log(
      '🔍 CarouselSectionV2 - Loading configurations by section type:',
      this.sectionType
    );
    this.homeSectionConfigurationService
      .getBySectionType(this.sectionType, true)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (configurations) => {
          console.log(
            '🔍 CarouselSectionV2 - Configurations received:',
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
              '🔍 CarouselSectionV2 - Target config selected:',
              targetConfig
            );
            this.loadSpecificConfiguration(targetConfig.id);
          } else {
            console.warn(
              '⚠️ CarouselSectionV2 - No configurations found for section type:',
              this.sectionType
            );
          }
        },
        error: (error) => {
          console.error(
            '❌ CarouselSectionV2 - Error loading carousel configurations:',
            error
          );
        },
      });
  }

  private loadSpecificConfiguration(configId: number): void {
    console.log(
      '🔍 CarouselSectionV2 - Loading specific configuration:',
      configId
    );

    // Cargar la configuración específica
    this.homeSectionConfigurationService
      .getById(configId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (configuration) => {
          console.log(
            '🔍 CarouselSectionV2 - Configuration loaded:',
            configuration
          );

          // Establecer datos de la configuración
          this.title = configuration.title || '';
          this.isActive = configuration.isActive;

          console.log('🔍 CarouselSectionV2 - Configuration state:', {
            title: this.title,
            isActive: this.isActive,
          });

          // Forzar detección de cambios
          this.cdr.markForCheck();

          if (this.isActive) {
            // Cargar contenido de texto
            this.loadSectionContent(configId);
            // Cargar cards para el carrusel
            this.loadSectionCards(configId);
          } else {
            console.warn(
              '⚠️ CarouselSectionV2 - Configuration is not active:',
              configId
            );
          }
        },
        error: (error) => {
          console.error(
            '❌ CarouselSectionV2 - Error loading configuration:',
            error
          );
        },
      });
  }

  private loadSectionContent(configId: number): void {
    console.log(
      '🔍 CarouselSectionV2 - Loading section content for config:',
      configId
    );

    this.homeSectionContentService
      .getByConfigurationOrdered(configId, true)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (contents) => {
          console.log(
            '🔍 CarouselSectionV2 - Section content received:',
            contents
          );

          // Buscar contenido de texto para la descripción
          const textContent = contents.find(
            (content) => content.contentType === 'text'
          );
          if (textContent) {
            this.textContent = textContent.textContent || '';
            console.log(
              '🔍 CarouselSectionV2 - Text content set:',
              this.textContent
            );
            // Forzar detección de cambios
            this.cdr.markForCheck();
          } else {
            console.log('🔍 CarouselSectionV2 - No text content found');
          }
        },
        error: (error) => {
          console.error(
            '❌ CarouselSectionV2 - Error loading section content:',
            error
          );
        },
      });
  }

  private loadSectionCards(configId: number): void {
    console.log(
      '🔍 CarouselSectionV2 - Loading section cards for config:',
      configId
    );

    this.homeSectionCardService
      .getByConfigurationOrdered(configId, true)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (cards) => {
          console.log('🔍 CarouselSectionV2 - Section cards received:', cards);
          this.cards = this.transformCardsToCarouselFormat(cards);
          console.log('🔍 CarouselSectionV2 - Cards transformed:', this.cards);
          // Forzar detección de cambios
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error(
            '❌ CarouselSectionV2 - Error loading section cards:',
            error
          );
          this.cards = [];
        },
      });
  }

  private transformCardsToCarouselFormat(
    homeCards: IHomeSectionCardResponse[]
  ): CarouselCard[] {
    return homeCards.map((card, index) => ({
      id: card.id,
      title: card.title || '',
      description: card.content || '',
      image: {
        url: card.imageUrl || '',
        alt: card.imageAlt || `Image ${index + 1}`,
      },
      buttonText: card.buttonText || undefined,
      link: card.linkUrl || '',
    }));
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
