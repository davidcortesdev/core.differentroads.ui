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
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

interface InfoCard {
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
export class TourInfoAccordionComponent implements AfterViewInit, OnChanges {
  @Input() infoCards: InfoCard[] = [];
  @ViewChildren('contentDiv') contentDivs!: QueryList<ElementRef>;

  constructor(
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {}

  // Función trackBy para mejorar el rendimiento de ngFor
  trackByFn(index: number, item: InfoCard): string {
    return `${index}-${item.order}`;
  }

  sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html || '');
  }

  // Method to check if content is long (more than 10 lines)
  isLongContent(content: string): boolean {
    if (!content) return false;
    return content.split('\n').length > 10;
  }

  // Method to get truncated content
  getTruncatedContent(content: string): string {
    if (!content) return '';
    const lines = content.split('\n');
    return lines.slice(0, 10).join('\n');
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.checkContentHeight();
    });

    // Listen for changes to the view children
    this.contentDivs.changes.subscribe(() => {
      setTimeout(() => {
        this.checkContentHeight();
      });
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    // Check when infoCards input changes
    if (changes['infoCards']) {
      setTimeout(() => {
        this.checkContentHeight();
      });
    }
  }

  // Call this when toggling content
  toggleContent(card: InfoCard): void {
    card.showFullContent = !card.showFullContent;
    setTimeout(() => {
      this.checkContentHeight();
      this.cdr.detectChanges();
    });
  }

  // Make sure to call this method when accordion panels are expanded
  onAccordionTabOpen() {
    setTimeout(() => {
      this.checkContentHeight();
    });
  }

  checkContentHeight() {
    if (this.contentDivs) {
      this.contentDivs.forEach((div: ElementRef, index: number) => {
        const element = div.nativeElement;
        const isOverflowing = element.scrollHeight > 300; // 300px is our max-height

        if (isOverflowing) {
          element.parentElement.classList.add('content-overflow');
        } else {
          element.parentElement.classList.remove('content-overflow');
        }
      });
    }
  }
}
