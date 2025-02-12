import { Component } from '@angular/core';

@Component({
  selector: 'app-tour-highlights',
  standalone: false,
  
  templateUrl: './tour-highlights.component.html',
  styleUrls: ['./tour-highlights.component.scss']
})
export class TourHighlightsComponent {
  highlights = [
    {
      title: 'Crucero por Geiranger',
      description: 'Emprenderemos un viaje por el fiordo de Geiranger, navegando entre cascadas que parecen danzar para nosotros. Las "Siete Hermanas" y "El Velo de la Novia" nos contarán sus historias mientras nos dejamos maravillar por uno de los paisajes más hermosos del mundo.',
      image: 'https://picsum.photos/1000?random=8',
      included: true
    },
    {
      title: 'Stavanger',
      description: 'Nos sumergiremos en el encantador casco antiguo de Straen, donde sus casas de madera blanca y calles adoquinadas nos harán sentir como en un cuento nórdico. Descubriremos su catedral medieval, una de las más antiguas de Noruega.',
      image: 'https://picsum.photos/1000?random=9',
      included: true
    },
    {
      title: 'Bergen',
      description: 'Exploraremos la mágica Bergen, conentras la ciudad nos envuelve con su calidez entre montañas y fiordos.',
      image: 'https://picsum.photos/1000?random=10',
      included: true
    },
    {
      title: 'Subida al Púlpito',
      description: 'Ascenderemos por senderos serpenteantes hasta alcanzar el mítico Preikestolen. Desde su cima, el Lysefjord se desplegará ante nuestros ojos como un lienzo natural, regalándonos una sensación de libertad que nos conectará con la majestuosidad de Noruega.',
      image: 'https://picsum.photos/1000?random=11',
      optional: true
    }
  ];

  responsiveOptions = [
    {
      breakpoint: '1199px',
      numVisible: 3,
      numScroll: 3
    },
    {
      breakpoint: '991px',
      numVisible: 2,
      numScroll: 2
    },
    {
      breakpoint: '767px',
      numVisible: 1,
      numScroll: 1
    }
  ];
}
