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
} from '../../../../core/services/home/home-section-configuration.service';
import {
  HomeSectionContentService,
} from '../../../../core/services/home/home-section-content.service';
import {
  HomeSectionCardService,
  IHomeSectionCardResponse,
} from '../../../../core/services/home/home-section-card.service';
import {
  HomeSectionThemeService,
} from '../../../../core/services/home/home-section-theme.service';

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
  protected themeCode: string = 'light'; // Por defecto tema LIGHT

  private destroy$ = new Subject<void>();
  private abortController = new AbortController();

  /**
   * Configuración responsive del carousel
   * Los breakpoints se aplican cuando el viewport es menor al valor especificado
   * Orden: de mayor a menor breakpoint
   */
  protected readonly responsiveOptions: ResponsiveOption[] = [
    {
      breakpoint: '1500px',
      numVisible: 2,
      numScroll: 1,
    },
    {
      breakpoint: '1400px',
      numVisible: 2,
      numScroll: 1,
    },
    {
      breakpoint: '1200px',
      numVisible: 3,
      numScroll: 1,
    },
    {
      breakpoint: '930px',
      numVisible: 2,
      numScroll: 1,
    },
    {
      breakpoint: '768px',
      numVisible: 2,
      numScroll: 1,
    },
    {
      breakpoint: '576px',
      numVisible: 1,
      numScroll: 1,
    },
  ];

  constructor(
    private readonly sanitizer: DomSanitizer,
    private readonly router: Router,
    private readonly homeSectionConfigurationService: HomeSectionConfigurationService,
    private readonly homeSectionContentService: HomeSectionContentService,
    private readonly homeSectionCardService: HomeSectionCardService,
    private readonly homeSectionThemeService: HomeSectionThemeService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  /**
   * Inicializa el componente y carga la sección del carousel.
   */
  ngOnInit(): void {
    this.loadCarouselSection();
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

  protected onClick(link: string): void {
    this.navigate(link);
  }

  /**
   * Carga la sección del carousel.
   * Si se proporciona un configurationId, lo usa directamente.
   * Si no, busca configuraciones por tipo de sección y displayOrder.
   * @private
   */
  private loadCarouselSection(): void {
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
              'CarouselSectionV2 - No configurations found for section type:',
              this.sectionType
            );
          }
        },
        error: (error) => {
          console.error(
            'CarouselSectionV2 - Error loading carousel configurations:',
            error
          );
        },
      });
  }

  /**
   * Carga una configuración específica por ID.
   * Establece el título, estado activo, tema y carga contenido y cards si está activa.
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
          this.title = configuration.title || '';
          this.isActive = configuration.isActive;

          // Cargar tema si existe themeId, si no existe se aplica LIGHT por defecto
          if (configuration.themeId) {
            this.loadTheme(configuration.themeId);
          } else {
            // Por defecto aplicar tema LIGHT
            this.themeCode = 'light';
          }

          // Forzar detección de cambios
          this.cdr.markForCheck();

          if (this.isActive) {
            // Cargar contenido de texto
            this.loadSectionContent(configId);
            // Cargar cards para el carrusel
            this.loadSectionCards(configId);
          }
        },
        error: (error) => {
          console.error(
            'CarouselSectionV2 - Error loading configuration:',
            error
          );
        },
      });
  }

  /**
   * Carga el tema de la sección y actualiza themeCode.
   * Si el tema es DARK o LIGHT, lo aplica; de lo contrario usa LIGHT por defecto.
   * @param themeId - ID del tema a cargar
   * @private
   */
  private loadTheme(themeId: number): void {
    this.homeSectionThemeService
      .getById(themeId, this.abortController.signal)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (theme) => {
          // Comparar el code con "DARK" o "LIGHT" en mayúsculas
          if (theme.code === 'DARK') {
            this.themeCode = 'dark';
          } else if (theme.code === 'LIGHT') {
            this.themeCode = 'light';
          } else {
            // Por defecto aplicar tema LIGHT si es null o cualquier otro valor
            this.themeCode = 'light';
          }
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error(
            'CarouselSectionV2 - Error loading theme:',
            error
          );
          // En caso de error, aplicar tema LIGHT por defecto
          this.themeCode = 'light';
          this.cdr.markForCheck();
        },
      });
  }

  /**
   * Carga el contenido de texto de la sección.
   * Busca contenido de tipo 'text' y lo asigna a textContent.
   * @param configId - ID de la configuración
   * @private
   */
  private loadSectionContent(configId: number): void {
    this.homeSectionContentService
      .getByConfigurationOrdered(configId, true, this.abortController.signal)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (contents) => {
          // Buscar contenido de texto para la descripción
          const textContent = contents.find(
            (content) => content.contentType === 'text'
          );
          if (textContent) {
            this.textContent = textContent.textContent || '';
            // Forzar detección de cambios
            this.cdr.markForCheck();
          }
        },
        error: (error) => {
          console.error(
            'CarouselSectionV2 - Error loading section content:',
            error
          );
        },
      });
  }

  /**
   * Carga las cards de la sección y las transforma al formato del carousel.
   * @param configId - ID de la configuración
   * @private
   */
  private loadSectionCards(configId: number): void {
    this.homeSectionCardService
      .getByConfigurationOrdered(configId, true, this.abortController.signal)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (cards) => {
          this.cards = this.transformCardsToCarouselFormat(cards);
          // Forzar detección de cambios
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error(
            'CarouselSectionV2 - Error loading section cards:',
            error
          );
          this.cards = [];
        },
      });
  }

  /**
   * Transforma las cards del backend al formato requerido por el carousel.
   * @param homeCards - Cards del backend
   * @returns Cards transformadas al formato CarouselCard
   * @private
   */
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
