import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Activity } from '../../models/tours/activity.model';

@Injectable({
  providedIn: 'root',
})
export class ActivitiesService {
  private activitiesSource = new BehaviorSubject<Activity[]>([]);
  activities$ = this.activitiesSource.asObservable();

  updateActivities(activities: Activity[]) {
    this.activitiesSource.next(activities);
  }
}
