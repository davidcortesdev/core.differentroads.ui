import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Activity } from '../../models/tours/activity.model';
import { TextsService } from './texts.service';

@Injectable({
  providedIn: 'root',
})
export class ActivitiesService {
  private activitiesSource = new BehaviorSubject<Activity[]>([]);
  activities$ = this.activitiesSource.asObservable();

  constructor(private textsService: TextsService) {}

  updateActivities(activities: Activity[]) {
    this.activitiesSource.next(activities);

    // Store activities in TextsService
    const activityTexts: { [key: string]: any } = {};
    activities.forEach((activity) => {
      if (activity.externalID || activity.activityId) {
        const key = activity.externalID || activity.activityId;
        activityTexts[key] = activity;
      }
    });
    this.textsService.updateTextsForCategory('activities', activityTexts);
  }

  getActivities(): Activity[] {
    return this.activitiesSource.getValue();
  }
}
