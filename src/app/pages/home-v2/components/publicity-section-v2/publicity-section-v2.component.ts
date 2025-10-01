import { Component } from '@angular/core';
import { PublicityItem } from './interfaces/publicity-section.types';

@Component({
  selector: 'app-publicity-section-v2',
  standalone: false,
  templateUrl: './publicity-section-v2.component.html',
  styleUrls: ['./publicity-section-v2.component.scss'],
})
export class PublicitySectionV2Component {
  texto: PublicityItem[] = [
    {
      id: 1,
      content: 'Altísima calidad final',
      description:
        'Es fácil cuando nuestros expertos han dado la vuelta al mundo.',
      showDescription: false,
    },
    {
      id: 2,
      content: 'Precio más económico',
      description:
        'Productos artesanales que nos permiten ser los más competitivos del mercado.',
      showDescription: false,
    },
    {
      id: 3,
      content: 'Hoteles céntricos categoría superior',
      description:
        'Comodidad garantizada y fácil acceso a todo, brindándote una estancia excepcional.',
      showDescription: false,
    },
    {
      id: 4,
      content: 'Itinerarios y actividades únicas',
      description:
        'Sumérgete en la auténtica esencia de cada destino con aventuras diseñadas especialmente para ti.',
      showDescription: false,
    },
    {
      id: 5,
      content: 'Guías expertos en español',
      description:
        'Una experiencia enriquecedora y sin barreras de idioma para  que no te pierdas nada.',
      showDescription: false,
    },
    {
      id: 6,
      content: 'Mejores horarios de vuelos',
      description:
        'Aprovecha al máximo tu tiempo de viaje desde el inicio del tour y disfruta cada momento de tu aventura.',
      showDescription: false,
    },
  ];
}
