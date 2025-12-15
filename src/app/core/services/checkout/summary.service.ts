import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Order, OrderTraveler } from '../../models/orders/order.model';

@Injectable({
  providedIn: 'root',
})
export class SummaryService {
  private orderSource = new BehaviorSubject<Order | null>(null);
  order$ = this.orderSource.asObservable();

  updateOrder(order: Order) {
    // Eliminamos logs innecesarios relacionados con estado previo o posterior
    // Actualizamos el BehaviorSubject sin logs adicionales
    this.orderSource.next(order);
  }

  addTravelers(travelers: OrderTraveler[]) {
    const currentOrder = this.orderSource.getValue();
    if (currentOrder) {
      currentOrder.travelers = [
        ...(currentOrder.travelers || []),
        ...travelers,
      ];
      this.orderSource.next(currentOrder);
    }
  }

  updateOrderSummaryWithRooms(
    roomSummary: { name: string; quantity: number }[]
  ) {
    // Logic to update the order summary with the room summary

  }

  getOrderValue(): Order | null {
    const order = this.orderSource?.getValue();
    // No hacemos console.log aquí para evitar spam, ya que se llama con frecuencia
    return order;
  }
}
