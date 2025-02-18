import { Component } from '@angular/core';

@Component({
  selector: 'app-publicity-section',
  standalone: false,
  templateUrl: './publicity-section.component.html',
  styleUrls: ['./publicity-section.component.scss'],
})
export class PublicitySectionComponent {
  texto = [
    { id: 1, content: 'Altísima calidad final' },
    { id: 2, content: 'Precio más económico' },
    { id: 3, content: 'Hoteles céntricos categoría superior' },
    { id: 4, content: 'Itinerarios y actividades únicas' },
    { id: 5, content: 'Guías expertos en español' },
    { id: 6, content: 'Mejores horarios de vuelos' },
  ];
}
