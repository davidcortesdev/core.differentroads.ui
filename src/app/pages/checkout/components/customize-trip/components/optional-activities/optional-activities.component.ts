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
    private sanitizer: DomSanitizer // Inject DomSanitizer
  ) {
    this.activitiesService.activities$.subscribe((activities) => {
      this.addedActivities = new Set(
        activities.map((activity) => activity.activityId)
      );
      console.log('Added Activities:', this.addedActivities);
    });
  }

  ngOnInit(): void {
    this.loadActivities();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['periodID']) {
      this.loadActivities();
    }
  }

  loadActivities(): void {
    if (this.periodID) {
      this.periodsService
        .getActivities(this.periodID)
        .subscribe((activities) => {
          console.log('Activities Data: ', activities);

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
            .filter((activity) => activity.price > 0); // Filter out activities with price 0
          this.updateAddedActivities();
        });
    }
  }

  toggleActivity(activity: Activity): void {
    if (this.addedActivities.has(activity.activityId)) {
      this.addedActivities.delete(activity.activityId);
      console.log('Activity removed:', activity);
    } else {
      this.addedActivities.add(activity.activityId);
      console.log('Activity added:', activity);
    }
    this.updateAddedActivities();
  }

  updateAddedActivities(): void {
    console.log('Updating added activities:', this.addedActivities);

    const activities = this.optionalActivities.filter((activity) =>
      this.addedActivities.has(activity.activityId)
    );
    this.activitiesService.updateActivities(activities);
  }

  getAdultPrices(priceData: PriceData[]): PriceData[] {
    return priceData.filter((price) => price.age_group_name === 'Adultos');
  }

  isActivityAdded(activity: Activity): boolean {
    return this.addedActivities.has(activity.activityId);
  }
}
