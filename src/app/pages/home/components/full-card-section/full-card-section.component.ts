import { Component, OnInit, Input, ChangeDetectorRef } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { BlockType } from '../../../../core/models/blocks/block.model';
import { FullSliderContent } from '../../../../core/models/blocks/full-slider-content.model';

type Card = {
  id: number;
  title?: string;
  description: string;
  image: { url: string; alt: string };
};

@Component({
  selector: 'app-full-card-section',
  standalone: false,
  templateUrl: './full-card-section.component.html',
  styleUrls: ['./full-card-section.component.scss'],
})
export class FullCardSectionComponent implements OnInit {
  @Input() content!: Card[];
  @Input() type!: BlockType;
  @Input() title!: string;
  cards: Card[] = [
    {
      id: 1,
      title: 'aaaDescubriendo monasterios en la cima del mundo',
      description: 'Armenia y Georgia en: 12 noches',
      image: { url: 'https://picsum.photos/1000?random=20', alt: 'Image 1' },
    },
    {
      id: 2,
      title: 'aaaaSiguiendo el legado de la ruta de la seda',
      description: 'Uzbekistán en: 10 días ',
      image: { url: 'https://picsum.photos/1000?random=15', alt: 'Image 2' },
    },
    {
      id: 3,
      title: 'aaaaaPrimavera sakura en la ciudad del sol naciente',
      description: 'Japón en: 11 días ',
      image: { url: 'https://picsum.photos/1000?random=16', alt: 'Image 3' },
    },
  ];

  constructor(private sanitizer: DomSanitizer) {}
  ngOnInit(): void {
    console.log('this.content', this.content);

    if (!this.cards || this.cards.length !== 3) {
      console.error(
        'Cards input is undefined or does not contain exactly 3 cards'
      );
    }
  }

  getSanitizedDescription(description: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(description);
  }
}
