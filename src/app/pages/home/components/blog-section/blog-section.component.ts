import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

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
  styleUrls: ['./blog-section.component.scss']
})
export class BlogSectionComponent implements OnInit {
  title = 'No te pierdas nuestro blog';
  blogList: BlogData[] = [
    {
      id: '1',
      subtitle: 'Jordania',
      title: '¿Por qué ha bajado la tasa de turismo en Jordania?',
      slug: 'jordania',
      image: [{ url: 'https://picsum.photos/800/600?random=1', alt: 'Jordania' }],
      travels: {
        btntext: 'Ver viajes relacionados',
        linkTravels: '#'
      }
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
      }
    },
    {
      id: '3',
      subtitle: 'Vietnam',
      title: 'Street food en Hanoi, la joya de la ciudad vietnamita',
      slug: 'vietnam',
      image: [{ url: 'https://picsum.photos/800/600?random=3', alt: 'Vietnam' }],
      travels: {
        btntext: 'Ver viajes relacionados',
        linkTravels: '#'
      }
    },
    {
      id: '4',
      subtitle: 'Burgo',
      title: 'Tours en ruta: descubre el circuito de Centroeuropa',
      slug: 'burgo',
      image: [{ url: 'https://picsum.photos/800/600?random=4', alt: 'Burgo' }],
      travels: {
        btntext: 'Ver viajes relacionados',
        linkTravels: '#'
      }
    }
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {}

  navigateToBlog(slug: string) {
    this.router.navigate(['/blog', slug]);
  }

  navigateToTravels(link: string) {
    window.location.href = link;
  }

  navigateToAllBlogs() {
    this.router.navigate(['/blog']);
  }
}