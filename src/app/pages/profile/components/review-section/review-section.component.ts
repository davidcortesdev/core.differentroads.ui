import { Component, OnInit } from '@angular/core';

interface Review {
  destination: string;
  description: string;
  date: string;
  rating: number;
}

@Component({
  selector: 'app-review-section',
  standalone: false,
  templateUrl: './review-section.component.html',
  styleUrls: ['./review-section.component.scss'],
})
export class ReviewSectionComponent implements OnInit {
  reviews: Review[] = [];
  isExpanded: boolean = true;

  ngOnInit() {
    this.reviews = [
      {
        destination: 'Destino',
        description: 'Lorem ipsum dolor sit amet consectetur.',
        date: '01/01/2025',
        rating: 5,
      },
      {
        destination: 'Destino',
        description: 'Lorem ipsum dolor sit amet consectetur.',
        date: '12/05/2024',
        rating: 5,
      },
      {
        destination: 'Destino',
        description:
          'Lorem Ipsum es simplemente el texto de relleno de las imprentas y archivos de texto. Lorem Ipsum ha sido el texto de relleno estándar de las industrias desde el año 1500, cuando un impresor (N. del T. persona que se dedica a la imprenta) desconocido usó una galería de textos y los mezcló de tal manera que logró hacer un libro de textos especimen. No sólo sobrevivió 500 años, sino que tambien ingresó como texto de relleno en documentos electrónicos, quedando esencialmente igual al original. Fue popularizado en los 60s con la creación de las hojas "Letraset", las cuales contenian pasajes de Lorem Ipsum, y más recientemente con software de autoedición, como por ejemplo Aldus PageMaker, el cual incluye versiones de Lorem Ipsum.',
        date: '01/03/2025',
        rating: 5,
      },
    ];
  }

  toggleContent() {
    this.isExpanded = !this.isExpanded;
  }

  getRatingArray(rating: number): number[] {
    return Array(rating).fill(0);
  }
}
