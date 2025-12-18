import { Component, Input, OnDestroy, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import {
  TourService,
  Tour as TourNetTour,
} from '../../../../core/services/tour/tour.service';
import {
  CMSTourService,
  ICMSTourResponse,
} from '../../../../core/services/cms/cms-tour.service';
import {
  catchError,
  Observable,
  of,
  Subject,
  takeUntil,
  map,
  concatMap,
  mergeMap,
  scan,
  forkJoin,
  switchMap,
} from 'rxjs';

import { CAROUSEL_CONFIG } from '../../../../shared/constants/carousel.constants';
import { TourDataV2 } from '../../../../shared/components/tour-card-v2/tour-card-v2.model';

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
import { TagService } from '../../../../core/services/tag/tag.service';
import { TourLocationService } from '../../../../core/services/tour/tour-location.service';
import { LocationNetService, Location } from '../../../../core/services/locations/locationNet.service';
import { ITripTypeResponse, TripTypeService } from '../../../../core/services/trip-type/trip-type.service';

// ✅ NUEVOS SERVICIOS: Para fechas y tags
import {
  DepartureService,
  IDepartureResponse,
} from '../../../../core/services/departure/departure.service';
import {
  ItineraryService,
  IItineraryResponse,
  ItineraryFilters,
} from '../../../../core/services/itinerary/itinerary.service';
import {
  ItineraryDayService,
  IItineraryDayResponse,
} from '../../../../core/services/itinerary/itinerary-day/itinerary-day.service';
import { ReviewsService } from '../../../../core/services/reviews/reviews.service';
import { AnalyticsService } from '../../../../core/services/analytics/analytics.service';
import { TourReviewService } from '../../../../core/services/reviews/tour-review.service';
import { ReviewTypeService } from '../../../../core/services/reviews/review-type.service';

@Component({
  selector: 'app-tour-carrussel-v2',
  standalone: false,
  templateUrl: './tour-carrussel-v2.component.html',
  styleUrls: ['./tour-carrussel-v2.component.scss'],
})
export class TourCarrusselV2Component implements OnInit, OnDestroy, AfterViewInit {
  @Input() configurationId?: number; // ID de la configuración específica (opcional)
  @Input() sectionDisplayOrder?: number; // Orden de visualización de la sección (opcional)

  tours: TourDataV2[] = [];
  title: string = '';
  description: string = '';
  theme: string = 'dark'; // Hardcoded para ver el tema oscuro
  showMonthTags: boolean = false;
  maxToursToShow: number = 6;
  viewMoreButton?: {
    text: string;
    url: string;
  };

  private tripTypesMap: Map<number, ITripTypeResponse> = new Map();
  private generalReviewTypeId: number | null = null;

  // Debug: IDs de tours para mostrar en pantalla
  debugTourIds: number[] = [];

  private destroy$ = new Subject<void>();
  protected carouselConfig = CAROUSEL_CONFIG;

  // Intersection Observer para detectar cuando el carrusel aparece en pantalla
  @ViewChild('tourCarouselContainer', { static: false }) tourCarouselContainer!: ElementRef;
  @ViewChild('carousel', { static: false }) carousel!: any;
  @ViewChild('carouselWrapper', { static: false }) carouselWrapper!: ElementRef;
  private intersectionObserver?: IntersectionObserver;
  private hasTrackedVisibility: boolean = false;

  // Variables para manejar gestos touch y evitar bloqueo de scroll vertical
  private touchStartX: number = 0;
  private touchStartY: number = 0;
  private touchMoveX: number = 0;
  private touchMoveY: number = 0;
  private isVerticalScroll: boolean = false;
  private carouselElement: HTMLElement | null = null;
  private carouselContent: HTMLElement | null = null;
  private itemsContainer: HTMLElement | null = null;
  // Referencias a los handlers para poder removerlos correctamente
  private touchStartHandler: ((event: Event) => void) | null = null;
  private touchMoveHandler: ((event: Event) => void) | null = null;
  private touchEndHandler: ((event: Event) => void) | null = null;
  private touchCancelHandler: ((event: Event) => void) | null = null;

  responsiveOptions = [
    {
      breakpoint: '1600px',
      numVisible: 2,
      numScroll: 1,
    },
    {
      breakpoint: '1024px',
      numVisible: 2,
      numScroll: 1,
    },
    {
      breakpoint: '768px',
      numVisible: 2,
      numScroll: 1,
    },
    {
      breakpoint: '560px',
      numVisible: 1,
      numScroll: 1,
    },
  ];

  constructor(
    private readonly router: Router,
    private readonly tourService: TourService,
    private readonly cmsTourService: CMSTourService,
    private readonly homeSectionConfigurationService: HomeSectionConfigurationService,
    private readonly homeSectionTourFilterService: HomeSectionTourFilterService,
    private readonly tourTagService: TourTagService,
    private readonly tagService: TagService,
    private readonly tourLocationService: TourLocationService,
    private readonly locationService: LocationNetService,
    // ✅ NUEVOS SERVICIOS: Para precios, fechas y tags
    private readonly departureService: DepartureService,
    private readonly itineraryService: ItineraryService,
    private readonly itineraryDayService: ItineraryDayService,
    private readonly reviewsService: ReviewsService,
    private readonly tripTypeService: TripTypeService,
    private readonly analyticsService: AnalyticsService,
    private readonly tourReviewService: TourReviewService,
    private readonly reviewTypeService: ReviewTypeService
  ) { }

  ngOnInit(): void {
    // Cargar trip types y review type GENERAL en paralelo
    forkJoin({
      tripTypes: this.loadTripTypes(),
      reviewType: this.loadGeneralReviewType()
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.loadTourCarousel();
    });
  }

  private loadGeneralReviewType(): Observable<void> {
    return this.reviewTypeService.getByCode('GENERAL').pipe(
      map((reviewType) => {
        if (reviewType) {
          this.generalReviewTypeId = reviewType.id;
        } else {
          console.warn('ReviewType con code "GENERAL" no encontrado');
          this.generalReviewTypeId = null;
        }
      }),
      catchError((error) => {
        console.error('Error loading GENERAL review type:', error);
        this.generalReviewTypeId = null;
        return of(undefined);
      })
    );
  }

  ngAfterViewInit(): void {
    // Configurar Intersection Observer después de que la vista se inicialice
    this.setupIntersectionObserver();
    // SOLUCIÓN AGRESIVA: Sobrescribir los métodos touch de PrimeNG Carousel
    this.overridePrimeNGTouchHandlers();
    // Configurar detección de gestos para permitir scroll vertical en móvil
    this.setupTouchGestureDetection();
  }

  ngOnDestroy(): void {
    // Limpiar Intersection Observer
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = undefined;
    }
    // Limpiar listeners de touch
    this.cleanupTouchListeners();
    this.destroy$.next();
    this.destroy$.complete();
    
    // Resetear métodos del carrusel si fueron sobrescritos
    if (this.carousel) {
      // Los métodos se restaurarán automáticamente al destruir el componente
    }
  }

  /**
   * SOLUCIÓN AGRESIVA: Sobrescribe los métodos touch de PrimeNG Carousel
   * y deshabilita completamente el swipe en móvil removiendo event listeners
   */
  private overridePrimeNGTouchHandlers(): void {
    // Esperar a que el carrusel esté completamente inicializado
    setTimeout(() => {
      if (!this.carousel || !this.carousel.el?.nativeElement) {
        return;
      }

      // Verificar si estamos en móvil
      const isMobile = window.innerWidth <= 768;

      if (!isMobile) {
        return; // Solo aplicar en móvil
      }

      this.carouselElement = this.carousel.el.nativeElement;
      if (!this.carouselElement) {
        return;
      }

      // SOLUCIÓN 1: Sobrescribir los métodos del carrusel para detectar dirección inteligentemente
      if (this.carousel) {
        // Guardar referencias originales
        const originalOnTouchMove = this.carousel.onTouchMove?.bind(this.carousel);
        const originalOnTouchStart = this.carousel.onTouchStart?.bind(this.carousel);
        const originalOnTouchEnd = this.carousel.onTouchEnd?.bind(this.carousel);
        
        // Variable para rastrear si el gesto ya se determinó como horizontal o vertical
        let gestureDetermined = false;
        let isHorizontalGesture = false;

        // Sobrescribir onTouchStart
        if (originalOnTouchStart) {
          this.carousel.onTouchStart = (e: TouchEvent) => {
            if (e && e.touches && e.touches.length === 1) {
              this.touchStartX = e.touches[0].clientX;
              this.touchStartY = e.touches[0].clientY;
              gestureDetermined = false;
              isHorizontalGesture = false;
            }
            // Llamar al original para que PrimeNG pueda inicializar
            if (originalOnTouchStart) {
              originalOnTouchStart(e);
            }
          };
        }

        // Sobrescribir onTouchMove - CLAVE: Detectar dirección temprano y actuar en consecuencia
        if (originalOnTouchMove) {
          this.carousel.onTouchMove = (e: TouchEvent) => {
            if (!e || !e.touches || e.touches.length !== 1) {
              return;
            }

            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;

            if (this.touchStartX === 0 && this.touchStartY === 0) {
              this.touchStartX = currentX;
              this.touchStartY = currentY;
              return;
            }

            const deltaX = Math.abs(currentX - this.touchStartX);
            const deltaY = Math.abs(currentY - this.touchStartY);
            
            // Detectar dirección del gesto con umbral bajo para decisión rápida (5px)
            // Esto permite determinar la intención del usuario rápidamente
            if (!gestureDetermined && (deltaX > 5 || deltaY > 5)) {
              // Determinar si es horizontal o vertical basado en la dirección predominante
              if (deltaX > deltaY) {
                // Movimiento horizontal predominante
                isHorizontalGesture = true;
                gestureDetermined = true;
                // Permitir que PrimeNG procese el swipe horizontal
                if (originalOnTouchMove) {
                  originalOnTouchMove(e);
                }
              } else if (deltaY > deltaX) {
                // Movimiento vertical predominante
                isHorizontalGesture = false;
                gestureDetermined = true;
                // NO llamar al método original - permitir scroll vertical
                return;
              }
            } else if (gestureDetermined) {
              // Si ya determinamos la dirección, actuar consistentemente
              if (isHorizontalGesture) {
                // Continuar permitiendo swipe horizontal
                if (originalOnTouchMove) {
                  originalOnTouchMove(e);
                }
              } else {
                // Continuar permitiendo scroll vertical (no hacer nada)
                return;
              }
            } else {
              // Movimiento muy pequeño, esperar más
              return;
            }
          };
        }

        // Sobrescribir onTouchEnd
        if (originalOnTouchEnd) {
          this.carousel.onTouchEnd = (e: TouchEvent) => {
            this.touchStartX = 0;
            this.touchStartY = 0;
            gestureDetermined = false;
            isHorizontalGesture = false;
            // Llamar al original para limpieza
            if (originalOnTouchEnd) {
              originalOnTouchEnd(e);
            }
          };
        }
      }

      // SOLUCIÓN 2: Aplicar estilos CSS que permitan ambos gestos
      // NO usar touch-action: pan-y que deshabilita el swipe horizontal
      // En su lugar, usar pan-x pan-y para permitir ambos
      const itemsContainer = this.carouselElement.querySelector('.p-carousel-items-container') as HTMLElement;
      if (itemsContainer) {
        // Remover cualquier restricción de touch-action anterior
        const currentStyle = itemsContainer.getAttribute('style') || '';
        const newStyle = currentStyle
          .replace(/touch-action[^;]*;?/gi, '')
          .replace(/pan-y\s*!important/gi, '');
        itemsContainer.setAttribute('style', newStyle + ' touch-action: pan-x pan-y; -webkit-touch-callout: none;');
        this.itemsContainer = itemsContainer;
      }

      const carouselContent = this.carouselElement.querySelector('.p-carousel-content') as HTMLElement;
      if (carouselContent) {
        const currentStyle = carouselContent.getAttribute('style') || '';
        const newStyle = currentStyle.replace(/touch-action[^;]*;?/gi, '').replace(/pan-y\s*!important/gi, '');
        carouselContent.setAttribute('style', newStyle + ' touch-action: pan-x pan-y;');
        this.carouselContent = carouselContent;
      }

      // NO aplicar restricciones a los elementos hijos - permitir ambos gestos
      // Solo asegurar que los elementos no bloqueen eventos
      const allCarouselElements = this.carouselElement.querySelectorAll('.p-carousel-items-content, .p-carousel-item');
      allCarouselElements.forEach((el: Element) => {
        const htmlEl = el as HTMLElement;
        const currentStyle = htmlEl.getAttribute('style') || '';
        // Remover pan-y restrictivo si existe
        const newStyle = currentStyle.replace(/touch-action[^;]*;?/gi, '').replace(/pan-y\s*!important/gi, '');
        if (!newStyle.includes('touch-action')) {
          htmlEl.setAttribute('style', newStyle + ' touch-action: pan-x pan-y;');
        }
      });

      // Elemento raíz: permitir ambos gestos
      const currentRootStyle = this.carouselElement.getAttribute('style') || '';
      const newRootStyle = currentRootStyle.replace(/touch-action[^;]*;?/gi, '').replace(/pan-y\s*!important/gi, '');
      this.carouselElement.setAttribute('style', newRootStyle + ' touch-action: pan-x pan-y;');
    }, 300); // Aumentar delay para asegurar que PrimeNG haya inicializado
  }

  /**
   * Configura la detección de gestos touch para permitir scroll vertical
   * y evitar que el carrusel bloquee el scroll de la página en móvil
   */
  private setupTouchGestureDetection(): void {
    // Esperar a que el DOM esté completamente renderizado
    setTimeout(() => {
      if (!this.carousel?.el?.nativeElement || !this.carouselWrapper?.nativeElement) {
        return;
      }

      this.carouselElement = this.carousel.el.nativeElement;
      if (!this.carouselElement) {
        return;
      }

      // Obtener todos los elementos relevantes del carrusel
      this.itemsContainer = this.carouselElement.querySelector('.p-carousel-items-container') as HTMLElement;
      this.carouselContent = this.carouselElement.querySelector('.p-carousel-content') as HTMLElement;

      if (!this.itemsContainer) {
        return;
      }

      // Agregar listener también al wrapper para capturar eventos más temprano
      const wrapper = this.carouselWrapper.nativeElement as HTMLElement;

      // Crear handlers con el tipo correcto
      this.touchStartHandler = (event: Event) => {
        const touchEvent = event as TouchEvent;
        if (touchEvent.touches.length === 1) {
          this.touchStartX = touchEvent.touches[0].clientX;
          this.touchStartY = touchEvent.touches[0].clientY;
          this.isVerticalScroll = false;
        }
      };

      this.touchMoveHandler = (event: Event) => {
        const touchEvent = event as TouchEvent;
        if (touchEvent.touches.length !== 1) {
          return;
        }

        this.touchMoveX = touchEvent.touches[0].clientX;
        this.touchMoveY = touchEvent.touches[0].clientY;

        const deltaX = Math.abs(this.touchMoveX - this.touchStartX);
        const deltaY = Math.abs(this.touchMoveY - this.touchStartY);

        // Detección inteligente de dirección del gesto
        // Si el movimiento es principalmente vertical (deltaY > deltaX y más de 5px)
        // Detener la propagación SOLO para este evento, permitiendo scroll vertical
        if (deltaY > deltaX && deltaY > 5) {
          this.isVerticalScroll = true;
          
          // Detener la propagación sin prevenir el comportamiento predeterminado
          // Esto permite el scroll vertical pero previene que PrimeNG procese el swipe
          event.stopPropagation();
          event.stopImmediatePropagation();
          return;
        }
        
        // Si el movimiento es principalmente horizontal (deltaX > deltaY y más de 5px)
        // Permitir que PrimeNG procese el swipe horizontal normalmente
        if (deltaX > deltaY && deltaX > 5) {
          this.isVerticalScroll = false;
          // NO detener la propagación - dejar que PrimeNG procese el gesto horizontal
          return;
        }
        
        // Para movimientos muy pequeños o ambiguos, no hacer nada
        // El gesto se determinará en los siguientes eventos touchmove
      };

      this.touchEndHandler = () => {
        this.isVerticalScroll = false;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchMoveX = 0;
        this.touchMoveY = 0;
      };

      this.touchCancelHandler = () => {
        this.isVerticalScroll = false;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchMoveX = 0;
        this.touchMoveY = 0;
      };

      // Agregar listeners en fase de CAPTURA (capture: true) para interceptar ANTES de PrimeNG
      // Esto es crítico: debemos capturar los eventos antes de que PrimeNG los procese
      
      // PRIMERO: Listener en el wrapper (más externo, captura primero)
      wrapper.addEventListener('touchstart', this.touchStartHandler, { passive: true, capture: true });
      wrapper.addEventListener('touchmove', this.touchMoveHandler, { passive: false, capture: true });
      wrapper.addEventListener('touchend', this.touchEndHandler, { passive: true, capture: true });
      wrapper.addEventListener('touchcancel', this.touchCancelHandler, { passive: true, capture: true });

      // Listener en el elemento raíz del carrusel
      this.carouselElement.addEventListener('touchstart', this.touchStartHandler, { passive: true, capture: true });
      this.carouselElement.addEventListener('touchmove', this.touchMoveHandler, { passive: false, capture: true });
      this.carouselElement.addEventListener('touchend', this.touchEndHandler, { passive: true, capture: true });
      this.carouselElement.addEventListener('touchcancel', this.touchCancelHandler, { passive: true, capture: true });

      // También en el contenedor de items
      this.itemsContainer.addEventListener('touchstart', this.touchStartHandler, { passive: true, capture: true });
      this.itemsContainer.addEventListener('touchmove', this.touchMoveHandler, { passive: false, capture: true });
      this.itemsContainer.addEventListener('touchend', this.touchEndHandler, { passive: true, capture: true });
      this.itemsContainer.addEventListener('touchcancel', this.touchCancelHandler, { passive: true, capture: true });

      // Y en el contenido del carrusel
      if (this.carouselContent) {
        this.carouselContent.addEventListener('touchstart', this.touchStartHandler, { passive: true, capture: true });
        this.carouselContent.addEventListener('touchmove', this.touchMoveHandler, { passive: false, capture: true });
        this.carouselContent.addEventListener('touchend', this.touchEndHandler, { passive: true, capture: true });
        this.carouselContent.addEventListener('touchcancel', this.touchCancelHandler, { passive: true, capture: true });
      }
    }, 100);
  }

  /**
   * Limpia los listeners de touch events
   */
  private cleanupTouchListeners(): void {
    if (this.touchStartHandler && this.touchMoveHandler && this.touchEndHandler && this.touchCancelHandler) {
      // Remover listeners del wrapper
      if (this.carouselWrapper?.nativeElement) {
        const wrapper = this.carouselWrapper.nativeElement as HTMLElement;
        wrapper.removeEventListener('touchstart', this.touchStartHandler, { capture: true } as any);
        wrapper.removeEventListener('touchmove', this.touchMoveHandler, { capture: true } as any);
        wrapper.removeEventListener('touchend', this.touchEndHandler, { capture: true } as any);
        wrapper.removeEventListener('touchcancel', this.touchCancelHandler, { capture: true } as any);
      }

      // Remover listeners del elemento raíz
      if (this.carouselElement) {
        this.carouselElement.removeEventListener('touchstart', this.touchStartHandler, { capture: true } as any);
        this.carouselElement.removeEventListener('touchmove', this.touchMoveHandler, { capture: true } as any);
        this.carouselElement.removeEventListener('touchend', this.touchEndHandler, { capture: true } as any);
        this.carouselElement.removeEventListener('touchcancel', this.touchCancelHandler, { capture: true } as any);
      }

      // Remover listeners del contenedor de items
      if (this.itemsContainer) {
        this.itemsContainer.removeEventListener('touchstart', this.touchStartHandler, { capture: true } as any);
        this.itemsContainer.removeEventListener('touchmove', this.touchMoveHandler, { capture: true } as any);
        this.itemsContainer.removeEventListener('touchend', this.touchEndHandler, { capture: true } as any);
        this.itemsContainer.removeEventListener('touchcancel', this.touchCancelHandler, { capture: true } as any);
      }

      // Remover listeners del contenido
      if (this.carouselContent) {
        this.carouselContent.removeEventListener('touchstart', this.touchStartHandler, { capture: true } as any);
        this.carouselContent.removeEventListener('touchmove', this.touchMoveHandler, { capture: true } as any);
        this.carouselContent.removeEventListener('touchend', this.touchEndHandler, { capture: true } as any);
        this.carouselContent.removeEventListener('touchcancel', this.touchCancelHandler, { capture: true } as any);
      }
    }
    this.touchStartHandler = null;
    this.touchMoveHandler = null;
    this.touchEndHandler = null;
    this.touchCancelHandler = null;
  }

  /**
   * Configura el Intersection Observer para detectar cuando el carrusel aparece en pantalla
   */
  private setupIntersectionObserver(): void {
    // Verificar que el elemento existe y que no se haya trackeado ya
    if (!this.tourCarouselContainer?.nativeElement || this.hasTrackedVisibility) {
      return;
    }

    // Crear Intersection Observer con threshold del 10%
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Si el elemento es visible y tiene tours cargados, disparar el evento
          if (entry.isIntersecting && this.tours.length > 0 && !this.hasTrackedVisibility) {
            this.hasTrackedVisibility = true;
            this.trackViewItemList();
            // Desconectar el observer después de disparar el evento
            if (this.intersectionObserver) {
              this.intersectionObserver.disconnect();
            }
          }
        });
      },
      {
        threshold: 0.1, // Disparar cuando 10% del elemento es visible
        rootMargin: '0px'
      }
    );

    // Observar el contenedor
    this.intersectionObserver.observe(this.tourCarouselContainer.nativeElement);
  }

  /**
   * Dispara el evento view_item_list cuando el carrusel aparece en pantalla
   */
  private trackViewItemList(): void {
    if (!this.tours || this.tours.length === 0) {
      return;
    }

    const itemListId = this.configurationId?.toString() || 'home_carousel';
    const itemListName = this.title || 'Carrusel de tours';

    // Verificar si ya se trackeó esta lista
    if (this.analyticsService.isListTracked(itemListId)) {
      return;
    }

    // Disparar el evento
    this.analyticsService.trackViewItemListFromTours(
      this.tours,
      itemListId,
      itemListName
    );
  }

  private loadTripTypes(): Observable<void> {
    return this.tripTypeService.getActiveTripTypes().pipe(
      map((tripTypes: ITripTypeResponse[]) => {
        this.tripTypesMap.clear();
        tripTypes.forEach(tripType => {
          // Crear abreviación (primera letra del nombre)
          const abbreviation = tripType.name.charAt(0).toUpperCase();

          this.tripTypesMap.set(tripType.id, {
            ...tripType,
            abbreviation: abbreviation
          });
        });
      }),
      catchError((error) => {
        console.error('❌ Error loading trip types:', error);
        return of(undefined);
      })
    );
  }

  /**
   * Obtiene el rating promedio de un tour usando TourReview con filtro ReviewType "GENERAL"
   * @param tourId ID del tour
   * @returns Observable con el rating promedio o null
   */
  private getTourRating(tourId: number): Observable<number | null> {
    // Si no tenemos el ReviewType GENERAL, devolver null
    if (!this.generalReviewTypeId) {
      return of(null);
    }

    const filters = {
      tourId: tourId,
      reviewTypeId: this.generalReviewTypeId,
      isActive: true
    };

    return this.tourReviewService.getAverageRating(filters).pipe(
      map((ratingResponse) => {
        // Si hay rating, devolverlo tal cual (sin redondeos)
        // Si no hay rating o es 0, devolver null para que formatRating devuelva ''
        const avgRating = ratingResponse?.averageRating;
        return avgRating && avgRating > 0 ? avgRating : null;
      })
    );
  }

  private loadTourCarousel(): void {
    // Si se proporciona un configurationId específico, úsalo
    if (this.configurationId) {
      this.loadSpecificConfiguration(this.configurationId);
      return;
    }

    // Si no, cargar la primera configuración activa del carrusel de tours
    this.homeSectionConfigurationService
      .getTourCarouselConfigurations()
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
          }
        },
        error: (error) => {
          // Error loading tour carousel configurations
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
          this.theme = 'dark'; // Hardcoded para ver el tema oscuro
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
            this.loadToursFromFilters(filters);
          } else {
            this.tours = [];
          }
        },
        error: (error) => {
          console.error(
            '❌ [Tour Carrussel V2] Error loading configuration or filters:',
            error
          );
          this.tours = [];
        },
      });
  }

  private loadToursFromFilters(
    filters: IHomeSectionTourFilterResponse[]
  ): void {
    if (filters.length === 0) {
      this.tours = [];
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
    this.loadToursFromAllFilters(filters);
  }

  /**
   * Procesa todos los filtros y combina los IDs de tours de cada uno
   * @param filters Array de filtros a procesar
   */
  private loadToursFromAllFilters(
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

          // NO limitar por ahora - mostrar todos los tours

          return uniqueTourIds;
        }),
        catchError((error) => {
          // Error loading tours from filters
          return of([]);
        })
      )
      .subscribe((tourIds: number[]) => {
        if (tourIds.length === 0) {
          this.tours = [];
          this.debugTourIds = [];
          return;
        }

        // Guardar IDs para mostrar en pantalla
        this.debugTourIds = tourIds;

        // Convertir a strings y cargar los tours
        const tourIdsAsStrings = tourIds.map((id) => id.toString());
        this.loadToursFromIds(tourIdsAsStrings);
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
              '❌ [Tour Carrussel V2] Error loading tours by tag:',
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
                '❌ [Tour Carrussel V2] Error loading tours by location:',
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
          console.error(
            '❌ [Tour Carrussel V2] Error parsing specific tour IDs:',
            error
          );
          return of([]);
        }

      default:
        // Unknown filter type
        return of([]);
    }
  }

  // ✅ MÉTODO AUXILIAR: Obtener datos adicionales (fechas, tags, días)
  // NOTA: Este método está duplicado de home-v2.component.ts
  // TODO: Extraer a un servicio compartido para evitar duplicación
  private getAdditionalTourData(tourId: number): Observable<{
    departures: IDepartureResponse[];
    tags: string[];
    itineraryDays: IItineraryDayResponse[];
    continent?: string;
    country?: string;
  }> {
    const itineraryFilters: ItineraryFilters = {
      tourId: tourId,
      isVisibleOnWeb: true,
      isBookable: true,
    };

    return this.itineraryService.getAll(itineraryFilters, false).pipe(
      switchMap((itineraries: IItineraryResponse[]) => {
        if (itineraries.length === 0) {
          return of({
            departures: [],
            tags: [],
            itineraryDays: [],
            continent: '',
            country: '',
          });
        }

        const departureRequests = itineraries.map((itinerary) =>
          this.departureService.getByItinerary(itinerary.id, false).pipe(
            catchError(() => of([]))
          )
        );

        return forkJoin(departureRequests).pipe(
          switchMap((departureArrays: IDepartureResponse[][]) => {
            const allDepartures = departureArrays.flat();

            const itineraryDaysRequest =
              itineraries.length > 0
                ? this.itineraryDayService
                  .getAll({ itineraryId: itineraries[0].id })
                  .pipe(catchError(() => of([])))
                : of([]);

            const tagRequest = this.tourTagService
              .getByTourAndType(tourId, 'VISIBLE')
              .pipe(
                switchMap((tourTags) => {
                  if (tourTags.length > 0 && tourTags[0]?.tagId && tourTags[0].tagId > 0) {
                    const firstTagId = tourTags[0].tagId;
                    return this.tagService.getById(firstTagId).pipe(
                      map((tag) => tag?.name && tag.name.trim().length > 0 ? [tag.name.trim()] : []),
                      catchError(() => of([]))
                    );
                  }
                  return of([]);
                }),
                catchError(() => of([]))
              );

            const countryLocationRequest = this.tourLocationService
              .getByTourAndType(tourId, 'COUNTRY')
              .pipe(
                map((response) => Array.isArray(response) ? response : response ? [response] : []),
                catchError(() => of([]))
              );

            const continentLocationRequest = this.tourLocationService
              .getByTourAndType(tourId, 'CONTINENT')
              .pipe(
                map((response) => Array.isArray(response) ? response : response ? [response] : []),
                catchError(() => of([]))
              );

            return forkJoin([tagRequest, itineraryDaysRequest, countryLocationRequest, continentLocationRequest]).pipe(
              switchMap(([tags, itineraryDays, countryLocations, continentLocations]) => {
                const validCountryLocations = countryLocations.filter(
                  (loc: any) => loc && loc.id && loc.locationId
                );
                const validContinentLocations = continentLocations.filter(
                  (loc: any) => loc && loc.id && loc.locationId
                );

                const allLocationIds = [
                  ...validCountryLocations.map((tl: any) => tl.locationId),
                  ...validContinentLocations.map((tl: any) => tl.locationId),
                ];
                const uniqueLocationIds = [...new Set(allLocationIds)];

                if (uniqueLocationIds.length === 0) {
                  return of({
                    departures: allDepartures,
                    tags: tags as string[],
                    itineraryDays: itineraryDays as IItineraryDayResponse[],
                    continent: '',
                    country: '',
                  });
                }

                return this.locationService.getLocationsByIds(uniqueLocationIds).pipe(
                  map((locations: Location[]) => {
                    const locationsMap = new Map<number, Location>();
                    locations.forEach((location) => {
                      locationsMap.set(location.id, location);
                    });

                    const countries = validCountryLocations
                      .sort((a: any, b: any) => a.displayOrder - b.displayOrder)
                      .map((tl: any) => locationsMap.get(tl.locationId)?.name)
                      .filter((name) => name) as string[];

                    const continents = validContinentLocations
                      .sort((a: any, b: any) => a.displayOrder - b.displayOrder)
                      .map((tl: any) => locationsMap.get(tl.locationId)?.name)
                      .filter((name) => name) as string[];

                    return {
                      departures: allDepartures,
                      tags: tags as string[],
                      itineraryDays: itineraryDays as IItineraryDayResponse[],
                      continent: continents.join(', ') || '',
                      country: countries.join(', ') || '',
                    };
                  }),
                  catchError(() => {
                    return of({
                      departures: allDepartures,
                      tags: tags as string[],
                      itineraryDays: itineraryDays as IItineraryDayResponse[],
                      continent: '',
                      country: '',
                    });
                  })
                );
              })
            );
          })
        );
      }),
      catchError(() => {
        return of({
          departures: [],
          tags: [],
          itineraryDays: [],
          continent: '',
          country: '',
        });
      })
    );
  }

  private loadToursFromIds(tourIds: string[]): void {
    // Usar tu lógica existente pero limitando a maxToursToShow
    const limitedTourIds = tourIds.slice(0, this.maxToursToShow);

    // Reset tours array
    this.tours = [];

    // Use mergeMap to load tours in parallel (unlimited concurrency for faster loading)
    // This significantly improves loading speed compared to sequential loading
    of(...limitedTourIds)
      .pipe(
        mergeMap((id: string) => {
          // Combinar datos del TourNetService, CMSTourService y datos adicionales
          return forkJoin({
            tourData: this.tourService.getTourById(Number(id)),
            cmsData: this.cmsTourService.getAllTours({ tourId: Number(id) }),
            additionalData: this.getAdditionalTourData(Number(id))
          }).pipe(
            catchError((error: Error) => {
              // Error loading tour
              return of(null);
            }),
            map(
              (
                combinedData: {
                  tourData: TourNetTour;
                  cmsData: ICMSTourResponse[];
                  additionalData: {
                    departures: IDepartureResponse[];
                    tags: string[];
                    itineraryDays: IItineraryDayResponse[];
                  };
                } | null
              ): TourDataV2 | null => {
                if (combinedData) {
                }
                if (!combinedData) return null;

                // Mapear datos combinados de TourNetService, CMSTourService y datos adicionales a TourDataV2
                const tour = combinedData.tourData;
                const cmsArray = combinedData.cmsData;
                const cms =
                  cmsArray && cmsArray.length > 0 ? cmsArray[0] : null;
                const additional = combinedData.additionalData as {
                  departures: IDepartureResponse[];
                  tags: string[];
                  itineraryDays: IItineraryDayResponse[];
                  continent?: string;
                  country?: string;
                };

                // ✅ OBTENER PRECIO: Usar minPrice del TourNetService
                let tourPrice = tour.minPrice || 0;

                // ✅ OBTENER FECHAS: Extraer fechas de los departures
                // ✅ OBTENER FECHAS: Extraer fechas de los departures
                const availableMonths: string[] = [];
                const departureDates: string[] = [];
                const tripTypes: { name: string; code: string; color: string; abbreviation: string }[] = [];
                let nextDepartureDate: string | undefined;

                if (additional.departures && additional.departures.length > 0) {
                  // Ordenar departures por fecha

                  const sortedDepartures = additional.departures
                    .filter((departure) => departure.departureDate)
                    .sort(
                      (a, b) =>
                        new Date(a.departureDate!).getTime() -
                        new Date(b.departureDate!).getTime()
                    );

                  sortedDepartures.forEach((departure: IDepartureResponse) => {
                    if (departure.departureDate) {
                      const date = new Date(departure.departureDate);
                      const month = date
                        .toLocaleDateString('es-ES', { month: 'short' })
                        .toUpperCase();

                      if (!availableMonths.includes(month)) {
                        availableMonths.push(month);
                      }
                      departureDates.push(departure.departureDate);

                      // ✅ NUEVO: Agregar tripTypeId al array (sin duplicados)
                      if (departure.tripTypeId) {
                        const tripTypeInfo = this.tripTypesMap.get(departure.tripTypeId);
                        if (tripTypeInfo && !tripTypes.some(t => t.code === tripTypeInfo.code)) {
                          tripTypes.push({
                            name: tripTypeInfo.name,
                            code: tripTypeInfo.code,
                            color: tripTypeInfo.color,
                            abbreviation: tripTypeInfo.abbreviation
                          });
                        }
                      }

                    }
                  });
                }

                // ✅ OBTENER TAG: Usar el primer tag disponible
                const tourTag =
                  additional.tags && additional.tags.length > 0
                    ? additional.tags[0]
                    : '';

                // ✅ OBTENER DÍAS DE ITINERARIO: Contar los días disponibles
                const itineraryDaysCount = additional.itineraryDays
                  ? additional.itineraryDays.length
                  : 0;

                // ✅ CREAR TEXTO DE DÍAS: Formato "Colombia: en 10 días" (línea superior)
                // Extraer solo el nombre del país (antes de los dos puntos)
                const countryName = tour.name
                  ? tour.name.split(':')[0].trim()
                  : '';
                const itineraryDaysText =
                  itineraryDaysCount > 0 && countryName
                    ? `${countryName}: en ${itineraryDaysCount} días`
                    : '';

                // ✅ APLICAR IMAGEN COMO EN TOUR-OVERVIEW-V2
                const imageUrl = cms?.imageUrl || '';

                // El rating ahora se obtiene desde TourReview en los componentes de tarjetas (tour-card-header-v2)
                // No se carga aquí para evitar llamadas innecesarias a average-rating

                return {
                  id: tour.id,
                  imageUrl: imageUrl,
                  title: tour.name || '',
                  description: '',
                  rating: undefined,
                  tag: tourTag,
                  price: tourPrice,
                  availableMonths: availableMonths,
                  nextDepartureDate: nextDepartureDate,
                  itineraryDaysCount: itineraryDaysCount,
                  itineraryDaysText: itineraryDaysText,
                  isByDr: tour.productStyleId === 1, // ✅ isByDr es true cuando productStyleId es 1 (GROUP)
                  webSlug:
                    tour.slug ||
                    tour.name?.toLowerCase().replace(/\s+/g, '-') ||
                    '',
                  tripType: [], // TourNetService no tiene tripType
                  externalID: tour.tkId || '',
                  continent: additional.continent || '',
                  country: additional.country || '',
                  productStyleId: tour.productStyleId, // ✅ Agregar productStyleId al objeto
                  tripTypes: tripTypes,
                };
              }
            )
          );
        }), // Cargar todos los tours en paralelo para máxima velocidad
        // Accumulate tours as they arrive, evitando duplicados por ID
        scan((acc: TourDataV2[], tour: TourDataV2 | null) => {
          if (tour) {
            // Verificar si ya existe un tour con el mismo ID
            const existingTour = acc.find(t => t.id === tour.id);
            if (!existingTour) {
              return [...acc, tour];
            }
            // Si ya existe, no agregarlo (evitar duplicados)
            return acc;
          }
          return acc;
        }, [] as TourDataV2[]),
        takeUntil(this.destroy$)
      )
      .subscribe((accumulatedTours: TourDataV2[]) => {
        this.tours = accumulatedTours;
        // Si el elemento ya es visible y los tours están cargados, configurar el observer
        if (this.tours.length > 0 && this.tourCarouselContainer?.nativeElement) {
          // Si el observer no está configurado, configurarlo ahora
          if (!this.intersectionObserver && !this.hasTrackedVisibility) {
            setTimeout(() => this.setupIntersectionObserver(), 100);
          }
          // Re-aplicar la solución de touch handlers después de que los tours se carguen
          // El carrusel puede reinicializarse cuando se agregan items
          setTimeout(() => this.overridePrimeNGTouchHandlers(), 200);
        }
      });
  }

  onViewMore(): void {
    if (this.viewMoreButton?.url) {
      this.router.navigate([this.viewMoreButton.url]);
    }
  }
}
