import { Component } from '@angular/core';
import { Router } from '@angular/router';

interface ContentData {
  id: string;
  title: string;
  subtitle: string;
  slug: string;
  image: { url: string; alt: string }[];
  travels?: {
    btntext: string;
    linkTravels: string;
  };
  type: 'blog' | 'press'; // Campo para identificar el tipo de contenido
}

@Component({
  selector: 'app-content-list',
  standalone: false,
  templateUrl: './content-list-section.component.html',
  styleUrls: ['./content-list-section.component.scss']
})
export class ContentListComponent {
  blogList: ContentData[] = []; // Lista de artículos del blog
  pressList: ContentData[] = []; // Lista de artículos de prensa
  showMoreButtonBlog: boolean = false; // Habilitar el botón "Ver más" para blog
  showMoreButtonPress: boolean = false; // Habilitar el botón "Ver más" para prensa
  blogTitle: string = ''; // Título dinámico para la sección de blog
  pressTitle: string = ''; // Título dinámico para la sección de prensa

  constructor(private router: Router) {}

  ngOnInit() {
    this.loadContent();
  }

  loadContent() {
    // Lista de artículos del blog
    this.blogList = [
      {
        id: '1',
        subtitle: 'Jordania',
        title: '¿Por qué ha bajado la tasa de turismo en Jordania?',
        slug: 'jordania',
        image: [{ url: 'https://picsum.photos/800/600?random=1', alt: 'Jordania' }],
        travels: {
          btntext: 'Ver viajes relacionados',
          linkTravels: '#'
        },
        type: 'blog'
      },
      {
        id: '2',
        subtitle: 'Cornejos',
        title: 'Los 10 imprescindibles de tu maleta para viajar donde sea',
        slug: 'cornejos',
        image: [{ url: 'https://picsum.photos/800/600?random=2', alt: 'Cornejos' }],
        travels: {
          btntext: 'Ver viajes relacionados',
          linkTravels: '#'
        },
        type: 'blog'
      },
      {
        id: '3',
        subtitle: 'Cornejos',
        title: 'Los 10 imprescindibles de tu maleta para viajar donde sea',
        slug: 'cornejos',
        image: [{ url: 'https://picsum.photos/800/600?random=3', alt: 'Cornejos' }],
        travels: {
          btntext: 'Ver viajes relacionados',
          linkTravels: '#'
        },
        type: 'blog'
      },
      {
        id: '4',
        subtitle: 'Cornejos',
        title: 'Los 10 imprescindibles de tu maleta para viajar donde sea',
        slug: 'cornejos',
        image: [{ url: 'https://picsum.photos/800/600?random=4', alt: 'Cornejos' }],
        travels: {
          btntext: 'Ver viajes relacionados',
          linkTravels: '#'
        },
        type: 'blog'
      },
      {
        id: '5',
        subtitle: 'Cornejos',
        title: 'Los 10 imprescindibles de tu maleta para viajar donde sea',
        slug: 'cornejos',
        image: [{ url: 'https://picsum.photos/800/600?random=5', alt: 'Cornejos' }],
        travels: {
          btntext: 'Ver viajes relacionados',
          linkTravels: '#'
        },
        type: 'blog'
      },
    ];

    // Lista de artículos de prensa
    this.pressList = [
      {
        id: '1',
        subtitle: 'La Vanguardia Magazine',
        title: 'Circuito por el Loira para pasar fin de año.',
        slug: 'jordania',
        image: [{ url: 'https://picsum.photos/800/600?random=3', alt: 'Jordania' }],
        type: 'press'
      },
      {
        id: '2',
        subtitle: 'El País',
        title: 'Los mejores destinos para viajar en 2025 con tu familia',
        slug: 'el-pais',
        image: [{ url: 'https://picsum.photos/800/600?random=4', alt: 'El País' }],
        type: 'press'
      },
      {
        id: '3',
        subtitle: 'La Vanguardia Magazine',
        title: 'Circuito por el Loira para pasar fin de año.',
        slug: 'jordania',
        image: [{ url: 'https://picsum.photos/800/600?random=5', alt: 'Jordania' }],
        type: 'press'
      },
      {
        id: '4',
        subtitle: 'La Vanguardia Magazine',
        title: 'Circuito por el Loira para pasar fin de año.',
        slug: 'jordania',
        image: [{ url: 'https://picsum.photos/800/600?random=6', alt: 'Jordania' }],
        type: 'press'
      },
      {
        id: '5',
        subtitle: 'La Vanguardia Magazine',
        title: 'Circuito por el Loira para pasar fin de año.',
        slug: 'jordania',
        image: [{ url: 'https://picsum.photos/800/600?random=7', alt: 'Jordania' }],
        type: 'press'
      },
    ];

    // Títulos dinámicos
    this.blogTitle = 'No te pierdas nuestro blog';
    this.pressTitle = 'Lo que dicen sobre nosotros';

    // Mostrar el botón "Ver más" si hay más de 4 elementos
    this.showMoreButtonBlog = this.blogList.length > 4;
    this.showMoreButtonPress = this.pressList.length > 4;
  }

  // Navegar a un contenido específico
  navigateToContent(slug: string, type: 'blog' | 'press') {
    this.router.navigate([`/${type}`, slug]);
  }

  // Navegar a la página de viajes
  navigateToTravels(link: string) {
    window.location.href = link;
  }

  // Navegar a la lista completa de contenidos
  navigateToAllContents(type: 'blog' | 'press') {
    this.router.navigate(['#']); // Redirigir a otra página (por ahora '#')
  }
}