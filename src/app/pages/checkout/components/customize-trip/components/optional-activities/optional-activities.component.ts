import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { PriceData } from '../../../../../../core/models/commons/price-data.model';
import { PeriodsService } from '../../../../../../core/services/periods.service';
import { Activity } from '../../../../../../core/models/tours/activity.model';
import { PricesService } from '../../../../../../core/services/checkout/prices.service';
import { ActivitiesService } from '../../../../../../core/services/checkout/activities.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MessageService } from 'primeng/api';
import { TravelersService } from '../../../../../../core/services/checkout/travelers.service';
import { OptionalActivityRef } from '../../../../../../core/models/orders/order.model';

@Component({
  selector: 'app-optional-activities',
  standalone: false,
  templateUrl: './optional-activities.component.html',
  styleUrl: './optional-activities.component.scss',
})
export class OptionalActivitiesComponent implements OnInit, OnChanges {
  @Input() periodID!: string;
  optionalActivities: Activity[] = [];
  addedActivities: Set<string> = new Set();

  constructor(
    private periodsService: PeriodsService,
    private pricesService: PricesService,
    private activitiesService: ActivitiesService, // Inject the service
    private sanitizer: DomSanitizer, // Inject DomSanitizer
    private messageService: MessageService,
    private travelersService: TravelersService // Add TravelersService
  ) {
    this.activitiesService.activities$.subscribe((activities) => {
      this.addedActivities = new Set(
        activities.map((activity) => activity.activityId)
      );
    });
  }

  ngOnInit(): void {
    console.log('Component initialized');
    this.loadActivities();
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('Changes detected:', changes);
    if (changes['periodID']) {
      this.loadActivities();
    }
  }

  loadActivities(): void {
    console.log('Loading activities for periodID:', this.periodID);
    if (this.periodID) {
      this.periodsService.getActivities(this.periodID).subscribe({
        next: (activities) => {
          console.log('Activities Data received:', activities);

          this.optionalActivities = activities
            .map((activity) => {
              const price = this.pricesService.getPriceById(
                activity.activityId,
                'Adultos'
              );
              return {
                ...activity,
                price,
                priceData: this.pricesService.getPriceDataById(
                  activity.activityId
                ),
                description: this.sanitizer.bypassSecurityTrustHtml(
                  activity?.description || ''
                ) as string,
              };
            })
            .filter((activity) => activity.price > 0);

          console.log('Filtered optional activities:', this.optionalActivities);
          this.updateAddedActivities();
        },
        error: (error) => {
          console.error('Error loading activities:', error);
        },
      });
    } else {
      console.warn('No periodID provided, skipping activity load');
    }
  }

  toggleActivity(activity: Activity): void {
    console.log('Toggle activity called for:', activity.name);
    if (this.addedActivities.has(activity.activityId)) {
      this.addedActivities.delete(activity.activityId);
    } else {
      this.addedActivities.add(activity.activityId);
      this.messageService.add({
        severity: 'info',
        summary: 'Actividad añadida',
        detail:
          'Las actividades se añaden para todos los pasajeros. Podrás personalizarlas por pasajero en el proceso de pago.',
        life: 5000,
      });
    }
    this.updateAddedActivities();
  }

  updateAddedActivities(): void {
    console.log(
      'Updating added activities, currently added:',
      Array.from(this.addedActivities)
    );

    const activities = this.optionalActivities.filter((activity) =>
      this.addedActivities.has(activity.activityId)
    );
    // Actualizamos actividades disponibles
    this.activitiesService.updateActivities(activities);
    // Nuevo: asignar todos los viajeros por defecto, filtrando aquellos cuyo ageGroup tenga precio para la actividad
    const travelers = this.travelersService.getTravelers();
    const selectedActivityRefs = activities.map((activity) => {
      const validTravelerIds = travelers
        .filter((traveler) => {
          const ageGroup = traveler.travelerData?.ageGroup;
          const price =
            this.pricesService.getPriceById(activity.activityId, ageGroup) || 0;
          return price > 0;
        })
        .map((traveler) => traveler._id!);
      return {
        id: activity.activityId,
        travelersAssigned: validTravelerIds,
      };
    });
    this.activitiesService.updateSelectedActivities(selectedActivityRefs);
  }

  getAdultPrices(priceData: PriceData[]): PriceData[] {
    return priceData.filter((price) => price.age_group_name === 'Adultos');
  }

  isActivityAdded(activity: Activity): boolean {
    return this.addedActivities.has(activity.activityId);
  }
}
