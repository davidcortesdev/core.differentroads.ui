import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
import { HomeSectionService } from '../../../../core/services/home/home-section.service';
import { HomeSectionConfigurationService } from '../../../../core/services/home/home-section-configuration.service';
import { HomeSectionCardService } from '../../../../core/services/home/home-section-card.service';

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

  private loadAllCardsFromConfigurations(configurations: any[]): void {
    const allCards: Card[] = [];
    let completedRequests = 0;
    const totalRequests = configurations.length;

    configurations.forEach((configuration) => {
      this.homeSectionCardService
        .getByConfiguration(configuration.id, true, this.abortController.signal)
        .subscribe({
          next: (cards) => {
            // Mapear las cards de esta configuración
            const mappedCards = cards.map((card) => ({
              id: card.id,
              subtitle: card.title,
              content: card.content || '',
              link: card.linkUrl || '',
              image: {
                url: card.imageUrl,
                alt: card.imageAlt,
              },
            }));

            allCards.push(...mappedCards);
            completedRequests++;

            // Si hemos completado todas las peticiones, actualizar el array de cards
            if (completedRequests === totalRequests) {
              this.cards = allCards;
              this.cdr.detectChanges();
            }
          },
          error: (error) => {
            completedRequests++;

            // Si hemos completado todas las peticiones (incluso con errores), actualizar
            if (completedRequests === totalRequests) {
              this.cards = allCards;
              this.cdr.detectChanges();
            }
          },
        });
    });
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
