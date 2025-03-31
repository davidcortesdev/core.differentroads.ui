import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-activity-card',
  standalone: false,
  templateUrl: './activity-card.component.html',
  styleUrls: ['./activity-card.component.scss']
})
export class ActivityCardComponent implements OnInit, OnChanges {
  @Input() highlight: any;
  @Output() addActivity = new EventEmitter<any>();

  ngOnInit(): void {
    console.log('ActivityCardComponent - highlight data:', this.highlight);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['highlight']) {
      console.log('ActivityCardComponent - highlight changed:', this.highlight);
    }
  }

  onAddActivity(highlight: any): void {
    console.log('ActivityCardComponent - addActivity clicked:', highlight);
    this.addActivity.emit(highlight);
  }
}