import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Router } from '@angular/router';
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
export class FullCardSectionV2Component implements OnInit {
  cards: Card[] = [];
  sectionTitle: string = '';
  sectionDescription: string = '';

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

  private loadFullScreenCards(): void {
    // 1. Obtener la sección con code 'FULLSCREEN_CARDS'
    this.homeSectionService
      .getAll({ code: 'FULLSCREEN_CARDS', isActive: true })
      .subscribe({
        next: (sections) => {
          if (sections.length > 0) {
            const fullScreenSection = sections[0];

            // 2. Obtener las configuraciones de esta sección
            this.homeSectionConfigurationService
              .getBySectionType(fullScreenSection.id, true)
              .subscribe({
                next: (configurations) => {
                  if (configurations.length > 0) {
                    // Usar la primera configuración para título y descripción
                    const firstConfiguration = configurations[0];
                    this.sectionTitle = firstConfiguration.title || '';
                    this.sectionDescription = firstConfiguration.content || '';

                    // 3. Obtener todas las cards de todas las configuraciones
                    this.loadAllCardsFromConfigurations(configurations);
                  } else {
                    console.error(
                      'No configuration found for FULLSCREEN_CARDS section'
                    );
                  }
                },
                error: (error) => {
                  console.error('Error loading configuration:', error);
                },
              });
          } else {
            console.error('No FULLSCREEN_CARDS section found');
          }
        },
        error: (error) => {
          console.error('Error loading FULLSCREEN_CARDS section:', error);
        },
      });
  }

  private loadAllCardsFromConfigurations(configurations: any[]): void {
    const allCards: Card[] = [];
    let completedRequests = 0;
    const totalRequests = configurations.length;

    configurations.forEach((configuration) => {
      this.homeSectionCardService
        .getByConfiguration(configuration.id, true)
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
            console.error(
              `Error loading cards for configuration ${configuration.id}:`,
              error
            );
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
