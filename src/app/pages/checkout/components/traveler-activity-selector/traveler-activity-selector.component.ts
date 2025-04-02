import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { SummaryService } from '../../../../core/services/checkout/summary.service';
import { ActivitiesService } from '../../../../core/services/checkout/activities.service';
import { Activity } from '../../../../core/models/tours/activity.model';
import { TravelersService } from '../../../../core/services/checkout/travelers.service';
import { Order, OrderTraveler, OptionalActivityRef, SummaryItem } from '../../../../core/models/orders/order.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-traveler-activity-selector',
  standalone: false,
  templateUrl: './traveler-activity-selector.component.html',
  styleUrls: ['./traveler-activity-selector.component.scss']
})
export class TravelerActivitySelectorComponent implements OnInit, OnDestroy {
  @Input() travelerId!: string;
  activities: Activity[] = [];
  selectedActivities: {[activityId: string]: boolean} = {};
  currentTraveler: OrderTraveler | undefined;
  private initialized = false;
  private subscriptions: Subscription[] = [];
  private updatingFromOrder = false; // Flag to prevent circular updates

  constructor(
    private activitiesService: ActivitiesService,
    private summaryService: SummaryService,
    private travelersService: TravelersService
  ) {}

  ngOnInit(): void {
    // Verificar que tengamos un ID válido para evitar inicializaciones duplicadas
    if (!this.travelerId) {
      console.error('No se proporcionó un ID de viajero válido');
      return;
    }
    
    this.loadTravelerData();
    this.loadActivities();
    
    // Suscripción para detectar cambios en la orden
    const orderSub = this.summaryService.order$.subscribe(order => {
      if (!order) return; // Skip if order is null
      
      // Solo sincronizar si no estamos en medio de una actualización
      if (!this.updatingFromOrder) {
        this.updatingFromOrder = true; // Set flag to prevent circular updates
        
        try {
          if (order.optionalActivitiesRef) {
            const travelerActivities = order.optionalActivitiesRef
              .filter(ref => ref.travelersAssigned.includes(this.travelerId));
            
            console.log(`[${this.getViajeroIdentificacion()}] Cambio detectado en order$:`, 
              travelerActivities.map(ref => ref.id));
              
            // Sincronizar selecciones locales con el estado de la orden
            this.syncSelectionWithOrder(order);
          }
        } finally {
          // Always reset the flag
          setTimeout(() => {
            this.updatingFromOrder = false;
          }, 0);
        }
      }
    });
    
    this.subscriptions.push(orderSub);
  }
  
