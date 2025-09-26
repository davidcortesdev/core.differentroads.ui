import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-message-points',
  templateUrl: './message-points.component.html',
  styleUrls: ['./message-points.component.scss'],
  standalone: false
})
export class MessagePointsComponent {
  @Input() totalPrice: number = 0;

  /**
   * Calcula los puntos que se ganarán con esta reserva (3% del precio)
   */
  getEarnedPoints(): number {
    const basePrice = this.getDisplayPrice();
    return Math.floor(basePrice * 0.03); // 3% del precio
  }

  /**
   * Obtiene el precio para mostrar (mock si es 0)
   */
  getDisplayPrice(): number {
    return this.totalPrice > 0 ? this.totalPrice : 1000; // Mock para desarrollo
  }
}
