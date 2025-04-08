import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { SummaryService } from '../../../../core/services/checkout/summary.service';
import { ActivitiesService } from '../../../../core/services/checkout/activities.service';
import { Activity } from '../../../../core/models/tours/activity.model';
import { TravelersService } from '../../../../core/services/checkout/travelers.service';
import {
  Order,
  OrderTraveler,
  OptionalActivityRef,
  SummaryItem,
} from '../../../../core/models/orders/order.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-traveler-activity-selector',
  standalone: false,
  templateUrl: './traveler-activity-selector.component.html',
  styleUrls: ['./traveler-activity-selector.component.scss'],
})
export class TravelerActivitySelectorComponent implements OnInit, OnDestroy {
  @Input() travelerId!: string;
  activities: Activity[] = [];
  selectedActivities: { [activityId: string]: boolean } = {};
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
    if (!this.travelerId) {
      console.error('No se proporcionó un ID de viajero válido');
      return;
    }

    this.loadTravelerData();
    this.loadActivities();

    const orderSub = this.summaryService.order$.subscribe((order) => {
      if (!order) return;
      if (!this.updatingFromOrder) {
        this.updatingFromOrder = true;
        try {
          if (order.optionalActivitiesRef) {
            // Sincronizar selecciones locales con el estado de la orden
            this.syncSelectionWithOrder(order);
          }
        } finally {
          setTimeout(() => {
            this.updatingFromOrder = false;
          }, 0);
        }
      }
    });
    this.subscriptions.push(orderSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  private getViajeroIdentificacion(): string {
    if (this.currentTraveler?.travelerData?.name) {
      return `${
        this.currentTraveler.travelerData.name
      } (ID: ${this.travelerId.substring(0, 6)}...)`;
    }
    return `Viajero ${this.travelerId.substring(0, 8)}...`;
  }

  private loadTravelerData(): void {
    const travelers = this.travelersService.getTravelers();
    this.currentTraveler = travelers.find((t) => t._id === this.travelerId);

    if (!this.currentTraveler) {
      console.error(`No se encontró un viajero con ID: ${this.travelerId}`);
    }
  }

  private loadActivities(): void {
    const activitiesSub = this.activitiesService.activities$.subscribe(
      (activities) => {
        if (this.initialized) return;
        this.activities = activities;
        this.initializeSelections();
        this.initialized = true;
      }
    );

    this.subscriptions.push(activitiesSub);
  }

  initializeSelections(): void {
    const currentOrder = this.summaryService.getOrderValue();

    if (!currentOrder || !currentOrder.optionalActivitiesRef) {
      this.activities.forEach((activity) => {
        this.selectedActivities[activity.activityId] = false;
      });
      return;
    }

    const existingActivities = new Set(
      currentOrder.optionalActivitiesRef
        .filter((ref) => ref.travelersAssigned.includes(this.travelerId))
        .map((ref) => ref.id)
    );

    this.activities.forEach((activity) => {
      this.selectedActivities[activity.activityId] = existingActivities.has(
        activity.activityId
      );
    });
  }

  private syncSelectionWithOrder(order: Order): void {
    if (!order.optionalActivitiesRef) return;

    const travelerActivities = new Set(
      order.optionalActivitiesRef
        .filter((ref) => ref.travelersAssigned.includes(this.travelerId))
        .map((ref) => ref.id)
    );

    let hasChanges = false;
    this.activities.forEach((activity) => {
      const shouldBeSelected = travelerActivities.has(activity.activityId);
      if (this.selectedActivities[activity.activityId] !== shouldBeSelected) {
        this.selectedActivities[activity.activityId] = shouldBeSelected;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      console.log(
        `[${this.getViajeroIdentificacion()}] Sincronizadas selecciones con la orden actual`
      );
    }
  }

  toggleActivity(activity: Activity): void {
    if (this.updatingFromOrder) return;
    this.updateOrderSummary();
  }

  updateOrderSummary(): void {
    const currentOrder = this.summaryService.getOrderValue();
    if (!currentOrder || !this.travelerId) {
      console.error(
        `[${this.getViajeroIdentificacion()}] No hay orden o ID de viajero para actualizar`
      );
      return;
    }

    const updatedOrder: Order = JSON.parse(JSON.stringify(currentOrder));

    if (!Array.isArray(updatedOrder.optionalActivitiesRef)) {
      updatedOrder.optionalActivitiesRef = [];
    }

    const actividadesAntes = updatedOrder.optionalActivitiesRef
      ? JSON.parse(JSON.stringify(updatedOrder.optionalActivitiesRef))
      : [];

    updatedOrder.optionalActivitiesRef = (
      updatedOrder.optionalActivitiesRef || []
    )
      .map((ref: OptionalActivityRef) => {
        return {
          ...ref,
          travelersAssigned: ref.travelersAssigned.filter(
            (id: string) => id !== this.travelerId
          ),
        };
      })
      .filter((ref: OptionalActivityRef) => ref.travelersAssigned.length > 0);

    const actividadesSeleccionadas = this.activities.filter(
      (activity) => this.selectedActivities[activity.activityId] === true
    );

    actividadesSeleccionadas.forEach((activity) => {
      const existingIndex = updatedOrder.optionalActivitiesRef
        ? updatedOrder.optionalActivitiesRef.findIndex(
            (ref: OptionalActivityRef) => ref.id === activity.activityId
          )
        : -1;

      if (existingIndex >= 0 && updatedOrder.optionalActivitiesRef) {
        updatedOrder.optionalActivitiesRef[
          existingIndex
        ].travelersAssigned.push(this.travelerId);
      } else {
        if (!updatedOrder.optionalActivitiesRef) {
          updatedOrder.optionalActivitiesRef = [];
        }

        updatedOrder.optionalActivitiesRef.push({
          id: activity.activityId,
          _id: activity.id,
          travelersAssigned: [this.travelerId],
          name: activity.name,
        });
      }
    });

    const actividadesAntesDeViajero = actividadesAntes.filter(
      (ref: OptionalActivityRef) =>
        ref.travelersAssigned.includes(this.travelerId)
    );
    const actividadesDespuesDeViajero =
      updatedOrder.optionalActivitiesRef.filter((ref: OptionalActivityRef) =>
        ref.travelersAssigned.includes(this.travelerId)
      );

    if (!updatedOrder.summary) {
      updatedOrder.summary = [];
    }

    this.updateSummaryItems(updatedOrder, actividadesSeleccionadas);

    // Reemplazamos la actualización vía summaryService por el activity service:
    this.activitiesService.updateSelectedActivities(
      updatedOrder.optionalActivitiesRef
    );
  }

  private updateSummaryItems(
    order: Order,
    selectedActivities: Activity[]
  ): void {
    if (!order.summary) {
      order.summary = [];
    }

    order.summary = order.summary.filter(
      (item) =>
        !item.description.includes('actividad opcional') ||
        !item.description.includes(this.travelerId)
    );

    selectedActivities.forEach((activity) => {
      if (activity.price) {
        if (!order.summary) {
          order.summary = [];
        }

        order.summary.push({
          qty: 1,
          value: activity.price,
          description: `Actividad opcional: ${
            activity.name
          } - Viajero: ${this.getViajeroIdentificacion()}`,
        });
      }
    });
  }
}
