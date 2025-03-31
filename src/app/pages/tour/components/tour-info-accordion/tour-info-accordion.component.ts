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
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';

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
  implements AfterViewInit, OnChanges, OnDestroy
{
  @Input() infoCards: InfoCard[] = [];
  @ViewChildren('contentDiv') contentDivs!: QueryList<ElementRef>;

  private contentHeightCheck$ = new Subject<void>();
  private destroy$ = new Subject<void>();
  private readonly MAX_HEIGHT = 300; // Extract magic number to constant

  constructor(
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {}

  ngAfterViewInit() {
    // Setup debounced content height check
    this.contentHeightCheck$
      .pipe(debounceTime(100), takeUntil(this.destroy$))
      .subscribe(() => this.checkContentHeight());

    // Initial check
    this.contentHeightCheck$.next();

    // Listen for changes to the view children
    this.contentDivs.changes
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.contentHeightCheck$.next());
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['infoCards']) {
      this.contentHeightCheck$.next();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Función trackBy para mejorar el rendimiento de ngFor
  trackByFn(index: number, item: InfoCard): string {
    return `${index}-${item.order}`;
  }

  sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html || '');
  }

  // Call this when toggling content
  toggleContent(card: InfoCard): void {
    card.showFullContent = !card.showFullContent;
    this.contentHeightCheck$.next();
    this.cdr.detectChanges();
  }

  // Make sure to call this method when accordion panels are expanded
  onAccordionTabOpen() {
    this.contentHeightCheck$.next();
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
  }
}
