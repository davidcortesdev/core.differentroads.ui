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
  selector: 'app-community-hero-v2',
  standalone: false,
  templateUrl: './community-hero-v2.component.html',
  styleUrl: './community-hero-v2.component.scss',
})
export class CommunityHeroV2Component {
  @Input() data!: CommunityHero;

  constructor(private sanitizer: DomSanitizer) {}

  get sanitizedContent(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.data.featured.content);
  }
}
