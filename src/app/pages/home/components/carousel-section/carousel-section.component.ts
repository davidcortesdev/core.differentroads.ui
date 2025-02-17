import { Component, OnInit, Input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

type Card = {
  id: number;
  title: string;
  description: string;
  image: any;
  link: string;
};

@Component({
  selector: 'app-carousel-section',
  standalone: false,
  templateUrl: './carousel-section.component.html',
  styleUrls: ['./carousel-section.component.scss'],
})
export class CarouselSectionComponent implements OnInit {
  @Input() cards: Card[] = [
    {
      id: 1,
      title: 'Naturaleza Salvaje',
      description: ' Lorem ipsum dolor sit amet consectetur. Tellus eu nisi facilisi elementum adipiscing sit. ',
      image: { url: 'https://picsum.photos/1000?random=8', alt: 'Placeholder Image 1' },
      
      link: '#'
    },
    {
      id: 2,
      title: 'Card 2',
      description: 'Naturaleza Salvaje',
      image: { url: 'https://picsum.photos/1000?random=9', alt: 'Placeholder Image 2' },
      
      link: '#'
    },
    {
      id: 3,
      title: 'Card 3',
      description: 'Description for card 3',
      image: { url: 'https://picsum.photos/1000?random=10', alt: 'Placeholder Image 3' },
      
      link: '#'
    },
    {
      id: 4,
      title: 'Card 4',
      description: 'Description for card 4',
      image: { url: 'https://picsum.photos/1000?random=11', alt: 'Placeholder Image 4' },
      
      link: '#'
    },
    {
      id: 5,
      title: 'Card 5',
      description: 'Description for card 5',
      image: { url: 'https://picsum.photos/1000?random=12', alt: 'Placeholder Image 5' },
      
      link: '#'
    },
    {
      id: 6,
      title: 'Card 6',
      description: 'Description for card 6',
      image: { url: 'https://picsum.photos/1000?random=13', alt: 'Placeholder Image 6' },
      link: '#'
    },
    {
      id: 7,
      title: 'Card 7',
      description: 'Description for card 7',
      image: { url: 'https://picsum.photos/1000?random=14', alt: 'Placeholder Image 7' },
      link: '#'
    },
    {
      id: 8,
      title: 'Card 8',
      description: 'Description for card 8',
      image: { url: 'https://picsum.photos/1000?random=15', alt: 'Placeholder Image 8' },
      
      link: '#'
    },
    {
      id: 9,
      title: 'Card 9',
      description: 'Description for card 9',
      image: { url: 'https://picsum.photos/1000?random=16', alt: 'Placeholder Image 9' },
      
      link: '#'
    },
    {
      id: 10,
      title: 'Card 10',
      description: 'Description for card 10',
      image: { url: 'https://picsum.photos/1000?random=17', alt: 'Placeholder Image 10' },
      link: '#'
    }
  ]
  ;

  responsiveOptions: { breakpoint: string; numVisible: number; numScroll: number }[] = [];

  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    if (!this.cards) {
      console.error('Cards input is undefined');
    }
    this.responsiveOptions = [
      {
        breakpoint: '1024px',
        numVisible: 3,
        numScroll: 1
      },
      {
        breakpoint: '768px',
        numVisible: 2,
        numScroll: 1
      },
      {
        breakpoint: '560px',
        numVisible: 1,
        numScroll: 1
      }
    ];
  }

  getSanitizedDescription(description: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(description);
  }
}
