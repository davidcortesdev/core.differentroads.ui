import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';

interface BookingActivity {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  price: string;
  priceValue: number;
  isOptional: boolean;
  perPerson: boolean;
  isIncluded: boolean;
}

@Component({
  selector: 'app-booking-activities',
  templateUrl: './booking-activities.component.html',
  styleUrls: ['./booking-activities.component.scss'],
  standalone: false,
})
export class BookingActivitiesComponent implements OnInit {
  @Input() activities: BookingActivity[] = [];
  @Output() eliminateActivity = new EventEmitter<number>();
  @Output() addActivity = new EventEmitter<number>();

  constructor() {}

  ngOnInit(): void {
    console.log('BookingActivitiesComponent inicializado con activities:', this.activities);
  }

  onEliminateActivity(activityId: number): void {
    console.log('Eliminando actividad con ID:', activityId);
    this.eliminateActivity.emit(activityId);
  }

  onAddActivity(activityId: number): void {
    console.log('Añadiendo actividad con ID:', activityId);
    this.addActivity.emit(activityId);
  }
}