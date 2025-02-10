import { Component, OnInit, Inject } from '@angular/core';
import { SingleFeaturedContent } from '../../../../core/models/blocks/single-featured-content.model';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-highlight-section',
  standalone: false,
  templateUrl: './highlight-section.component.html',
  styleUrls: ['./highlight-section.component.scss'],
})
export class HighlightSectionComponent implements OnInit {
  public imageUrl!: string;
  public imageAlt!: string;
  public description!: string;
  public buttonUrl!: string;

  constructor(
    @Inject('content') public content: SingleFeaturedContent,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    if (this.content) {
      this.imageUrl = this.content.image[0]?.url || '/image-highligths.jpg';
      this.imageAlt = this.content.image[0]?.alt;
      this.description = this.content.content;
      this.buttonUrl = this.content.link;
      console.log('Received content:', this.content);
    } else {
      console.error('Content is undefined');
    }
  }

  get sanitizedDescription(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.description);
  }
}
