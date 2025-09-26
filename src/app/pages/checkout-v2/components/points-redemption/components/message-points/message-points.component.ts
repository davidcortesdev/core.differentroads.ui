import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-message-points',
  templateUrl: './message-points.component.html',
  styleUrls: ['./message-points.component.scss'],
  standalone: false
})
export class MessagePointsComponent {
  @Input() totalPrice: number = 0;
  @Input() paymentType: 'complete' | 'deposit' | 'installments' = 'complete';

  /**
   * Calcula los puntos que se ganarán con esta reserva (3% del precio)
   */
  getEarnedPoints(): number {
    const basePrice = this.getDisplayPrice();
    return Math.floor(basePrice * 0.03); // 3% del precio
  }

  /**
   * Obtiene el precio base para el cálculo de puntos
   */
  getBasePrice(): number {
    return this.paymentType === 'deposit' ? this.totalPrice : this.totalPrice;
  }

  /**
   * Verifica si debe mostrar el mensaje
   */
  shouldShowMessage(): boolean {
    // Mostrar siempre para desarrollo, o cuando hay precio
    return true; // Cambiar a this.totalPrice > 0 en producción
  }

  /**
   * Obtiene el precio para mostrar (mock si es 0)
   */
  getDisplayPrice(): number {
    return this.totalPrice > 0 ? this.totalPrice : 1000; // Mock para desarrollo
  }
}
