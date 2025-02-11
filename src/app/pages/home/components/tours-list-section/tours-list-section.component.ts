import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

interface Tour {
  imageUrl: string;
  title: string;
  description: string;
  rating: number;
  tag: string;
  price: number;
  availableMonths: string[];
  isByDr: boolean;
}

@Component({
  selector: 'app-tours-list-section',
  standalone: false,
  templateUrl: './tours-list-section.component.html',
  styleUrls: ['./tours-list-section.component.scss'],
})
export class ToursListComponent implements OnInit {
  tours: Tour[] = [
    {
      imageUrl: 'https://picsum.photos/800/800?random=1',
      title: 'Recorriendo la tierra del hielo y el fuego',
      description: 'Islandia en 8 días',
      rating: 4.5,
      tag: 'Ahora más barato',
      price: 2545,
      availableMonths: ['JUN', 'JUL', 'AGO', 'SEP'],
      isByDr: true,
    },
    {
      imageUrl: 'https://picsum.photos/800/800?random=2',
      title: 'Travesía por los paisajes más bellos de la toscana',
      description: 'Italia en 8 días',
      rating: 4.5,
      tag: 'Etiqueta destacada',
      price: 1295,
      availableMonths: ['ENE', 'JUL', 'AGO'],
      isByDr: false,
    },
    {
      imageUrl: 'https://picsum.photos/800/800?random=3',
      title: 'De los viñedos de Alsacia a los alpes suizos',
      description: 'Suiza y Selva Negra en: 8 días',
      rating: 4.5,
      tag: 'Etiqueta destacada',
      price: 1295,
      availableMonths: ['JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DEC'],
      isByDr: true,
    },
    {
      imageUrl: 'https://picsum.photos/800/800?random=4',
      title: 'De los viñedos de Alaska',
      description: 'Alaska asdf ',
      rating: 4.5,
      tag: 'ET',
      price: 1234,
      availableMonths: [
        'ENE',
        'FEB',
        'MAR',
        'ABR',
        'MAY',
        'JUN',
        'JUL',
        'AGO',
        'SEP',
        'OCT',
        'NOV',
        'DEC',
      ],
      isByDr: false,
    },
    {
      imageUrl: 'https://picsum.photos/800/800?random=5',
      title: 'Recorriendo la tierra del hielo y el fuego',
      description: 'Islandia en 8 días',
      rating: 4.5,
      tag: 'Ahora más barato',
      price: 2545,
      availableMonths: ['JUN', 'JUL', 'AGO', 'SEP'],
      isByDr: true,
    },
    {
      imageUrl: 'https://picsum.photos/800/800?random=6',
      title: 'Travesía por los paisajes más bellos de la toscana',
      description: 'Italia en 8 días',
      rating: 4.5,
      tag: 'Etiqueta destacada',
      price: 1295,
      availableMonths: ['ENE', 'JUL', 'AGO'],
      isByDr: false,
    },
    {
      imageUrl: 'https://picsum.photos/800/800?random=7',
      title: 'De los viñedos de Alsacia a los alpes suizos',
      description: 'Suiza y Selva Negra en: 8 días',
      rating: 4.5,
      tag: 'Etiqueta destacada',
      price: 1295,
      availableMonths: ['JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DEC'],
      isByDr: true,
    },
    {
      imageUrl: 'https://picsum.photos/800/800?random=8',
      title: 'De los viñedos de Alaska',
      description: 'Alaska asdf ',
      rating: 4.5,
      tag: 'ET',
      price: 1234,
      availableMonths: [
        'ENE',
        'FEB',
        'MAR',
        'ABR',
        'MAY',
        'JUN',
        'JUL',
        'AGO',
        'SEP',
        'OCT',
        'NOV',
        'DEC',
      ],
      isByDr: false,
    },
    {
      imageUrl: 'https://picsum.photos/800/800?random=9',
      title: 'De los viñedos de Alsacia a los alpes suizos',
      description: 'Suiza y Selva Negra en: 8 días',
      rating: 4.5,
      tag: 'Etiqueta destacada',
      price: 1295,
      availableMonths: ['JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DEC'],
      isByDr: true,
    },
  ];

  layout: 'grid' | 'list' = 'grid';
  showMoreButton: boolean = false;
  displayedTours: Tour[] = [];
  private readonly maxDisplayedTours = 8;

  constructor(private router: Router) {}

  ngOnInit() {
    this.displayedTours = this.tours.slice(0, this.maxDisplayedTours);
    this.showMoreButton = this.tours.length > this.maxDisplayedTours;
  }

  navigateToAllContents(type: string) {
    this.router.navigate(['/tours']);
  }
}
