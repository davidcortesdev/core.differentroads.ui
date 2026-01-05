import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Activity } from '../../models/tours/activity.model';
import { OptionalActivityRef } from '../../models/orders/order.model';
import { TextsService } from './texts.service';

@Injectable({
  providedIn: 'root',
})
export class ActivitiesService {
  private activitiesSource = new BehaviorSubject<Activity[]>([]);
  activities$ = this.activitiesSource.asObservable();

  private selectedActivitiesSource = new BehaviorSubject<OptionalActivityRef[]>(
    []
  );
  selectedActivities$ = this.selectedActivitiesSource.asObservable();

  constructor(private textsService: TextsService) {}

  // Mantiene la lógica anterior para actividades principales
  updateActivities(activities: Activity[]) {
    this.activitiesSource.next(activities);

    const activityTexts: { [key: string]: any } = {};
    activities.forEach((activity) => {
      const key = activity.externalID || activity.activityId;
      if (key) {
        activityTexts[key] = activity;
      }
    });

    this.textsService.updateTextsForCategory('activities', activityTexts);
  }

  getActivities(): Activity[] {
    return this.activitiesSource.getValue();
  }

  // Nueva lógica con nombre más claro: selectedActivities
  updateSelectedActivities(selectedActivities: OptionalActivityRef[]) {
    this.selectedActivitiesSource.next(selectedActivities);

    const selectedTexts: { [key: string]: any } = {};
    selectedActivities.forEach((opt) => {
      const key = opt.id || opt._id;
      if (key) {
        selectedTexts[key] = opt;
      }
    });

    this.textsService.updateTextsForCategory(
      'selectedActivities',
      selectedTexts
    );
  }

  getSelectedActivities(): OptionalActivityRef[] {
    return this.selectedActivitiesSource.getValue();
  }

  // Add method to get linked data between activities and optionalActivitiesRef
  getActivitiesWithTravelers(): OptionalActivityRef[] {
    return this.selectedActivitiesSource.getValue();
  }
}
