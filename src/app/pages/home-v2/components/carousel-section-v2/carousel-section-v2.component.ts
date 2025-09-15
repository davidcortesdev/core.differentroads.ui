import {
  Component,
  OnInit,
  Input,
  ChangeDetectionStrategy,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { BlockType } from '../../../../core/models/blocks/block.model';
import { FullSliderContent } from '../../../../core/models/blocks/full-slider-content.model';
import {
  CarouselCard,
  ResponsiveOption,
} from '../../../../core/models/carousel.model';
import { CAROUSEL_CONFIG } from '../../../../shared/constants/carousel.constants';
@Component({
  selector: 'app-carousel-section-v2',
  standalone: false,
  templateUrl: './carousel-section-v2.component.html',
  styleUrls: ['./carousel-section-v2.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarouselSectionV2Component implements OnInit {
  @Input() content!: FullSliderContent;
  @Input() type!: BlockType;
  @Input() title!: string;
  protected carouselConfig = CAROUSEL_CONFIG;

  protected cards: CarouselCard[] = [];
  protected textoquill = '';
  protected readonly responsiveOptions: ResponsiveOption[] = [
    { breakpoint: '1024px', numVisible: 3, numScroll: 1 },
    { breakpoint: '768px', numVisible: 2, numScroll: 1 },
    { breakpoint: '560px', numVisible: 1, numScroll: 1 },
  ];

  constructor(
    private readonly sanitizer: DomSanitizer,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    if (this.isValidContent()) {
      this.initializeCarousel();
    } else {
      console.error('No cards received or cards array is empty');
    }
  }

  protected sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  protected onClick(link: string): void {
    this.navigate(link);
  }

  private initializeCarousel(): void {
    this.textoquill = this.content.content;
    this.initializeCards();
  }

  private isValidContent(): boolean {
    return (
      this.type === BlockType.CardSliderVertical &&
      this.content &&
      Array.isArray(this.content['card-list'])
    );
  }

  private initializeCards(): void {
    this.cards = this.content['card-list'].map((card: any, index: number) => ({
      id: index + 1,
      description: card.description,
      image: {
        url:
          card.image && Array.isArray(card.image) && card.image.length > 0
            ? card.image[0].url
            : '',
        alt: `Image ${index + 1}`,
      },
      buttonText: card.textButton,
      link: card.link || '',
    }));
  }

  private navigate(url: string): void {
    this.isExternalUrl(url)
      ? (window.location.href = url)
      : this.router.navigate([url]);
  }

  private isExternalUrl(url: string): boolean {
    return /^https?:\/\//.test(url);
  }
}
