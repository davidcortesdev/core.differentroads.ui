import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-booking-activities',
  templateUrl: './booking-activities.component.html',
  styleUrls: ['./booking-activities.component.scss'],
  standalone: false,
})
export class BookingActivitiesComponent implements OnInit {
  @Input() activities: any[] = [];
  @Output() eliminateActivity = new EventEmitter<number>();
  @Output() addActivity = new EventEmitter<number>();

  constructor() {}

  ngOnInit(): void {}

  onEliminateActivity(activityId: number): void {
    this.eliminateActivity.emit(activityId);
  }

  onAddActivity(activityId: number): void {
    this.addActivity.emit(activityId);
  }
}
