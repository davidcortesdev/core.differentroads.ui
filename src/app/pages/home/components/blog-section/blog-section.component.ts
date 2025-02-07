// blog-section.component.ts
import { Component, OnInit } from '@angular/core';

interface BlogData {
  id: string;
  title: string;
  subtitle: string;
  slug: string;
  image: { url: string; alt: string }[];
  travels: {
    btntext: string;
    linkTravels: string;
  };
}

@Component({
  selector: 'app-blog-section',
  standalone: false,
  templateUrl: './blog-section.component.html',
  styleUrls: ['./blog-section.component.scss'],
})
export class BlogSectionComponent implements OnInit {
  title = 'No te pierdas nuestro blog';
  blogList: BlogData[] = [
    {
      id: '1',
      title: 'Jordania',
      subtitle: '¿Por qué ha bajado la tasa de turismo en Jordania?',
      slug: 'jordania',
      image: [{ url: 'path/to/image1.png', alt: 'Jordania' }],
      travels: {
        btntext: 'Ver viajes relacionados',
        linkTravels: '#',
      },
    },
    {
      id: '2',
      title: 'Cornejos',
      subtitle: 'Los 10 imprescindibles de tu maleta para viajar donde sea',
      slug: 'cornejos',
      image: [{ url: 'path/to/image2.png', alt: 'Cornejos' }],
      travels: {
        btntext: 'Ver viajes relacionados',
        linkTravels: '#',
      },
    },
    {
      id: '3',
      title: 'Vietnam',
      subtitle: 'Street food en Hanoi, la joya de la ciudad vietnamita',
      slug: 'vietnam',
      image: [{ url: 'path/to/image3.png', alt: 'Vietnam' }],
      travels: {
        btntext: 'Ver viajes relacionados',
        linkTravels: '#',
      },
    },
    {
      id: '4',
      title: 'Burgo',
      subtitle: 'Tours en ruta: descubre el circuito de Centroeuropa',
      slug: 'burgo',
      image: [{ url: 'path/to/image4.png', alt: 'Burgo' }],
      travels: {
        btntext: 'Ver viajes relacionados',
        linkTravels: '#',
      },
    },
  ];

  constructor() {}

  ngOnInit(): void {}
}
