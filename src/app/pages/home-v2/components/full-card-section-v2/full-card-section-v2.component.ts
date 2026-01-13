import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { of, forkJoin } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
import { HomeSectionService } from '../../../../core/services/home/home-section.service';
import { HomeSectionConfigurationService } from '../../../../core/services/home/home-section-configuration.service';
import {
  HomeSectionCardService,
  IHomeSectionCardResponse,
} from '../../../../core/services/home/home-section-card.service';

interface Card {
  id: number;
  subtitle: string;
  content: string;
  link: string;
  image: { url: string; alt: string };
}

@Component({
  selector: 'app-full-card-section-v2',
  standalone: false,
  templateUrl: './full-card-section-v2.component.html',
  styleUrls: ['./full-card-section-v2.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FullCardSectionV2Component implements OnInit, OnDestroy {
  cards: Card[] = [];
  sectionTitle: string = '';
  sectionDescription: string = '';

  private abortController = new AbortController();

  constructor(
    private sanitizer: DomSanitizer,
    private readonly router: Router,
    private homeSectionService: HomeSectionService,
    private homeSectionConfigurationService: HomeSectionConfigurationService,
    private homeSectionCardService: HomeSectionCardService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadFullScreenCards();
  }

  ngOnDestroy(): void {
    this.abortController.abort();
  }

  protected sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  onClick(url: string): void {
    if (!url) return;
    this.navigate(url);
  }

  trackByCardId(index: number, card: Card): number {
    return card.id;
  }

  /**
   * Carga las cards de pantalla completa.
   * Obtiene la sección FULLSCREEN_CARDS, luego sus configuraciones y finalmente todas las cards.
   */
  private loadFullScreenCards(): void {
    this.homeSectionService
      .getAll({ code: 'FULLSCREEN_CARDS', isActive: true }, this.abortController.signal)
      .pipe(
        switchMap((sections) => {
          if (sections.length === 0) {
            console.warn('FullCardSectionV2 - No FULLSCREEN_CARDS section found');
            return of([]);
          }

          const fullScreenSection = sections[0];

          // Obtener las configuraciones de esta sección
          return this.homeSectionConfigurationService
            .getBySectionType(fullScreenSection.id, true, this.abortController.signal)
            .pipe(
              map((configurations) => {
                if (configurations.length === 0) {
                  console.warn('FullCardSectionV2 - No configurations found for section');
                  return [];
                }

                // Usar la primera configuración para título y descripción
                const firstConfiguration = configurations[0];
                this.sectionTitle = firstConfiguration.title || '';
                this.sectionDescription = firstConfiguration.content || '';

                return configurations;
              }),
              catchError((error) => {
                console.error('FullCardSectionV2 - Error loading configurations:', error);
                return of([]);
              })
            );
        }),
        catchError((error) => {
          console.error('FullCardSectionV2 - Error loading FULLSCREEN_CARDS section:', error);
          return of([]);
        })
      )
      .subscribe({
        next: (configurations) => {
          if (configurations.length > 0) {
            // Obtener todas las cards de todas las configuraciones
            this.loadAllCardsFromConfigurations(configurations);
          } else {
            this.cards = [];
            this.cdr.markForCheck();
          }
        },
        error: (error) => {
          console.error('FullCardSectionV2 - Error in loadFullScreenCards:', error);
          this.cards = [];
          this.cdr.markForCheck();
        },
      });
  }

  /**
   * Carga todas las cards de múltiples configuraciones usando forkJoin.
   * Elimina race conditions al esperar todas las peticiones en paralelo.
   * @param configurations - Array de configuraciones de las que cargar cards
   * @private
   */
  private loadAllCardsFromConfigurations(configurations: any[]): void {
    if (configurations.length === 0) {
      this.cards = [];
      this.cdr.markForCheck();
      return;
    }

    // Crear un observable para cada configuración
    const cardRequests = configurations.map((config) =>
      this.homeSectionCardService
        .getByConfiguration(config.id, true, this.abortController.signal)
        .pipe(
          map((cards) => cards.map((card) => this.transformCard(card))),
          catchError((error) => {
            console.error(
              `FullCardSectionV2 - Error loading cards for configuration ${config.id}:`,
              error
            );
            return of([]); // Retornar array vacío en caso de error
          })
        )
    );

    // Ejecutar todas las peticiones en paralelo y esperar a que todas completen
    forkJoin(cardRequests)
      .pipe(
        map((cardArrays) => cardArrays.flat()), // Aplanar todos los arrays en uno solo
        catchError((error) => {
          console.error('FullCardSectionV2 - Error in forkJoin loading cards:', error);
          return of([]);
        })
      )
      .subscribe({
        next: (allCards) => {
          this.cards = allCards;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('FullCardSectionV2 - Error loading all cards:', error);
          this.cards = [];
          this.cdr.markForCheck();
        },
      });
  }

  /**
   * Transforma una card del backend al formato requerido por el componente.
   * @param card - Card del backend
   * @returns Card transformada
   * @private
   */
  private transformCard(card: IHomeSectionCardResponse): Card {
    return {
      id: card.id,
      subtitle: card.title,
      content: card.content || '',
      link: card.linkUrl || '',
      image: {
        url: card.imageUrl,
        alt: card.imageAlt,
      },
    };
  }

  private navigate(url: string): void {
    this.isExternalUrl(url)
      ? window.open(url, '_blank', 'noopener,noreferrer')
      : this.router.navigate([url]);
  }

  private isExternalUrl(url: string): boolean {
    return /^https?:\/\//.test(url);
  }
}
