import {
  Component,
  OnInit,
  Input,
  ChangeDetectionStrategy,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { BlockType } from '../../../../core/models/blocks/block.model';
import { FullSliderContent } from '../../../../core/models/blocks/full-slider-content.model';
import { Router } from '@angular/router';

interface Card {
  id: number;
  subtitle: string;
  link: string;
  image: { url: string; alt: string };
}

@Component({
  selector: 'app-full-card-section-v2',
  standalone: false,
  templateUrl: './full-card-section-v2.component.html',
  styleUrls: ['./full-card-section-v2.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FullCardSectionV2Component implements OnInit {
  @Input() content!: FullSliderContent;
  @Input() type!: BlockType;
  @Input() title!: string;
  cards: Card[] = [];

  constructor(
    private sanitizer: DomSanitizer,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.initializeCards();
  }

  protected sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  onClick(url: string): void {
    if (!url) return;
    this.navigate(url);
  }

  trackByCardId(index: number, card: Card): number {
    return card.id;
  }

  private initializeCards(): void {
    if (this.content?.['card-list']?.length) {
      this.cards = this.content['card-list'].map(
        (card: any, index: number) => ({
          id: index + 1,
          subtitle: card.subtitle || '',
          link: card.link || '',
          image: {
            url: card.image?.[0]?.url || '',
            alt: `Image ${index + 1}`,
          },
        })
      );
    } else {
      console.error('No cards received or cards array is empty');
    }
  }

  private navigate(url: string): void {
    this.isExternalUrl(url)
      ? window.open(url, '_blank', 'noopener,noreferrer')
      : this.router.navigate([url]);
  }

  private isExternalUrl(url: string): boolean {
    return /^https?:\/\//.test(url);
  }
}
