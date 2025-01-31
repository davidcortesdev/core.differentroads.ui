import { Component } from '@angular/core';

interface Tour {
  imageUrl: string;
  title: string;
  description: string;
  rating: number;
  tag: string;
  price: number;
  availableMonths: string[];
}

@Component({
  selector: 'app-tours-section',
  standalone: false,
  templateUrl: './tours-section.component.html',
  styleUrls: ['./tours-section.component.scss']
})
export class ToursSectionComponent {
  tours: Tour[] = [
    {
      imageUrl: 'assets/images/tours/iceland.jpg',
      title: 'Recorriendo la tierra del hielo y el fuego',
      description: 'Islandia: en 8 días',
      rating: 4.5,
      tag: 'Ahora más barato',
      price: 2545,
      availableMonths: ['JUN', 'JUL', 'AGO', 'SEP']
    },
    {
      imageUrl: 'assets/images/tours/tuscany.jpg',
      title: 'Travesía por los paisajes más bellos de la toscana',
      description: 'Italia: en 8 días',
      rating: 4.5,
      tag: 'Etiqueta destacada',
      price: 1295,
      availableMonths: ['ENE', 'JUL', 'AGO']
    },
    {
      imageUrl: 'assets/images/tours/switzerland.jpg',
      title: 'De los viñedos de Alsacia a los alpes suizos',
      description: 'Suiza y Selva Negra en: 8 días',
      rating: 4.5,
      tag: 'Etiqueta destacada',
      price: 1295,
      availableMonths: ['JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DEC']
    },
    {
      imageUrl: 'assets/images/tours/switzerland.jpg',
      title: 'De los viñedos de Alaska',
      description: 'Alaska asdf ',
      rating: 4.5,
      tag: 'ET',
      price: 1234,
      availableMonths: ['ENE','FEB','MAR','ABR','MAY','JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DEC']
    }
    // ... rest of the tours data
  ];

  responsiveOptions = [
    {
      breakpoint: '1400px',
      numVisible: 3,
      numScroll: 1
    },
    {
      breakpoint: '1024px',
      numVisible: 2,
      numScroll: 1
    },
    {
      breakpoint: '768px',
      numVisible: 1,
      numScroll: 1
    }
  ];
}
