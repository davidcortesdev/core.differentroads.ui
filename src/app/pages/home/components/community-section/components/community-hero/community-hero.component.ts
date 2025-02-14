import { Component, Input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

interface CommunityHero {
  title: string;
  googleRating: number;
  featured: {
    images: string[];
    content: string; // This will contain the Quill HTML content
  };
}

@Component({
  selector: 'app-community-hero',
  standalone: false,
  templateUrl: './community-hero.component.html',
  styleUrl: './community-hero.component.scss',
})
export class CommunityHeroComponent {
  @Input() data!: CommunityHero;

  constructor(private sanitizer: DomSanitizer) {}

  get sanitizedContent(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.data.featured.content);
  }
}
