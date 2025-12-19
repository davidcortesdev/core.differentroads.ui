import {
  Component,
  Input,
  ViewChildren,
  QueryList,
  ElementRef,
  AfterViewInit,
  OnChanges,
  SimpleChanges,
  ChangeDetectorRef,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, switchMap, map, catchError } from 'rxjs/operators';
import { TourInformationSectionService } from '../../../../core/services/tour/tour-information-section.service';
import { TourInformationContentService } from '../../../../core/services/tour/tour-information-content.service';

export interface InfoCard {
  title: string;
  content: string;
  order: string;
  showFullContent?: boolean;
}

@Component({
  selector: 'app-tour-info-accordion-v2',
  standalone: false,
  templateUrl: './tour-info-accordion-v2.component.html',
  styleUrl: './tour-info-accordion-v2.component.scss',
})
export class TourInfoAccordionV2Component
  implements OnInit, AfterViewInit, OnChanges, OnDestroy
{
  @Input() tourId: number | null = null;
  @ViewChildren('contentDiv') contentDivs!: QueryList<ElementRef>;

  infoCards: InfoCard[] = [];
  private destroy$ = new Subject<void>();
  private readonly MAX_HEIGHT = 300;

  constructor(
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private tourInformationSectionService: TourInformationSectionService,
    private tourInformationContentService: TourInformationContentService
  ) {}

  ngOnInit() {
    // Si no se proporciona tourId como input, intentar obtenerlo de la ruta
    if (!this.tourId) {
      this.route.params.subscribe((params) => {
        const slug = params['slug'];
        if (slug) {
          // Aquí podrías hacer una llamada para obtener el tourId desde el slug
          // Por ahora, asumimos que el tourId está disponible
          this.loadTourInformation();
        }
      });
    } else {
      this.loadTourInformation();
    }
  }

  ngAfterViewInit() {
    // Verificación inmediata de altura sin debounce
    setTimeout(() => {
      this.checkContentHeight();
      // Forzar detección de cambios
      this.cdr.detectChanges();
    }, 0);

    // Observar cambios en los divs y verificar altura inmediatamente
    this.contentDivs.changes.pipe(takeUntil(this.destroy$)).subscribe(() => {
      setTimeout(() => {
        this.checkContentHeight();
        this.cdr.detectChanges();
      }, 0);
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['tourId'] && this.tourId) {
      this.loadTourInformation();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadTourInformation(): void {
    if (!this.tourId) return;

    // Primero obtener todas las secciones activas
    this.tourInformationSectionService
      .getTourInformationSections({ isActive: true })
      .pipe(
        takeUntil(this.destroy$),
        switchMap((sections) => {
          // Ordenar secciones por displayOrder
          const sortedSections = sections.sort(
            (a, b) => a.displayOrder - b.displayOrder
          );

          // Para cada sección, obtener el contenido del tour
          const contentObservables = sortedSections.map((section) =>
            this.tourInformationContentService
              .getTourInformationContent({
                tourId: this.tourId!,
                tourInformationSectionId: section.id,
                isVisibleOnTourPage: true,
              })
              .pipe(
                map((contentArray) => {
                  if (contentArray && contentArray.length > 0) {
                    const content = contentArray[0]; // Tomar el primer contenido
                    return {
                      section,
                      content,
                    };
                  }
                  return null;
                }),
                catchError(() => of(null))
              )
          );

          // Usar forkJoin para combinar todos los observables
          return forkJoin(contentObservables);
        })
      )
      .subscribe({
        next: (results) => {
          this.infoCards = [];

          results.forEach((result) => {
            if (result && result.content) {
              const infoCard: InfoCard = {
                title: result.section.name,
                content: result.content.content,
                order: result.section.displayOrder.toString(),
                showFullContent: false,
              };
              this.infoCards.push(infoCard);
            }
          });

          // Ordenar por displayOrder
          this.infoCards.sort((a, b) => parseInt(a.order) - parseInt(b.order));

          // Forzar detección de cambios
          this.cdr.detectChanges();

        },
        error: (error) => {
        },
      });
  }

  trackByFn(index: number, item: InfoCard): string {
    return `${index}-${item.order}`;
  }

  sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html || '');
  }

  toggleContent(card: InfoCard): void {
    // Simplemente invertir el valor
    card.showFullContent = !card.showFullContent;

    // Forzar la detección de cambios inmediatamente
    this.cdr.detectChanges();
  }

  onAccordionTabOpen() {
    // Verificar altura inmediatamente al abrir
    this.checkContentHeight();
  }

  private checkContentHeight() {
    if (!this.contentDivs) return;

    this.contentDivs.forEach((div: ElementRef) => {
      const element = div.nativeElement;
      const parentElement = element.parentElement;

      if (!parentElement) return;

      const isOverflowing = element.scrollHeight > this.MAX_HEIGHT;

      if (isOverflowing) {
        parentElement.classList.add('content-overflow');
      } else {
        parentElement.classList.remove('content-overflow');
      }
    });

    // Forzar la detección de cambios después de aplicar las clases
    this.cdr.detectChanges();
  }
}
