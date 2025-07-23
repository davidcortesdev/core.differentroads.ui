import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import {
  ActivityService,
  IActivityResponse,
} from '../../../../core/services/activity/activity.service';
import {
  ActivityPriceService,
  IActivityPriceResponse,
} from '../../../../core/services/activity/activity-price.service';
import {
  ActivityPackPriceService,
  IActivityPackPriceResponse,
} from '../../../../core/services/activity/activity-pack-price.service';
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';

// Interface para el formato de precio esperado (siguiendo el ejemplo)
interface PriceData {
  age_group_name: string;
  value: number;
  currency: string;
}

// Interface simplificada siguiendo el patrón del ejemplo
interface ActivityWithPrice extends IActivityResponse {
  priceData: PriceData[];
}

@Component({
  selector: 'app-activities-optionals',
  standalone: false,
  templateUrl: './activities-optionals.component.html',
  styleUrl: './activities-optionals.component.scss',
})
export class ActivitiesOptionalsComponent implements OnInit, OnChanges {
  @Input() itineraryId: number | null = null;
  @Input() departureId: number | null = null;

  // 🔥 NUEVO: Output para notificar cambios al componente padre
  @Output() activitiesSelectionChange = new EventEmitter<{
    selectedActivities: ActivityWithPrice[];
    totalPrice: number;
  }>();

  // Variables siguiendo el patrón del ejemplo
  optionalActivities: ActivityWithPrice[] = [];
  addedActivities: Set<number> = new Set();

  constructor(
    private activityService: ActivityService,
    private activityPriceService: ActivityPriceService,
    private activityPackPriceService: ActivityPackPriceService
  ) {}

  ngOnInit(): void {
    if (this.itineraryId && this.departureId) {
      this.loadActivities();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      (changes['itineraryId'] || changes['departureId']) &&
      this.itineraryId &&
      this.departureId
    ) {
      this.loadActivities();
    }
  }

  /**
   * Carga actividades siguiendo el patrón del ejemplo
   */
  private loadActivities(): void {
    if (!this.itineraryId || !this.departureId) return;

    this.activityService
      .getForItineraryWithPacks(
        this.itineraryId,
        this.departureId,
        undefined,
        true, // isVisibleOnWeb
        true // onlyOpt - solo actividades opcionales
      )
      .subscribe({
        next: (activities) => {
          // Procesar actividades y cargar precios
          this.optionalActivities = activities.map((activity) => ({
            ...activity,
            priceData: [], // Inicializar array vacío
          }));

          // Cargar precios para cada actividad
          this.loadPricesForActivities();
        },
        error: (error) => {
          console.error('Error loading activities:', error);
        },
      });
  }

  /**
   * Carga precios para todas las actividades
   */
  private loadPricesForActivities(): void {
    if (!this.departureId) return;

    this.optionalActivities.forEach((activity, index) => {
      this.loadPriceForActivity(activity, index);
    });
  }

  /**
   * Carga precio para una actividad específica
   */
  private loadPriceForActivity(
    activity: ActivityWithPrice,
    index: number
  ): void {
    if (!this.departureId) return;

    if (activity.type === 'act') {
      // Cargar precio de actividad individual
      this.activityPriceService
        .getAll({
          ActivityId: [activity.id],
          DepartureId: this.departureId,
        })
        .pipe(
          map((prices) => (prices.length > 0 ? prices : [])),
          catchError((error) => {
            console.error(
              `Error loading price for activity ${activity.id}:`,
              error
            );
            return of([]);
          })
        )
        .subscribe((prices) => {
          // Transformar precios al formato esperado (similar al ejemplo)
          this.optionalActivities[index].priceData = prices.map(
            (price: IActivityPriceResponse) => ({
              age_group_name: 'Adultos', // Simplificado para adultos
              value: price.campaignPrice || price.basePrice,
              currency: 'EUR', // Ajustar según tu moneda
            })
          );

          // 🔥 NUEVO: Emitir cambios después de cargar precios si la actividad está seleccionada
          if (this.addedActivities.has(activity.id)) {
            this.emitActivitiesChange();
          }
        });
    } else if (activity.type === 'pack') {
      // Cargar precio de pack
      this.activityPackPriceService
        .getAll({
          activityPackId: activity.id,
          departureId: this.departureId,
        })
        .pipe(
          map((prices) => (prices.length > 0 ? prices : [])),
          catchError((error) => {
            console.error(
              `Error loading price for pack ${activity.id}:`,
              error
            );
            return of([]);
          })
        )
        .subscribe((prices) => {
          // Transformar precios al formato esperado
          this.optionalActivities[index].priceData = prices.map(
            (price: IActivityPackPriceResponse) => ({
              age_group_name: 'Adultos',
              value: price.campaignPrice || price.basePrice,
              currency: 'EUR',
            })
          );

          // 🔥 NUEVO: Emitir cambios después de cargar precios si la actividad está seleccionada
          if (this.addedActivities.has(activity.id)) {
            this.emitActivitiesChange();
          }
        });
    }
  }

  /**
   * Obtiene precios de adultos (siguiendo el patrón del ejemplo)
   */
  getAdultPrices(priceData: PriceData[]): PriceData[] {
    if (!priceData) return [];
    return priceData.filter((price) => price.age_group_name === 'Adultos');
  }

  /**
   * Obtiene el precio base para mostrar
   */
  getBasePrice(item: ActivityWithPrice): number | null {
    const adultPrices = this.getAdultPrices(item.priceData);
    return adultPrices.length > 0 ? adultPrices[0].value : null;
  }

  /**
   * 🔥 MODIFICADO: Alterna la selección de actividad y emite cambios
   */
  toggleActivity(item: ActivityWithPrice): void {
    if (this.addedActivities.has(item.id)) {
      this.addedActivities.delete(item.id);
    } else {
      this.addedActivities.add(item.id);
    }

    // 🔥 NUEVO: Emitir cambios al componente padre
    this.emitActivitiesChange();
  }

  /**
   * Verifica si la actividad está añadida (siguiendo el patrón del ejemplo)
   */
  isActivityAdded(item: ActivityWithPrice): boolean {
    return this.addedActivities.has(item.id);
  }

  /**
   * 🔥 NUEVO: Emite los cambios de actividades seleccionadas al componente padre
   */
  private emitActivitiesChange(): void {
    const selectedActivities = this.optionalActivities.filter((activity) =>
      this.addedActivities.has(activity.id)
    );

    const totalPrice = selectedActivities.reduce((total, activity) => {
      const price = this.getBasePrice(activity);
      return total + (price || 0);
    }, 0);

    this.activitiesSelectionChange.emit({
      selectedActivities,
      totalPrice,
    });
  }

  /**
   * 🔥 NUEVO: Getter para obtener las actividades seleccionadas
   */
  get selectedActivities(): ActivityWithPrice[] {
    return this.optionalActivities.filter((activity) =>
      this.addedActivities.has(activity.id)
    );
  }

  /**
   * 🔥 NUEVO: Getter para obtener el precio total de actividades seleccionadas
   */
  get totalActivitiesPrice(): number {
    return this.selectedActivities.reduce((total, activity) => {
      const price = this.getBasePrice(activity);
      return total + (price || 0);
    }, 0);
  }
}
