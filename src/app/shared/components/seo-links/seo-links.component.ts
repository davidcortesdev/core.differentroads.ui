import { Component, Input } from '@angular/core';

export interface SeoLink {
  href: string;
  text: string;
}

@Component({
  selector: 'app-seo-links',
  standalone: false,
  template: `
    <div style="position: absolute; left: -9999px; top: -9999px; visibility: hidden;">
      <a *ngFor="let link of links" [href]="link.href">{{ link.text }}</a>
    </div>
  `,
  styles: []
})
export class SeoLinksComponent {
  @Input() links: SeoLink[] = [];
}
