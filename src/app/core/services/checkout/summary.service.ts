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
    console.log('SummaryService: Actualizando orden');
    
    // Registrar estado de actividades opcionales antes de actualizar
    const currentOrder = this.getOrderValue();
    if (currentOrder?.optionalActivitiesRef) {
      console.log('SummaryService: Estado ANTES de actualizar:', 
        currentOrder.optionalActivitiesRef.map(ref => ({
          activityId: ref.id,
          viajeros: ref.travelersAssigned,
          totalViajeros: ref.travelersAssigned.length
        }))
      );
    }
    
    // Registrar las nuevas actividades opcionales que se están actualizando
    if (order.optionalActivitiesRef) {
      console.log('SummaryService: Nuevas actividades recibidas:', 
        order.optionalActivitiesRef.map(ref => ({
          activityId: ref.id,
          viajeros: ref.travelersAssigned,
          totalViajeros: ref.travelersAssigned.length
        }))
      );
    }
    
    // Actualizar el BehaviorSubject
    this.orderSource.next(order);
    
    // Verificar que la actualización se realizó correctamente
    console.log('SummaryService: Estado DESPUÉS de actualizar:', 
      this.getOrderValue()?.optionalActivitiesRef?.map(ref => ({
        activityId: ref.id,
        viajeros: ref.travelersAssigned,
        totalViajeros: ref.travelersAssigned.length
      }))
    );
  }
  
  addTravelers(travelers: OrderTraveler[]) {
    const currentOrder = this.orderSource.getValue();
    if (currentOrder) {
      console.log('SummaryService: Añadiendo viajeros:', travelers.length);
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
    console.log('Updating order summary with rooms:', roomSummary);
  }

  getOrderValue(): Order | null {
    const order = this.orderSource?.getValue();
    // No hacemos console.log aquí para evitar spam, ya que se llama con frecuencia
    return order;
  }
}