import { Component, OnInit, Input } from '@angular/core';
import { SingleFeaturedContent } from '../../../../core/models/blocks/single-featured-content.model';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { BlockType } from '../../../../core/models/blocks/block.model';
import { Router } from '@angular/router';

@Component({
  selector: 'app-highlight-section',
  standalone: false,
  templateUrl: './highlight-section.component.html',
  styleUrls: ['./highlight-section.component.scss'],
})
export class HighlightSectionComponent implements OnInit {
  @Input() content!: SingleFeaturedContent;
  @Input() type!: BlockType;
  public imageUrl!: string;
  public imageAlt!: string;
  public description!: string;
  public buttonUrl!: string;

  constructor(
    private sanitizer: DomSanitizer,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    if (this.content) {
      this.imageUrl = this.content.image[0]?.url || '/image-highligths.jpg';
      this.imageAlt = this.content.image[0]?.alt;
      this.description = this.content.content;
      this.buttonUrl = this.content.link;
      console.log(this.content);
    } else {
      console.error('Content is undefined');
    }
  }

  get sanitizedDescription(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.description);
  }

  navigate(url: string) {
    if (this.isExternalUrl(url)) {
      window.location.href = url;
    } else {
      this.router.navigate([url]);
    }
  }

  private isExternalUrl(url: string): boolean {
    return /^https?:\/\//.test(url);
  }
  onClick() {
    this.navigate(this.buttonUrl);
  }
}
