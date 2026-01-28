import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface TopTrustItem {
  icon: string;
  text: string;
}

@Component({
  selector: 'app-top-trust-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './top-trust-bar.component.html',
  styleUrls: ['./top-trust-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopTrustBarComponent {
  items: TopTrustItem[] = [
    { icon: 'pi pi-star', text: 'Criterio experto' },
    { icon: 'pi pi-shield', text: 'Operación directa (DR)' },
    { icon: 'pi pi-map-marker', text: 'Travel Experience' },
    { icon: 'pi pi-euro', text: 'Reserva con 299€' },
  ];
}

