import { Component, OnInit, OnDestroy } from '@angular/core';
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

@Component({
  selector: 'app-community-gallery-v2',
  standalone: false,
  templateUrl: './community-gallery-v2.component.html',
  styleUrls: ['./community-gallery-v2.component.scss'],
})
export class CommunityGalleryV2Component implements OnInit, OnDestroy {
  communityImages: IHomeSectionCardResponse[] = [];
  loading = true;
  error: string | null = null;
  private abortController = new AbortController();
  private destroy$ = new Subject<void>();

  constructor(
    private homeSectionService: HomeSectionService,
    private homeSectionConfigurationService: HomeSectionConfigurationService,
    private homeSectionCardService: HomeSectionCardService
  ) {}

  /**
   * Inicializa el componente y carga las imágenes de la galería de comunidad.
   */
  ngOnInit() {
    this.loadCommunityImages();
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
   * Carga las imágenes de la galería de comunidad.
   * Obtiene la sección TRAVELER_SECTION, luego sus configuraciones y finalmente las cards.
   * @private
   */
  private loadCommunityImages() {
    this.homeSectionService
      .getAll({ code: 'TRAVELER_SECTION' }, this.abortController.signal)
      .pipe(
        switchMap((sections: IHomeSectionResponse[]) => {
          if (sections.length === 0) {
            this.error = 'Community section not found';
            this.loading = false;
            return of([]);
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
                  return of([]);
                }

                // Obtener la primera configuración activa
                const configuration = configurations[0];

                // Cargar las cards de la configuración
                return this.loadSectionCardsObservable(configuration.id);
              }),
              catchError((error) => {
                console.error('CommunityGalleryV2 - Error loading section configurations:', error);
                this.error = 'Error loading section configurations';
                this.loading = false;
                return of([]);
              })
            );
        }),
        catchError((error) => {
          console.error('CommunityGalleryV2 - Error loading community section:', error);
          this.error = 'Error loading community section';
          this.loading = false;
          return of([]);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (cards) => {
          this.communityImages = cards;
          this.loading = false;
        },
        error: (error) => {
          console.error('CommunityGalleryV2 - Error in loadCommunityImages:', error);
          this.error = 'Error loading community images';
          this.loading = false;
        },
      });
  }

  /**
   * Carga las cards de la configuración como Observable.
   * Filtra las cards que NO son destacadas y las ordena por displayOrder.
   * @param configurationId - ID de la configuración
   * @returns Observable con array de cards filtradas y ordenadas
   * @private
   */
  private loadSectionCardsObservable(configurationId: number) {
    return this.homeSectionCardService
      .getByConfiguration(configurationId, true, this.abortController.signal)
      .pipe(
        map((cards: IHomeSectionCardResponse[]) => {
          // Crear copia antes de filtrar y ordenar para evitar mutación in-place
          const cardsCopy = [...cards];

          // Filtrar solo las cards que NO son destacadas (isFeatured: false)
          // y ordenar por displayOrder
          return cardsCopy
            .filter((card) => !card.isFeatured)
            .sort((a, b) => a.displayOrder - b.displayOrder);
        }),
        catchError((error) => {
          console.error('CommunityGalleryV2 - Error loading section cards:', error);
          this.error = 'Error loading section cards';
          this.loading = false;
          return of([]);
        })
      );
  }
}
