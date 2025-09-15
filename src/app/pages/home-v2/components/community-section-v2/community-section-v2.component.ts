import { Component } from '@angular/core';

@Component({
  selector: 'app-community-section-v2',
  standalone: false,
  templateUrl: './community-section-v2.component.html',
  styleUrls: ['./community-section-v2.component.scss'],
})
export class CommunitySectionV2Component {
  // Este componente ahora solo actúa como contenedor
  // Los componentes hijos (community-hero-v2 y community-gallery-v2)
  // obtienen sus propios datos usando los servicios de home section
}
