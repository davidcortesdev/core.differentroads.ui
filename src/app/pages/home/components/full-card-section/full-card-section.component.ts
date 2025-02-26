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
  @Input() content!: FullSliderContent;
  @Input() type!: BlockType;
  @Input() title!: string;
  cards: Card[] = []; 

  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    console.log('Received content:', this.content);
    console.log('Received title:', this.title);
    console.log('Received type:', this.type);

  
  if (this.content && this.content['card-list']) {
    
    this.cards = this.content['card-list'].map((card: any, index: number) => {
      
      const { title, description } = this.extractTitleAndDescriptionFromHtml(card.subtitle);

      return {
        id: index + 1, 
        title: title, 
        description: description, 
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


extractTitleAndDescriptionFromHtml(html: string): { title: string, description: string } {
  const div = document.createElement('div');
  div.innerHTML = html;

  
  const strongElements = div.querySelectorAll('strong');

  
  const title = strongElements[0]?.textContent || '';

  
  const description = strongElements[1]?.textContent || '';

  return { title, description };
}

getSanitizedDescription(description: string): SafeHtml {
  return this.sanitizer.bypassSecurityTrustHtml(description);
}
}