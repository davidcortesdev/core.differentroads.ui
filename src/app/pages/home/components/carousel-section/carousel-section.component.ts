import { Component, OnInit, Input, ChangeDetectorRef } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { BlockType } from '../../../../core/models/blocks/block.model';
import { FullSliderContent } from '../../../../core/models/blocks/full-slider-content.model';

type Card = {
  id: number;
  titlegeneral: string;
  descriptiongeneral: string;
  title?: string;
  description: string;
  image: { url: string; alt: string };
  link: string;
};

@Component({
  selector: 'app-carousel-section',
  standalone: false,
  templateUrl: './carousel-section.component.html',
  styleUrls: ['./carousel-section.component.scss'],
})
export class CarouselSectionComponent implements OnInit {
  @Input() content!: FullSliderContent;
  @Input() type!: BlockType;
  @Input() title!: string;
  titlegeneral: string = ''; 
  descriptiongeneral: string = ''; 
  cards: Card[] = [];

  responsiveOptions: { breakpoint: string; numVisible: number; numScroll: number }[] = [];

  constructor(private sanitizer: DomSanitizer, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    if (this.type === BlockType.CardSliderVertical && this.content && this.content['card-list']) {
      const { titlegeneral, descriptiongeneral } = this.extractTitleAndDescriptionFromHtmlGeneral(this.content.content);
      this.titlegeneral = titlegeneral; 
      this.descriptiongeneral = descriptiongeneral; 

      
      this.cards = this.content['card-list'].map((card: any, index: number) => {
        if (card.title === undefined) {
          const { title, description } = this.extractTitleAndDescriptionFromHtml(card.description);
          return {
            id: index + 1,
            titlegeneral: titlegeneral,
            descriptiongeneral: descriptiongeneral,
            title: title,
            description: description,
            image: {
              url: card.image[0].url,
              alt: `Image ${index + 1}`,
            },
            link: card.link || '#',
          };
        } else {
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = card.description || '';
          const cleanDescription = tempDiv.textContent || tempDiv.innerText || '';
          return {
            id: index + 1,
            titlegeneral: titlegeneral,
            descriptiongeneral: descriptiongeneral,
            title: card.title,
            description: cleanDescription.trim(),
            image: {
              url: card.image[0].url,
              alt: `Image ${index + 1}`,
            },
            link: card.link || '#',
          };
        }
      });
    } else {
      console.error('No cards received or cards array is empty');
    }

    this.responsiveOptions = [
      {
        breakpoint: '1024px',
        numVisible: 3,
        numScroll: 1,
      },
      {
        breakpoint: '768px',
        numVisible: 2,
        numScroll: 1,
      },
      {
        breakpoint: '560px',
        numVisible: 1,
        numScroll: 1,
      },
    ];
  }

  extractTitleAndDescriptionFromHtml(html: string): { title: string, description: string } {
    const div = document.createElement('div');
    div.innerHTML = html;

    const titleElement = div.querySelector('em');
    const descriptionElement = div.querySelector('span');

    const title = titleElement?.textContent || '';
    const description = descriptionElement?.textContent || '';

    return { title, description };
  }

  extractTitleAndDescriptionFromHtmlGeneral(html: string): { titlegeneral: string, descriptiongeneral: string } {
    const div = document.createElement('div');
    div.innerHTML = html;

    const titleElement = div.querySelector('strong');
    const titlegeneral = titleElement?.textContent || '';


    const descriptionElement = div.querySelector('span');
    const descriptiongeneral = descriptionElement?.textContent || '';

    return { titlegeneral, descriptiongeneral };
  }

  getSanitizedDescription(description: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(description);
  }
}