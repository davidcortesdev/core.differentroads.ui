import { Component, OnInit, Input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { BlockType } from '../../../../core/models/blocks/block.model';
import { FullSliderContent } from '../../../../core/models/blocks/full-slider-content.model';

interface Card {
  id: number;
  description: string;
  image: {
    url: string;
    alt: string;
  };
  link: string;
}

interface ResponsiveOption {
  breakpoint: string;
  numVisible: number;
  numScroll: number;
}

@Component({
  selector: 'app-carousel-section',
  standalone: false,
  templateUrl: './carousel-section.component.html',
  styleUrls: ['./carousel-section.component.scss']
})
export class CarouselSectionComponent implements OnInit {
  @Input() content!: FullSliderContent;
  @Input() type!: BlockType;
  @Input() title!: string;

  cards: Card[] = [];
  textoquill = '';
  responsiveOptions: ResponsiveOption[] = [
    { breakpoint: '1024px', numVisible: 3, numScroll: 1 },
    { breakpoint: '768px', numVisible: 2, numScroll: 1 },
    { breakpoint: '560px', numVisible: 1, numScroll: 1 }
  ];

  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    if (this.isValidContent()) {
      this.textoquill = this.content.content;
      this.initializeCards();
    } else {
      console.error('No cards received or cards array is empty');
    }
  }

  private isValidContent(): boolean {
    return this.type === BlockType.CardSliderVertical 
      && this.content 
      && Array.isArray(this.content['card-list']);
  }

  private initializeCards(): void {
    this.cards = this.content['card-list'].map((card: any, index: number) => ({
      id: index + 1,
      description: card.description,
      image: {
        url: card.image[0].url,
        alt: `Image ${index + 1}`
      },
      link: card.link || '#'
    }));
  }

  sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}