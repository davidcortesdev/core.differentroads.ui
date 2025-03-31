import { Component, Input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

interface InfoCard {
  title: string;
  content: string;
  order: string;
  showFullContent?: boolean; // Add this property to track expanded state
}

@Component({
  selector: 'app-tour-info-accordion',
  standalone: false,
  templateUrl: './tour-info-accordion.component.html',
  styleUrl: './tour-info-accordion.component.scss',
})
export class TourInfoAccordionComponent {
  @Input() infoCards: InfoCard[] = [];
  
  constructor(private sanitizer: DomSanitizer) {}
  
  // Función trackBy para mejorar el rendimiento de ngFor
  trackByFn(index: number, item: InfoCard): string {
    return `${index}-${item.order}`;
  }
  
  sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html || '');
  }

  // Method to toggle content visibility
  toggleContent(card: InfoCard): void {
    card.showFullContent = !card.showFullContent;
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
}