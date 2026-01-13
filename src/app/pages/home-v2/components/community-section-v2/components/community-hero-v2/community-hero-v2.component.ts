import { Component, OnInit, OnDestroy } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { of, Subject } from 'rxjs';
import { switchMap, map, catchError, takeUntil } from 'rxjs/operators';
import {
  HomeSectionService,
  IHomeSectionResponse,
} from '../../../../../../core/services/home/home-section.service';
import {
  HomeSectionConfigurationService,
  IHomeSectionConfigurationResponse,
} from '../../../../../../core/services/home/home-section-configuration.service';
import {
  HomeSectionCardService,
  IHomeSectionCardResponse,
} from '../../../../../../core/services/home/home-section-card.service';

interface CommunityHero {
  title: string;
  googleRating: number;
  featured: {
    images: string[];
    content: string; // This will contain the Quill HTML content
    featuredCards: IHomeSectionCardResponse[]; // Store the featured images data
    orderOneCard?: IHomeSectionCardResponse; // Store the order 1 card data for information
  };
}

@Component({
  selector: 'app-community-hero-v2',
  standalone: false,
  templateUrl: './community-hero-v2.component.html',
  styleUrl: './community-hero-v2.component.scss',
})
export class CommunityHeroV2Component implements OnInit, OnDestroy {
  data: CommunityHero = {
    title: 'Titular para sección comunidad',
    googleRating: 4.5,
    featured: {
      images: [],
      content: '',
      featuredCards: [],
      orderOneCard: undefined,
    },
  };
  loading = true;
  error: string | null = null;
  private abortController = new AbortController();
  private destroy$ = new Subject<void>();

  constructor(
    private sanitizer: DomSanitizer,
    private homeSectionService: HomeSectionService,
    private homeSectionConfigurationService: HomeSectionConfigurationService,
    private homeSectionCardService: HomeSectionCardService
  ) {}

  /**
   * Inicializa el componente y carga los datos del hero de comunidad.
   */
  ngOnInit() {
    this.loadCommunityHeroData();
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

  get sanitizedContent(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.data.featured.content);
  }

  /**
   * Carga los datos del hero de comunidad.
   * Obtiene la sección TRAVELER_SECTION, luego sus configuraciones y finalmente las imágenes destacadas.
   * @private
   */
  private loadCommunityHeroData() {
    this.homeSectionService
      .getAll({ code: 'TRAVELER_SECTION' }, this.abortController.signal)
      .pipe(
        switchMap((sections: IHomeSectionResponse[]) => {
          if (sections.length === 0) {
            this.error = 'Community section not found';
            this.loading = false;
            return of(null);
          }

          const communitySection = sections[0];

          // Obtener las configuraciones de esta sección
          return this.homeSectionConfigurationService
            .getBySectionType(communitySection.id, true, this.abortController.signal)
            .pipe(
              switchMap((configurations: IHomeSectionConfigurationResponse[]) => {
                if (configurations.length === 0) {
                  this.error = 'No active community section configurations found';
                  this.loading = false;
                  return of(null);
                }

                // Obtener la primera configuración activa
                const configuration = configurations[0];

                // Actualizar el título desde la configuración
                if (configuration.title) {
                  this.data.title = configuration.title;
                }

                // Cargar las imágenes destacadas
                return this.loadFeaturedImagesObservable(configuration.id);
              }),
              catchError((error) => {
                console.error('CommunityHeroV2 - Error loading section configurations:', error);
                this.error = 'Error loading section configurations';
                this.loading = false;
                return of(null);
              })
            );
        }),
        catchError((error) => {
          console.error('CommunityHeroV2 - Error loading community section:', error);
          this.error = 'Error loading community section';
          this.loading = false;
          return of(null);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (result) => {
          if (result !== null) {
            // Los datos ya se actualizaron en el observable
            this.loading = false;
          }
        },
        error: (error) => {
          console.error('CommunityHeroV2 - Error in loadCommunityHeroData:', error);
          this.error = 'Error loading community hero data';
          this.loading = false;
        },
      });
  }

  /**
   * Carga las imágenes destacadas como Observable.
   * Filtra las cards destacadas, las ordena y obtiene la card con displayOrder 1.
   * @param configurationId - ID de la configuración
   * @returns Observable que emite cuando se completan los datos
   * @private
   */
  private loadFeaturedImagesObservable(configurationId: number) {
    return this.homeSectionCardService
      .getByConfiguration(configurationId, true, this.abortController.signal)
      .pipe(
        map((cards: IHomeSectionCardResponse[]) => {
          // Crear copia antes de filtrar y ordenar para evitar mutación in-place
          const cardsCopy = [...cards];

          // Obtener cards destacadas para imágenes
          const featuredCards = cardsCopy
            .filter((card) => card.isFeatured)
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .slice(0, 2);

          // Obtener card con displayOrder: 1 para información
          const orderOneCard = cardsCopy
            .filter((card) => card.displayOrder === 1)
            .find((card) => card.isActive);

          // Almacenar las imágenes destacadas
          this.data.featured.featuredCards = featuredCards;
          this.data.featured.images = featuredCards.map((card) => card.imageUrl);

          // Almacenar la información de la card con orden 1 por separado
          this.data.featured.orderOneCard = orderOneCard;

          // Usar el contenido de la card con orden 1 si está disponible
          if (orderOneCard && orderOneCard.content) {
            this.data.featured.content = orderOneCard.content;
          }

          return true; // Indicar que se completó exitosamente
        }),
        catchError((error) => {
          console.error('CommunityHeroV2 - Error loading featured images:', error);
          this.error = 'Error loading featured images';
          this.loading = false;
          return of(false);
        })
      );
  }
}
