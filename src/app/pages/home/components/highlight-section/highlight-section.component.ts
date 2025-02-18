import { Component, OnInit, Input } from '@angular/core';
import { SingleFeaturedContent } from '../../../../core/models/blocks/single-featured-content.model';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { BlockType } from '../../../../core/models/blocks/block.model';
import { Router } from '@angular/router';

@Component({
  selector: 'app-highlight-section',
  standalone: false,
  templateUrl: './highlight-section.component.html',
  styleUrls: ['./highlight-section.component.scss']
})
export class HighlightSectionComponent implements OnInit {
  @Input() content!: SingleFeaturedContent;
  @Input() type!: BlockType;
  
  imageUrl = '/image-highligths.jpg';
  imageAlt = '';
  description = '';
  buttonUrl = '';

  constructor(
    private sanitizer: DomSanitizer,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    if (!this.content) {
      console.error('Content is undefined');
      return;
    }

    this.imageUrl = this.content.image[0]?.url ?? this.imageUrl;
    this.imageAlt = this.content.image[0]?.alt ?? '';
    this.description = this.content.content ?? '';
    this.buttonUrl = this.content.link ?? '';
  }

  get sanitizedDescription(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.description);
  }

  onClick(): void {
    this.navigate(this.buttonUrl);
  }

  private navigate(url: string): void {
    this.isExternalUrl(url) 
      ? window.location.href = url
      : this.router.navigate([url]);
  }

  private isExternalUrl(url: string): boolean {
    return /^https?:\/\//.test(url);
  }
}
