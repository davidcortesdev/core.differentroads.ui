import { Component } from '@angular/core';

@Component({
  selector: 'app-publicity-section',
  standalone: false,
  templateUrl: './publicity-section.component.html',
  styleUrls: ['./publicity-section.component.scss'],
})
export class PublicitySectionComponent {
  texto = [
    {
      id: 1,
      content: 'Altísima calidad final',
      description:
        'Es fácil cuando nuestros expertos han dado la vuelta al mundo.',
      showDescription: false,
      showReadMore: false,
    },
    {
      id: 2,
      content: 'Precio más económico',
      description:
        'Productos artesanales que nos permiten ser los más competitivos del mercado.',
      showDescription: false,
      showReadMore: false,
    },
    {
      id: 3,
      content: 'Hoteles céntricos categoría superior',
      description:
        'Comodidad garantizada y fácil acceso a todo, brindándote una estancia excepcional.',
      showDescription: false,
      showReadMore: false,
    },
    {
      id: 4,
      content: 'Itinerarios y actividades únicas',
      description:
        'Sumérgete en la auténtica esencia de cada destino con aventuras diseñadas especialmente para ti.',
      showDescription: false,
      showReadMore: false,
    },
    {
      id: 5,
      content: 'Guías expertos en español',
      description:
        'Una experiencia enriquecedora y sin barreras de idioma para  que no te pierdas nada.',
      showDescription: false,
      showReadMore: false,
    },
    {
      id: 6,
      content: 'Mejores horarios de vuelos',
      description:
        'Aprovecha al máximo tu tiempo de viaje desde el inicio del tour y disfruta cada momento de tu aventura.',
      showDescription: false,
      showReadMore: false,
    },
  ];

  toggleDescription(id: number) {
    const item = this.texto.find((item) => item.id === id);
    if (item) {
      item.showDescription = !item.showDescription;
    }
  }

  hideReadMore(id: number) {
    const item = this.texto.find((item) => item.id === id);
    if (item) {
      item.showReadMore = false;
    }
  }
}
