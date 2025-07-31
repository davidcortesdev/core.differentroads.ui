import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
  Output,
  EventEmitter,
} from '@angular/core';
import {
  ActivityService,
  IActivityResponse,
} from '../../../../../../../core/services/activity/activity.service';
import {
  ActivityPriceService,
  IActivityPriceResponse,
} from '../../../../../../../core/services/activity/activity-price.service';
import {
  ActivityPackPriceService,
  IActivityPackPriceResponse,
} from '../../../../../../../core/services/activity/activity-pack-price.service';
import {
  AgeGroupService,
  IAgeGroupResponse,
} from '../../../../../../../core/services/agegroup/age-group.service';
import { catchError, map, of, forkJoin } from 'rxjs';
import { ActivityHighlight } from '../../../../../../../shared/components/activity-card/activity-card.component';
import { environment } from '../../../../../../../../environments/environment';

// Interface para el formato de precio siguiendo el ejemplo
interface PriceData {
  age_group_name: string;
  value: number;
  currency: string;
}

// Interface siguiendo el patrón del ejemplo
interface ActivityWithPrice extends IActivityResponse {
  priceData: PriceData[];
}

@Component({
  selector: 'app-activity',
  standalone: false,
  templateUrl: './activitys.component.html',
  styleUrl: './activitys.component.scss',
})
export class ActivitysComponent implements OnInit, OnChanges {
  @Input() itineraryId: number | undefined;
  @Input() itineraryDayId: number | undefined;
  @Input() departureId: number | undefined;

  // Output para emitir actividades seleccionadas
  @Output() activitySelected = new EventEmitter<ActivityHighlight>();

  loading = true;
  activities: ActivityWithPrice[] = [];
  error: string | null = null;

  // Datos para el carousel - transformados desde activities
  highlights: ActivityHighlight[] = [];
  
  // Cache de grupos de edad
  private ageGroupsCache: IAgeGroupResponse[] = [];

  constructor(
    private activityService: ActivityService,
    private activityPriceService: ActivityPriceService,
    private activityPackPriceService: ActivityPackPriceService,
    private ageGroupService: AgeGroupService
  ) {}

  ngOnInit(): void {
    this.loadAgeGroups();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const itineraryChanged =
      changes['itineraryId'] &&
      changes['itineraryId'].currentValue !==
        changes['itineraryId'].previousValue;
    const itineraryDayChanged =
      changes['itineraryDayId'] &&
      changes['itineraryDayId'].currentValue !==
        changes['itineraryDayId'].previousValue;
    const departureChanged =
      changes['departureId'] &&
      changes['departureId'].currentValue !==
        changes['departureId'].previousValue;

    if (itineraryChanged || itineraryDayChanged || departureChanged) {
      this.loadDataWithFilters();
    }
  }

  /**
   * Carga los grupos de edad desde el servicio
   */
  private loadAgeGroups(): void {
    this.ageGroupService.getAll().subscribe({
      next: (ageGroups) => {
        this.ageGroupsCache = ageGroups;
        this.loadDataWithFilters();
      },
      error: (error) => {
        console.error('Error loading age groups:', error);
        // Continuar sin grupos de edad, usar valores por defecto
        this.loadDataWithFilters();
      }
    });
  }

  private loadDataWithFilters(): void {
    if (!this.itineraryId) {
      this.loading = false;
      return;
    }

    this.loading = true;
    this.error = null;
    this.activities = [];
    this.highlights = [];

    this.activityService
      .getForItineraryWithPacks(
        this.itineraryId,
        this.departureId,
        this.itineraryDayId,
        true // isVisibleOnWeb = true
      )
      .pipe(
        catchError((err) => {
          console.error('Error al cargar actividades:', err);
          this.error =
            'Error al cargar las actividades. Por favor intente nuevamente.';
          return of([]);
        })
      )
      .subscribe((activities: IActivityResponse[]) => {
        // Transformar actividades siguiendo el patrón del ejemplo
        this.activities = activities.map((activity) => ({
          ...activity,
          priceData: [], // Inicializar array vacío
        }));

        // Cargar precios para cada actividad siguiendo el patrón del ejemplo
        this.loadPricesForActivities();
        this.loading = false;
      });
  }

  /**
   * Carga precios para todas las actividades siguiendo el patrón del ejemplo
   */
  private loadPricesForActivities(): void {
    if (!this.departureId) return;

    this.activities.forEach((activity, index) => {
      this.loadPriceForActivity(activity, index);
    });
  }

  /**
   * Carga precio para una actividad específica siguiendo el patrón del ejemplo
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
          // Transformar precios al formato esperado
          this.activities[index].priceData = prices.map(
            (price: IActivityPriceResponse) => ({
              age_group_name: this.getAgeGroupName(price.ageGroupId),
              value: price.campaignPrice || price.basePrice,
              currency: 'EUR',
            })
          );

          // Actualizar highlights después de cargar precios
          this.updateHighlights();
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
          this.activities[index].priceData = prices.map(
            (price: IActivityPackPriceResponse) => ({
              age_group_name: this.getAgeGroupName(price.ageGroupId),
              value: price.campaignPrice || price.basePrice,
              currency: 'EUR',
            })
          );

          // Actualizar highlights después de cargar precios
          this.updateHighlights();
        });
    }
  }

  /**
   * Actualiza los highlights desde las actividades con precios cargados
   */
  private updateHighlights(): void {
    this.highlights = this.activities.map(
      (activity: ActivityWithPrice) =>
        ({
          id: activity.id.toString(),
          title: activity.name || 'Sin título',
          description: activity.description || 'Sin descripción',
          image: activity.imageUrl || '',
          recommended: activity.isRecommended || false,
          optional: activity.isOptional || false,
          added: false,
          price: this.getBasePrice(activity) || 0,
          imageAlt: activity.imageAlt || activity.name || 'Sin título',
          type: activity.type as 'act' | 'pack',
        } as ActivityHighlight)
    );
  }

  /**
   * Obtiene el nombre del grupo de edad basado en el ID
   */
  private getAgeGroupName(ageGroupId: number): string {
    const ageGroup = this.ageGroupsCache.find(group => group.id === ageGroupId);
    return ageGroup ? ageGroup.name : 'Adultos'; // Por defecto
  }

  /**
   * Obtiene precios de adultos siguiendo el patrón del ejemplo
   */
  getAdultPrices(priceData: PriceData[]): PriceData[] {
    if (!priceData) return [];
    return priceData.filter((price) => price.age_group_name === 'Adultos');
  }

  /**
   * Obtiene el precio base para mostrar siguiendo el patrón del ejemplo
   */
  getBasePrice(item: ActivityWithPrice): number | null {
    const adultPrices = this.getAdultPrices(item.priceData);
    return adultPrices.length > 0 ? adultPrices[0].value : null;
  }

  onAddActivity(highlight: ActivityHighlight): void {
    const index = this.highlights.findIndex((h) => h.id === highlight.id);
    if (index !== -1) {
      this.highlights[index] = { ...highlight, added: !highlight.added };

      // Emitir evento al componente padre
      this.activitySelected.emit(this.highlights[index]);
    }
  }

  trackByActivityId(index: number, activity: IActivityResponse): number {
    return activity.id;
  }

  get hasValidData(): boolean {
    return !this.loading && this.itineraryId !== undefined;
  }

  get hasActivities(): boolean {
    return this.hasValidData && this.highlights.length > 0;
  }
}
