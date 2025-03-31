import { Component, Input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

interface InfoCard {
  title: string;
  content: string;
  order: string;
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
}