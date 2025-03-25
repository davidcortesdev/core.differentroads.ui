import { Component, OnInit, Input, ChangeDetectorRef } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { BlockType } from '../../../../core/models/blocks/block.model';
import { FullSliderContent } from '../../../../core/models/blocks/full-slider-content.model';
import { Router } from '@angular/router';

type Card = {
  id: number;
  subtitle: string;
  link: string;
  image: { url: string; alt: string };
};

@Component({
  selector: 'app-full-card-section',
  standalone: false,
  templateUrl: './full-card-section.component.html',
  styleUrls: ['./full-card-section.component.scss'],
})
export class FullCardSectionComponent implements OnInit {
  @Input() content!: FullSliderContent;
  @Input() type!: BlockType;
  @Input() title!: string;
  cards: Card[] = [];

  constructor(private sanitizer: DomSanitizer,
    private readonly router: Router) { }

  ngOnInit(): void {
    console.log('Received content:', this.content);
    // console.log('Received title:', this.title);
    // console.log('Received type:', this.type);


    if (this.content && this.content['card-list']) {

      this.cards = this.content['card-list'].map((card: any, index: number) => {

        return {
          id: index + 1,
          subtitle: card.subtitle,
          link: card.link,
          image: {
            url: card.image[0].url,
            alt: `Image ${index + 1}`,
          },
        };
      });
    } else {
      console.error('No cards received or cards array is empty');
    }
  }
  protected sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  onClick(url: string): void {
    this.navigate(url);
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