  ngOnDestroy(): void {
    // Limpiar suscripciones para evitar memory leaks
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
  
  // Método para obtener una identificación consistente del viajero para los logs
  private getViajeroIdentificacion(): string {
    if (this.currentTraveler?.travelerData?.name) {
      return `${this.currentTraveler.travelerData.name} (ID: ${this.travelerId.substring(0, 6)}...)`;
    }
    return `Viajero ${this.travelerId.substring(0, 8)}...`;
  }
  
  private loadTravelerData(): void {
    const travelers = this.travelersService.getTravelers();
    // Asegurarse de que solo encontremos un viajero exacto con este ID
    this.currentTraveler = travelers.find(t => t._id === this.travelerId);
    
    if (!this.currentTraveler) {
      console.error(`No se encontró un viajero con ID: ${this.travelerId}`);
    } else {
      console.log(`Viajero cargado: ${this.getViajeroIdentificacion()}`);
    }
  }

  private loadActivities(): void {
    const activitiesSub = this.activitiesService.activities$.subscribe(activities => {
      if (this.initialized) return; // Evitar inicialización duplicada
      
      this.activities = activities;
      console.log(`[${this.getViajeroIdentificacion()}] Actividades cargadas (${activities.length}):`, 
        activities.map(a => a.name || a.id || a.activityId));
      
      this.initializeSelections();
      this.initialized = true;
    });
    
    this.subscriptions.push(activitiesSub);
  }

  initializeSelections(): void {
    const currentOrder = this.summaryService.getOrderValue();
    
    if (!currentOrder || !currentOrder.optionalActivitiesRef) {
      console.log(`[${this.getViajeroIdentificacion()}] No hay orden o actividades opcionales para inicializar`);
      // Inicializar todas como no seleccionadas
      this.activities.forEach(activity => {
        this.selectedActivities[activity.activityId] = false;
      });
      return;
    }
    
    // Mapear actividades existentes para este viajero
    const existingActivities = new Set(
      currentOrder.optionalActivitiesRef
        .filter(ref => ref.travelersAssigned.includes(this.travelerId))
        .map(ref => ref.id)
    );
    
    console.log(`[${this.getViajeroIdentificacion()}] Actividades asignadas al inicializar:`, 
      Array.from(existingActivities));
    
    // Inicializar selecciones basado en datos existentes
    this.activities.forEach(activity => {
      this.selectedActivities[activity.activityId] = existingActivities.has(activity.activityId);
    });
    
    console.log(`[${this.getViajeroIdentificacion()}] Estado inicial de selecciones:`, 
      Object.entries(this.selectedActivities).reduce((acc, [id, selected]) => {
        if (selected) acc.push(id);
        return acc;
      }, [] as string[]));
  }

  // Sincroniza las selecciones locales con el estado actual de la orden
  private syncSelectionWithOrder(order: Order): void {
    if (!order.optionalActivitiesRef) return;
    
    const travelerActivities = new Set(
      order.optionalActivitiesRef
        .filter(ref => ref.travelersAssigned.includes(this.travelerId))
        .map(ref => ref.id)
    );
    
    // Actualizar selecciones locales sin disparar eventos
    let hasChanges = false;
    this.activities.forEach(activity => {
      const shouldBeSelected = travelerActivities.has(activity.activityId);
      if (this.selectedActivities[activity.activityId] !== shouldBeSelected) {
        this.selectedActivities[activity.activityId] = shouldBeSelected;
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      console.log(`[${this.getViajeroIdentificacion()}] Sincronizadas selecciones con la orden actual`);
    }
  }

  toggleActivity(activity: Activity): void {
    // Si estamos actualizando desde la orden, no procesar el toggle
    if (this.updatingFromOrder) return;
    
    const nuevoEstado = this.selectedActivities[activity.activityId];
    console.log(`[${this.getViajeroIdentificacion()}] ${nuevoEstado ? 'MARCÓ' : 'DESMARCÓ'} actividad: ${activity.name || activity.activityId}`);
    
    // Actualizar la orden con el nuevo estado
    this.updateOrderSummary();
  }

  updateOrderSummary(): void {
    const currentOrder = this.summaryService.getOrderValue();
    if (!currentOrder || !this.travelerId) {
      console.error(`[${this.getViajeroIdentificacion()}] No hay orden o ID de viajero para actualizar`);
      return;
    }
    
    // PASO 1: Crear una copia profunda para evitar modificar la referencia original
    const updatedOrder: Order = JSON.parse(JSON.stringify(currentOrder));
    
    // Asegurarse de que optionalActivitiesRef sea un array
    if (!Array.isArray(updatedOrder.optionalActivitiesRef)) {
      updatedOrder.optionalActivitiesRef = [];
    }
    
    // Hacer una copia del estado actual para comparación
    const actividadesAntes = updatedOrder.optionalActivitiesRef ? 
      JSON.parse(JSON.stringify(updatedOrder.optionalActivitiesRef)) : [];
    
    console.log(`[${this.getViajeroIdentificacion()}] ANTES de actualizar:`, 
      actividadesAntes.filter((ref: OptionalActivityRef) => ref.travelersAssigned.includes(this.travelerId))
        .map((ref: OptionalActivityRef) => ref.id));
    
    // PASO 2: Eliminar al viajero de todas las actividades existentes
    updatedOrder.optionalActivitiesRef = (updatedOrder.optionalActivitiesRef || []).map((ref: OptionalActivityRef) => {
      return {
        ...ref,
        travelersAssigned: ref.travelersAssigned.filter((id: string) => id !== this.travelerId)
      };
    }).filter((ref: OptionalActivityRef) => ref.travelersAssigned.length > 0); // Eliminar referencias sin viajeros
    
    console.log(`[${this.getViajeroIdentificacion()}] Después de eliminar al viajero:`, 
      updatedOrder.optionalActivitiesRef.length);
    
    // PASO 3: Agregar al viajero a las actividades seleccionadas
    const actividadesSeleccionadas = this.activities
      .filter(activity => this.selectedActivities[activity.activityId] === true);
    
    console.log(`[${this.getViajeroIdentificacion()}] Actividades seleccionadas:`, 
      actividadesSeleccionadas.map(a => a.name || a.activityId));
    
    actividadesSeleccionadas.forEach(activity => {
      // Buscar si la actividad ya existe
      const existingIndex = updatedOrder.optionalActivitiesRef ? 
        updatedOrder.optionalActivitiesRef.findIndex(
          (ref: OptionalActivityRef) => ref.id === activity.activityId
        ) : -1;
      
      if (existingIndex >= 0 && updatedOrder.optionalActivitiesRef) {
        // Agregar este viajero a la actividad existente
        updatedOrder.optionalActivitiesRef[existingIndex].travelersAssigned.push(this.travelerId);
        console.log(`[${this.getViajeroIdentificacion()}] Agregado a actividad existente: ${activity.name || activity.activityId}`);
      } else {
        // Crear nueva referencia para esta actividad
        if (!updatedOrder.optionalActivitiesRef) {
          updatedOrder.optionalActivitiesRef = [];
        }
        
        updatedOrder.optionalActivitiesRef.push({
          id: activity.activityId,
          _id: activity.id,
          travelersAssigned: [this.travelerId],
          name: activity.name // Incluir el nombre para mejorar la visibilidad en logs y depuración
        });
        console.log(`[${this.getViajeroIdentificacion()}] Creada nueva referencia para: ${activity.name || activity.activityId}`);
      }
    });
    
    // PASO 4: Actualizar la orden en el servicio con una nueva referencia
    console.log(`[${this.getViajeroIdentificacion()}] DESPUÉS de actualizar:`, 
      updatedOrder.optionalActivitiesRef.filter((ref: OptionalActivityRef) => ref.travelersAssigned.includes(this.travelerId))
        .map((ref: OptionalActivityRef) => ref.id));
    
    // Log de resumen de cambios
    const actividadesAntesDeViajero = actividadesAntes.filter(
      (ref: OptionalActivityRef) => ref.travelersAssigned.includes(this.travelerId)
    );
    const actividadesDespuesDeViajero = updatedOrder.optionalActivitiesRef.filter(
      (ref: OptionalActivityRef) => ref.travelersAssigned.includes(this.travelerId)
    );
    
    console.log(`[${this.getViajeroIdentificacion()}] RESUMEN DE CAMBIOS: ` + 
      `Antes: ${actividadesAntesDeViajero.length} actividades, ` + 
      `Después: ${actividadesDespuesDeViajero.length} actividades`);
    
    // Asegurarse de que el summary existe
    if (!updatedOrder.summary) {
      updatedOrder.summary = [];
    }
    
    // Actualizar summary con las actividades seleccionadas
    this.updateSummaryItems(updatedOrder, actividadesSeleccionadas);
    
    // IMPORTANTE: Asegurarse de que estamos pasando un objeto completamente nuevo
    // para que el BehaviorSubject detecte el cambio
    this.summaryService.updateOrder(updatedOrder);
    
    // Verificar si los cambios se guardaron
    setTimeout(() => {
      const verificacionOrder = this.summaryService.getOrderValue();
      if (verificacionOrder && verificacionOrder.optionalActivitiesRef) {
        const actividadesVerificacion = verificacionOrder.optionalActivitiesRef.filter(
          ref => ref.travelersAssigned.includes(this.travelerId)
        );
        
        console.log(`[${this.getViajeroIdentificacion()}] VERIFICACIÓN final:`, 
          actividadesVerificacion.map(ref => ref.id));
      }
    }, 100);
  }

  // Método para asegurarse de que el summary se actualice con las actividades seleccionadas
  private updateSummaryItems(order: Order, selectedActivities: Activity[]): void {
    // Asegurarse de que el summary exista
    if (!order.summary) {
      order.summary = [];
    }
    
    // Eliminar entradas del summary relacionadas con actividades opcionales para este viajero
    order.summary = order.summary.filter(item => 
      !item.description.includes('actividad opcional') || 
      !item.description.includes(this.travelerId)
    );
    
    // Agregar nuevas entradas al summary para cada actividad seleccionada
    selectedActivities.forEach(activity => {
      if (activity.price) {
        // Garantizar que summary existe antes de usar push
        if (!order.summary) {
          order.summary = [];
        }
        
        order.summary.push({
          qty: 1,
          value: activity.price,
          description: `Actividad opcional: ${activity.name} - Viajero: ${this.getViajeroIdentificacion()}`
        });
      }
    });
    
    console.log(`[${this.getViajeroIdentificacion()}] Summary actualizado con ${selectedActivities.length} actividades`);
  }
}