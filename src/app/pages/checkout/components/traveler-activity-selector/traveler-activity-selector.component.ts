import { Component, OnInit } from '@angular/core';
import { SummaryService } from '../../../../core/services/checkout/summary.service';
import { ActivitiesService } from '../../../../core/services/checkout/activities.service';
import { Activity } from '../../../../core/models/tours/activity.model';
import { TravelersService } from '../../../../core/services/checkout/travelers.service';
import { Order, OrderTraveler } from '../../../../core/models/orders/order.model';

@Component({
  selector: 'app-traveler-activity-selector',
  standalone: false,
  templateUrl: './traveler-activity-selector.component.html',
  styleUrls: ['./traveler-activity-selector.component.scss']
})
export class TravelerActivitySelectorComponent implements OnInit {
  activities: Activity[] = [];
  
  // Mapa simple para actividades seleccionadas
  selectedActivities: {[activityId: string]: boolean} = {};

  constructor(
    private activitiesService: ActivitiesService,
    private summaryService: SummaryService,
    private travelersService: TravelersService
  ) {}

  ngOnInit(): void {
    // Obtener actividades
    this.activitiesService.activities$.subscribe(activities => {
      this.activities = activities;
      this.initializeSelections();
    });
  }

  // Inicializar selecciones
  initializeSelections(): void {
    this.activities.forEach(activity => {
      // Inicializar todas las actividades como seleccionadas por defecto
      if (this.selectedActivities[activity.activityId] === undefined) {
        this.selectedActivities[activity.activityId] = true; // Inicialmente seleccionadas
      }
    });
    
    // Actualizar el resumen del pedido con las actividades inicializadas
    this.updateOrderSummary();
  }

  // Cambiar selección de actividad
  toggleActivity(activity: Activity): void {
    // El valor ya está actualizado por el two-way binding de ngModel
    
    // Filtrar actividades seleccionadas
    const updatedActivities = this.activities.filter(act => 
      act.activityId === activity.activityId ? this.selectedActivities[act.activityId] : true
    );
    
    // Actualizar en el servicio
    this.activitiesService.updateActivities(updatedActivities);
    
    // Actualizar orden
    this.updateOrderSummary();
  }

  // Comprobar si una actividad está seleccionada
  isActivitySelected(activity: Activity): boolean {
    return this.selectedActivities[activity.activityId] || false;
  }

  // Actualizar resumen del pedido
  updateOrderSummary(): void {
    const currentOrder = this.summaryService.getOrderValue();
    if (!currentOrder) return;
    
    // Obtener actividades seleccionadas
    const selectedActivities = this.activities.filter(
      activity => this.selectedActivities[activity.activityId]
    );
    
    // Obtener los viajeros actuales con un tipo seguro
    const travelersData: OrderTraveler[] = this.travelersService.getTravelers();
    
    // Actualizar la lista de actividades opcionales en el pedido
    if (Array.isArray(currentOrder.optionalActivitiesRef)) {
      // Crear la nueva lista de actividades opcionales
      const optionalActivitiesRef = selectedActivities.map(activity => {
        return {
          id: activity.activityId,
          _id: activity.id,
          travelersAssigned: travelersData.map(traveler => {
            // Usar el ID del viajero de manera segura
            return traveler._id || (traveler as any).id || '123';
          })
        };
      });
      
      // Asignar la nueva lista al pedido actual
      currentOrder.optionalActivitiesRef = optionalActivitiesRef;
      
      // Actualizar pedido en el servicio
      this.summaryService.updateOrder(currentOrder);
    }
  }
}