import { Component, OnInit, Input, ChangeDetectorRef } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { BlockType } from '../../../../core/models/blocks/block.model';
import { FullSliderContent } from '../../../../core/models/blocks/full-slider-content.model';

type Card = {
  id: number;
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
  textoquill: string='';

  responsiveOptions: { breakpoint: string; numVisible: number; numScroll: number }[] = [];

  constructor(private sanitizer: DomSanitizer, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    console.log('this.content', this.content);
    if (this.type === BlockType.CardSliderVertical && this.content && this.content['card-list']) {
      this.textoquill = this.content.content;

      
      this.cards = this.content['card-list'].map((card: any, index: number) => {
        
          return {
            id: index + 1,
            description: card.description,
            image: {
              url: card.image[0].url,
              alt: `Image ${index + 1}`,
            },
            link: card.link || '#',
          };
        
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

  sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}