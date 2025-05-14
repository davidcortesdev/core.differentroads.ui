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
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export interface InfoCard {
  title: string;
  content: string;
  order: string;
  showFullContent?: boolean;
}

@Component({
  selector: 'app-tour-info-accordion',
  standalone: false,
  templateUrl: './tour-info-accordion.component.html',
  styleUrl: './tour-info-accordion.component.scss',
})
export class TourInfoAccordionComponent
  implements OnInit, AfterViewInit, OnChanges, OnDestroy {
  @Input() infoCards: InfoCard[] = [];
  @ViewChildren('contentDiv') contentDivs!: QueryList<ElementRef>;

  // Eliminamos el debounce que causaba retraso
  private destroy$ = new Subject<void>();
  private readonly MAX_HEIGHT = 300;

  constructor(
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {}
  
  ngOnInit() {
    // Inicializar todas las tarjetas con showFullContent en false
    if (this.infoCards) {
      this.infoCards.forEach(card => {
        card.showFullContent = false;
      });
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
    this.contentDivs.changes
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        setTimeout(() => {
          this.checkContentHeight();
          this.cdr.detectChanges();
        }, 0);
      });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['infoCards']) {
      // Ejecutar inmediatamente la verificación de altura
      setTimeout(() => {
        this.checkContentHeight();
      }, 0);
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
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